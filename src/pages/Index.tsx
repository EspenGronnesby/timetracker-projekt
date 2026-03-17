import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/ProjectCard";
import { QuickStartProjectCard } from "@/components/QuickStartProjectCard";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { TimerNotificationSystem } from "@/components/TimerNotificationSystem";
import { WeatherWidget } from "@/components/WeatherWidget";
import { FilterDrawer } from "@/components/FilterDrawer";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePresenceTracking } from "@/components/OnlineUsersIndicator";
import { FilterPeriod } from "@/components/ActivityFilter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, startOfWeek, startOfMonth, isWithinInterval } from "date-fns";
import { handleError, handleSuccess } from "@/lib/errorHandler";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { trackPresence } = usePresenceTracking();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("week");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();
  const [showShimmer, setShowShimmer] = useState(false);
  const [projectStatus, setProjectStatus] = useState<"active" | "completed" | "all">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "time" | "active" | "recent">(() => (localStorage.getItem("tt-sortBy") as "name" | "time" | "active" | "recent") || "name");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() =>
    (localStorage.getItem("tt-viewMode") as "grid" | "list") || "grid"
  );

  // Persist preferences
  useEffect(() => { localStorage.setItem("tt-sortBy", sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem("tt-viewMode", viewMode); }, [viewMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowShimmer(true);
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

  // Calculate filtered time entries
  const getFilterDate = () => {
    if (filterPeriod === "custom" && customRange) return customRange.from;
    const now = new Date();
    switch (filterPeriod) {
      case "day": return startOfDay(now);
      case "week": return startOfWeek(now);
      case "month": return startOfMonth(now);
      default: return startOfWeek(now);
    }
  };

  const filterTimeEntries = (entries: typeof timeEntries) => {
    if (filterPeriod === "custom" && customRange) {
      return entries.filter(entry =>
        isWithinInterval(new Date(entry.start_time), { start: customRange.from, end: customRange.to })
      );
    }
    const filterDate = getFilterDate();
    return entries.filter(entry => new Date(entry.start_time) >= filterDate);
  };

  const filteredTimeEntries = filterTimeEntries(timeEntries);

  const myTimeEntries = filteredTimeEntries.filter(
    (entry) => entry.user_id === user?.id && entry.end_time
  );
  const totalTime = myTimeEntries.reduce((acc, entry) => acc + entry.duration_seconds, 0);

  const activeTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );
  const activeDriveEntries = driveEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );
  const activeCount = activeTimeEntries.length + activeDriveEntries.length;

  // Filter projects by status
  const statusFilteredProjects = useMemo(() => {
    if (projectStatus === "active") return projects.filter(p => !p.completed);
    if (projectStatus === "completed") return projects.filter(p => p.completed);
    return projects;
  }, [projects, projectStatus]);

  // Search filter
  const searchFilteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return statusFilteredProjects;
    const q = searchQuery.toLowerCase();
    return statusFilteredProjects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.customer_name ?? "").toLowerCase().includes(q)
    );
  }, [statusFilteredProjects, searchQuery]);

  // Smart sorting
  const sortedProjects = useMemo(() => {
    const list = [...searchFilteredProjects];
    switch (sortBy) {
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "time":
        return list.sort((a, b) => {
          const timeA = timeEntries.filter(e => e.project_id === a.id).reduce((s, e) => s + e.duration_seconds, 0);
          const timeB = timeEntries.filter(e => e.project_id === b.id).reduce((s, e) => s + e.duration_seconds, 0);
          return timeB - timeA;
        });
      case "active":
        return list.sort((a, b) => {
          const aActive = activeTimeEntries.some(e => e.project_id === a.id) || activeDriveEntries.some(e => e.project_id === a.id);
          const bActive = activeTimeEntries.some(e => e.project_id === b.id) || activeDriveEntries.some(e => e.project_id === b.id);
          return (bActive ? 1 : 0) - (aActive ? 1 : 0);
        });
      case "recent":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default:
        return list;
    }
  }, [searchFilteredProjects, sortBy, timeEntries, activeTimeEntries, activeDriveEntries]);

  const activeProjectCount = projects.filter(p => !p.completed).length;
  const completedProjectCount = projects.filter(p => p.completed).length;

  // Early return AFTER all hooks
  if (loading || !user) {
    return (
      <div className="py-4 sm:py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-4">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    );
  }

  const handleFilterChange = (period: FilterPeriod, range?: { from: Date; to: Date }) => {
    setFilterPeriod(period);
    if (range) setCustomRange(range);
  };

  const handleToggleProject = (projectId: string) => {
    const isActive = activeTimeEntries.some((entry) => entry.project_id === projectId);
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
            action: { label: "Prøv igjen", onClick: () => handleToggleProject(projectId) },
          });
        },
      }
    );
  };

  const handleToggleDriving = (projectId: string, kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => {
    const isDriving = activeDriveEntries.some((entry) => entry.project_id === projectId);
    toggleDriving(
      { projectId, userName: profile!.name, kilometers, startLocation, endLocation, routeData },
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
            action: { label: "Prøv igjen", onClick: () => handleToggleDriving(projectId, kilometers) },
          });
        },
      }
    );
  };

  const handleStopTimer = (projectId: string) => {
    if (profile?.name) toggleProject({ projectId, userName: profile.name });
  };

  const renderProjectItem = (project: typeof projects[0]) => {
    const projectTimeEntries = filteredTimeEntries.filter((entry) => entry.project_id === project.id);
    const projectDriveEntries = driveEntries.filter((entry) => entry.project_id === project.id);
    const projectMaterials = materials.filter((material) => material.project_id === project.id);
    const isActive = activeTimeEntries.some((entry) => entry.project_id === project.id);
    const isDriving = activeDriveEntries.some((entry) => entry.project_id === project.id);

    if (viewMode === "list") {
      return (
        <QuickStartProjectCard
          key={project.id}
          projectId={project.id}
          projectName={project.name}
          projectColor={project.color}
          customerInfo={project.customer_name}
          teamMemberCount={projectMembers?.filter(m => m.project_id === project.id).length || 1}
          isActive={isActive}
          isDriving={isDriving}
          onToggle={() => handleToggleProject(project.id)}
          onToggleDriving={(km, startLoc, endLoc, routeData) => handleToggleDriving(project.id, km, startLoc, endLoc, routeData)}
          onAddMaterial={(name, quantity, unitPrice) =>
            addMaterial({ projectId: project.id, userName: profile!.name, name, quantity, unitPrice })
          }
          driveEntries={projectDriveEntries}
          userId={user?.id}
        />
      );
    }

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
        onToggleDriving={(km, startLoc, endLoc, routeData) => handleToggleDriving(project.id, km, startLoc, endLoc, routeData)}
        onAddMaterial={(name, quantity, unitPrice) =>
          addMaterial({ projectId: project.id, userName: profile!.name, name, quantity, unitPrice })
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
  };

  return (
    <div className="py-4 sm:py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-4">
        <WeatherWidget />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Prosjekter</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{projects?.length || 0}</p>
          </Card>
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Aktive nå</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{activeCount}</p>
          </Card>
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total tid</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {Math.floor(totalTime / 3600)}h {Math.floor((totalTime % 3600) / 60)}m
            </p>
          </Card>
        </div>

        {/* Søk + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter prosjekter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <FilterDrawer
            projectStatus={projectStatus}
            onStatusChange={setProjectStatus}
            activeCount={activeProjectCount}
            completedCount={completedProjectCount}
            totalCount={projects.length}
            filterPeriod={filterPeriod}
            onFilterChange={handleFilterChange}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Ingen prosjekter ennå</h2>
            <p className="text-muted-foreground mb-6">
              Kom i gang ved å opprette ditt første prosjekt
            </p>
            <AddProjectDialog
              onAddProject={(name, color, customerInfo) => addProject({ name, color, customerInfo })}
            />
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Ingen treff</h2>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? `Fant ingen prosjekter for "${searchQuery}"` : "Opprett et nytt prosjekt for å komme i gang"}
            </p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-2 animate-fade-in mt-3">
            {sortedProjects.map(renderProjectItem)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children mt-4">
            {sortedProjects.map(renderProjectItem)}
          </div>
        )}

        <div className="flex justify-center pt-4">
          <AddProjectDialog
            onAddProject={(name, color, customerInfo) => addProject({ name, color, customerInfo })}
          />
        </div>

        <TimerNotificationSystem onStopTimer={handleStopTimer} />
    </div>
  );
};

export default Index;
