import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/ProjectCard";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePresenceTracking } from "@/components/OnlineUsersIndicator";
import { useIsAdmin } from "@/hooks/useUserRole";
import { ActivityFilter, FilterPeriod } from "@/components/ActivityFilter";
import { startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { trackPresence } = usePresenceTracking();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("week");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();
  const {
    projects,
    timeEntries,
    driveEntries,
    addProject,
    toggleProject,
    toggleDriving,
    addMaterial,
    deleteProject,
  } = useProjects(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

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
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">
              {profile?.name}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your Projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2"
              >
                Admin
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logg ut</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <ActivityFilter onFilterChange={handleFilterChange} />
        </div>

        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold">{projects?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Now</p>
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Time</p>
              <p className="text-2xl font-bold">
                {Math.floor(totalTime / 3600)}h {Math.floor((totalTime % 3600) / 60)}m
              </p>
            </div>
          </div>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const projectTimeEntries = filteredTimeEntries.filter(
                (entry) => entry.project_id === project.id
              );
              const projectDriveEntries = driveEntries.filter(
                (entry) => entry.project_id === project.id
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
                  userName={profile!.name}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
