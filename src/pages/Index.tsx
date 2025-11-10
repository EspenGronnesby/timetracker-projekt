import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/ProjectCard";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { NotificationBell } from "@/components/NotificationBell";
import { StreakIndicator } from "@/components/StreakIndicator";
import { TimerNotificationSystem } from "@/components/TimerNotificationSystem";
import { WeatherWidget } from "@/components/WeatherWidget";
import { LogOut, Settings as SettingsIcon, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePresenceTracking } from "@/components/OnlineUsersIndicator";
import { useIsAdmin } from "@/hooks/useUserRole";
import { ActivityFilter, FilterPeriod } from "@/components/ActivityFilter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { handleError, handleSuccess } from "@/lib/errorHandler";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { trackPresence } = usePresenceTracking();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("week");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();
  const [showShimmer, setShowShimmer] = useState(false);
  const [projectStatus, setProjectStatus] = useState<"active" | "completed" | "all">("active");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowShimmer(true);
      // Stop shimmer after animation completes (3s animation)
      setTimeout(() => setShowShimmer(false), 3000);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch project member counts
  const { data: projectMembers } = useQuery({
    queryKey: ["project-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_members")
        .select("project_id, user_id");
      if (error) throw error;
      return data;
    },
  });
  const {
    projects,
    timeEntries,
    driveEntries,
    materials,
    addProject,
    toggleProject,
    toggleDriving,
    addMaterial,
    deleteProject,
    toggleComplete,
  } = useProjects(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Calculate filtered time entries before early return
  const getFilterDate = () => {
    if (filterPeriod === "custom" && customRange) {
      return customRange.from;
    }
    const now = new Date();
    switch (filterPeriod) {
      case "day":
        return startOfDay(now);
      case "week":
        return startOfWeek(now);
      case "month":
        return startOfMonth(now);
      default:
        return startOfWeek(now);
    }
  };

  const filterTimeEntries = (entries: typeof timeEntries) => {
    if (filterPeriod === "custom" && customRange) {
      return entries.filter(entry => 
        isWithinInterval(new Date(entry.start_time), {
          start: customRange.from,
          end: customRange.to
        })
      );
    }
    
    const filterDate = getFilterDate();
    return entries.filter(entry => new Date(entry.start_time) >= filterDate);
  };

  const filteredTimeEntries = filterTimeEntries(timeEntries);

  const myTimeEntries = filteredTimeEntries.filter(
    (entry) => entry.user_id === user?.id && entry.end_time
  );
  const totalTime = myTimeEntries.reduce(
    (acc, entry) => acc + entry.duration_seconds,
    0
  );

  const activeTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );
  const activeDriveEntries = driveEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );
  const activeCount = activeTimeEntries.length + activeDriveEntries.length;

  // Filter and sort projects by status and name
  const filteredProjects = useMemo(() => {
    if (projectStatus === "active") return projects.filter(p => !p.completed);
    if (projectStatus === "completed") return projects.filter(p => p.completed);
    return projects;
  }, [projects, projectStatus]);

  const sortedProjects = [...filteredProjects].sort((a, b) => a.name.localeCompare(b.name));
  
  const activeProjectCount = projects.filter(p => !p.completed).length;
  const completedProjectCount = projects.filter(p => p.completed).length;

  // Early return AFTER all hooks
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      </div>
    );
  }

  const handleFilterChange = (period: FilterPeriod, range?: { from: Date; to: Date }) => {
    setFilterPeriod(period);
    if (range) {
      setCustomRange(range);
    }
  };

  const handleToggleProject = (projectId: string) => {
    const isActive = activeTimeEntries.some(
      (entry) => entry.project_id === projectId
    );
    toggleProject(
      { projectId, userName: profile!.name },
      {
        onSuccess: () => {
          trackPresence(!isActive, false);
          handleSuccess(
            isActive ? "Timer stoppet" : "Timer startet",
            isActive ? "Tiden din er registrert" : "Tidtakingen har startet"
          );
        },
        onError: (error: Error) => {
          handleError(error, {
            title: "Kunne ikke oppdatere timer",
            action: {
              label: "Prøv igjen",
              onClick: () => handleToggleProject(projectId),
            },
          });
        },
      }
    );
  };

  const handleToggleDriving = (projectId: string, kilometers?: number) => {
    const isDriving = activeDriveEntries.some(
      (entry) => entry.project_id === projectId
    );
    toggleDriving(
      { projectId, userName: profile!.name, kilometers },
      {
        onSuccess: () => {
          trackPresence(false, !isDriving);
          handleSuccess(
            isDriving ? "Kjøring stoppet" : "Kjøring startet",
            isDriving && kilometers ? `${kilometers} km registrert` : undefined
          );
        },
        onError: (error: Error) => {
          handleError(error, {
            title: "Kunne ikke oppdatere kjøring",
            action: {
              label: "Prøv igjen",
              onClick: () => handleToggleDriving(projectId, kilometers),
            },
          });
        },
      }
    );
  };

  const handleStopTimer = (projectId: string) => {
    if (profile?.name) {
      toggleProject({ projectId, userName: profile.name });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-card via-primary/5 to-card border-b border-border py-2 sm:py-3 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-0">
          <h1 className="text-2xl sm:text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {profile?.name}
          </h1>
          <div className="flex items-center gap-2 sm:gap-2 flex-shrink-0">
            <StreakIndicator />
            <NotificationBell />
            <ThemeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/goals")}
              className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/10 transition-all"
            >
              <ListTodo className="h-5 w-5" />
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 hover:border-accent-tertiary/50 hover:bg-accent-tertiary/10 transition-all"
              >
                <svg className="h-5 w-5 text-accent-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2 hover:border-accent/50 hover:bg-accent/10 transition-all"
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={signOut}
              className="flex items-center gap-2 hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden sm:inline">Logg ut</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="py-0 sm:py-8">
        <div>
          <OfflineIndicator />
        </div>
        
        <WeatherWidget />
        
        <div className="px-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={projectStatus === "active" ? "default" : "outline"}
              onClick={() => setProjectStatus("active")}
              size="sm"
            >
              Aktive prosjekter ({activeProjectCount})
            </Button>
            <Button 
              variant={projectStatus === "completed" ? "default" : "outline"}
              onClick={() => setProjectStatus("completed")}
              size="sm"
            >
              Fullførte prosjekter ({completedProjectCount})
            </Button>
            <Button 
              variant={projectStatus === "all" ? "default" : "outline"}
              onClick={() => setProjectStatus("all")}
              size="sm"
            >
              Alle prosjekter ({projects.length})
            </Button>
          </div>
          <ActivityFilter onFilterChange={handleFilterChange} />
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Ingen prosjekter ennå</h2>
            <p className="text-muted-foreground mb-6">
              Kom i gang ved å opprette ditt første prosjekt
            </p>
            <AddProjectDialog
              onAddProject={(name, color, customerInfo) =>
                addProject({ name, color, customerInfo })
              }
            />
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Ingen prosjekter funnet</h2>
            <p className="text-muted-foreground mb-6">
              Opprett et nytt prosjekt for å komme i gang
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in px-0">
            {sortedProjects.map((project) => {
              const projectTimeEntries = filteredTimeEntries.filter(
                (entry) => entry.project_id === project.id
              );
              const projectDriveEntries = driveEntries.filter(
                (entry) => entry.project_id === project.id
              );
              const projectMaterials = materials.filter(
                (material) => material.project_id === project.id
              );
              const isActive = activeTimeEntries.some(
                (entry) => entry.project_id === project.id
              );
              const isDriving = activeDriveEntries.some(
                (entry) => entry.project_id === project.id
              );

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  timeEntries={projectTimeEntries}
                  driveEntries={projectDriveEntries}
                  materials={projectMaterials}
                  isActive={isActive}
                  isDriving={isDriving}
                  onToggle={() => handleToggleProject(project.id)}
                  onToggleDriving={(km) => handleToggleDriving(project.id, km)}
                  onAddMaterial={(name, quantity, unitPrice) =>
                    addMaterial({
                      projectId: project.id,
                      userName: profile!.name,
                      name,
                      quantity,
                      unitPrice,
                    })
                  }
                  onDelete={() => deleteProject(project.id)}
                  onToggleComplete={() => toggleComplete(project.id)}
                  userName={profile!.name}
                  filterPeriod={filterPeriod}
                  customRange={customRange}
                  teamMemberCount={projectMembers?.filter(m => m.project_id === project.id).length || 1}
                  userId={user?.id}
                  showShimmer={showShimmer}
                />
              );
            })}
          </div>
        )}

        <div className="mt-8 px-0 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>
            <div className="relative">
              <AddProjectDialog
                onAddProject={(name, color, customerInfo) =>
                  addProject({ name, color, customerInfo })
                }
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 px-0">
          <Card className="p-5 sm:p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[var(--gradient-primary)] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative flex items-center gap-4 sm:gap-4">
              <div className="p-3 sm:p-3 bg-primary/20 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 sm:w-8 sm:h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm sm:text-sm text-muted-foreground font-medium">Total Projects</p>
                <p className="text-4xl sm:text-4xl font-bold text-primary">{projects?.length || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[var(--gradient-accent)] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative flex items-center gap-4 sm:gap-4">
              <div className="p-3 sm:p-3 bg-accent/20 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                <div className={`w-6 h-6 rounded-full ${activeCount > 0 ? 'bg-accent shadow-lg shadow-accent/50 animate-pulse' : 'bg-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-sm sm:text-sm text-muted-foreground font-medium">Active Now</p>
                <p className="text-4xl sm:text-4xl font-bold text-accent">{activeCount}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-[var(--gradient-ocean)] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative flex items-center gap-4 sm:gap-4">
              <div className="p-3 sm:p-3 bg-accent-quaternary/20 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 sm:w-8 sm:h-8 text-accent-quaternary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm sm:text-sm text-muted-foreground font-medium">Total Time</p>
                <p className="text-4xl sm:text-4xl font-bold text-accent-quaternary">
                  {Math.floor(totalTime / 3600)}h {Math.floor((totalTime % 3600) / 60)}m
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Background timer notification system */}
        <TimerNotificationSystem onStopTimer={handleStopTimer} />
      </main>
    </div>
  );
};

export default Index;
