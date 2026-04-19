import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/ProjectCard";
import { QuickStartProjectCard } from "@/components/QuickStartProjectCard";
import { LightDashboard } from "@/components/LightDashboard";
import { ActiveTimerBar } from "@/components/ActiveTimerBar";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { TimerNotificationSystem } from "@/components/TimerNotificationSystem";
import { WeatherWidget } from "@/components/WeatherWidget";
import { SalaryCard } from "@/components/SalaryCard";
import { FilterDrawer } from "@/components/FilterDrawer";
import { Search, FolderKanban, Zap, Clock } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
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
    timeEntryPauses,
    addProject,
    toggleProject,
    pauseTimer,
    resumeTimer,
    toggleDriving,
    addMaterial,
    deleteProject,
    toggleComplete,
    addManualTimeEntryAsync,
    deleteTimeEntryAsync,
    updateTimeEntry,
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
    (entry) => entry.user_id === user?.id && !entry.end_time && !entry.paused_at
  );
  const pausedTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time && entry.paused_at
  );
  const activeDriveEntries = driveEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );
  const activeCount = activeTimeEntries.length + pausedTimeEntries.length + activeDriveEntries.length;

  // Animerte tall for KPI-stripen
  const animatedProjectCount = useCountUp(projects?.length || 0);
  const animatedActiveCount = useCountUp(activeCount);
  const animatedTotalHours = useCountUp(totalTime / 3600);

  // Alle aktive/pausede entries for sorting
  const allRunningTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user?.id && !entry.end_time
  );

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

  // Forhåndsbygg lookup-maps så sort-funksjonene er O(n) i stedet for O(n × m)
  const projectTimeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of timeEntries) {
      m.set(e.project_id, (m.get(e.project_id) ?? 0) + e.duration_seconds);
    }
    return m;
  }, [timeEntries]);

  const activeProjectIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of allRunningTimeEntries) s.add(e.project_id);
    for (const e of activeDriveEntries) s.add(e.project_id);
    return s;
  }, [allRunningTimeEntries, activeDriveEntries]);

  // Smart sorting
  const sortedProjects = useMemo(() => {
    const list = [...searchFilteredProjects];
    switch (sortBy) {
      case "name":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case "time":
        return list.sort(
          (a, b) => (projectTimeMap.get(b.id) ?? 0) - (projectTimeMap.get(a.id) ?? 0)
        );
      case "active":
        return list.sort((a, b) => {
          const aActive = activeProjectIds.has(a.id);
          const bActive = activeProjectIds.has(b.id);
          return (bActive ? 1 : 0) - (aActive ? 1 : 0);
        });
      case "recent":
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      default:
        return list;
    }
  }, [searchFilteredProjects, sortBy, projectTimeMap, activeProjectIds]);

  const activeProjectCount = projects.filter(p => !p.completed).length;
  const completedProjectCount = projects.filter(p => p.completed).length;

  // Handlers — definert før early returns slik at de er tilgjengelige for alle moduser
  const handleFilterChange = (period: FilterPeriod, range?: { from: Date; to: Date }) => {
    setFilterPeriod(period);
    if (range) setCustomRange(range);
  };

  const handleToggleProject = (projectId: string) => {
    if (!profile) return;
    const isActive = activeTimeEntries.some((entry) => entry.project_id === projectId);
    const isPaused = pausedTimeEntries.some((entry) => entry.project_id === projectId);
    const isRunning = isActive || isPaused;
    toggleProject(
      { projectId, userName: profile.name },
      {
        onSuccess: () => {
          trackPresence(!isRunning, false);
          handleSuccess(
            isRunning ? "Timer stoppet" : "Timer startet",
            isRunning ? "Tiden din er registrert" : "Tidtakingen har startet"
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

  const handlePauseTimer = (projectId: string, pauseType?: "general" | "breakfast" | "lunch") => {
    const labels: Record<string, string> = { general: "Pause", breakfast: "Frokostpause", lunch: "Lunsjpause" };
    pauseTimer(
      { projectId, pauseType },
      {
        onSuccess: () => {
          handleSuccess(labels[pauseType || "general"] + " startet", "Trykk for å gjenoppta");
        },
        onError: (error: Error) => {
          handleError(error, { title: "Kunne ikke pause timer" });
        },
      }
    );
  };

  const handleResumeTimer = (projectId: string) => {
    resumeTimer(
      { projectId },
      {
        onSuccess: () => {
          trackPresence(true, false);
          handleSuccess("Timer gjenopptatt", "Tidtakingen fortsetter");
        },
        onError: (error: Error) => {
          handleError(error, { title: "Kunne ikke gjenoppta timer" });
        },
      }
    );
  };

  const handleToggleDriving = (projectId: string, kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => {
    if (!profile) return;
    const isDriving = activeDriveEntries.some((entry) => entry.project_id === projectId);
    toggleDriving(
      { projectId, userName: profile.name, kilometers, startLocation, endLocation, routeData },
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

  // Early return AFTER all hooks and handlers
  if (loading || !user) {
    return (
      <div className="py-4 sm:py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-4">
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
        <ProjectCardSkeleton />
      </div>
    );
  }

  // Light-modus: Forenklet tidtaker-visning
  if (profile?.app_mode === "light") {
    return (
      <LightDashboard
        projects={projects}
        timeEntries={timeEntries}
        timeEntryPauses={timeEntryPauses}
        userId={user.id}
        userName={profile.name}
        onToggleProject={handleToggleProject}
        onPauseTimer={handlePauseTimer}
        onResumeTimer={handleResumeTimer}
        onAddManualEntry={addManualTimeEntryAsync}
        normalHoursPerDay={profile?.normal_hours_per_day ?? 7.5}
        defaultStartTime={profile?.default_start_time}
        defaultEndTime={profile?.default_end_time}
        defaultBreakfastTime={profile?.default_breakfast_time}
        defaultLunchTime={profile?.default_lunch_time}
        defaultBreakfastMin={profile?.default_breakfast_min}
        defaultLunchMin={profile?.default_lunch_min}
      />
    );
  }

  const renderProjectItem = (project: typeof projects[0]) => {
    const projectTimeEntries = filteredTimeEntries.filter((entry) => entry.project_id === project.id);
    const projectDriveEntries = driveEntries.filter((entry) => entry.project_id === project.id);
    const projectMaterials = materials.filter((material) => material.project_id === project.id);
    const isActive = activeTimeEntries.some((entry) => entry.project_id === project.id);
    const isPaused = pausedTimeEntries.some((entry) => entry.project_id === project.id);
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
          isPaused={isPaused}
          isDriving={isDriving}
          onToggle={() => handleToggleProject(project.id)}
          onPause={() => handlePauseTimer(project.id)}
          onResume={() => handleResumeTimer(project.id)}
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
        isPaused={isPaused}
        isDriving={isDriving}
        onToggle={() => handleToggleProject(project.id)}
        onPause={() => handlePauseTimer(project.id)}
        onResume={() => handleResumeTimer(project.id)}
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

        {/* Min lønn — tydelig splittet mellom uke og måned */}
        {user?.id && <SalaryCard timeEntries={timeEntries} userId={user.id} />}

        {/* Sticky aktiv timer bar */}
        {(() => {
          const runningEntry = timeEntries.find(
            (e) => e.user_id === user?.id && !e.end_time
          );
          if (!runningEntry) return null;
          const project = projects.find((p) => p.id === runningEntry.project_id);
          if (!project) return null;
          return (
            <ActiveTimerBar
              projectName={project.name}
              projectColor={project.color}
              startTime={runningEntry.start_time}
              isPaused={!!runningEntry.paused_at}
              onPause={() => handlePauseTimer(runningEntry.project_id)}
              onResume={() => handleResumeTimer(runningEntry.project_id)}
              onStop={() => handleToggleProject(runningEntry.project_id)}
            />
          );
        })()}

        {/* Stats — KPI Strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-center gap-2.5 transition-all duration-200 hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
            <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
              <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Prosjekter</p>
              <p className="text-lg font-bold tabular-nums leading-tight">{Math.round(animatedProjectCount)}</p>
            </div>
          </div>
          <div className={`rounded-xl border p-3 flex items-center gap-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
            activeCount > 0
              ? "border-green-500/20 bg-green-500/5 hover:border-green-500/30"
              : "border-border/40 bg-muted/20 hover:border-border/60"
          }`}>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              activeCount > 0 ? "bg-green-500/15" : "bg-muted"
            }`}>
              <Zap className={`h-4 w-4 ${activeCount > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Aktive nå</p>
              <p className={`text-lg font-bold tabular-nums leading-tight ${activeCount > 0 ? "text-green-700 dark:text-green-300" : ""}`}>
                {Math.round(animatedActiveCount)}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 flex items-center gap-2.5 transition-all duration-200 hover:shadow-md hover:border-purple-500/30 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
            <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total tid</p>
              <p className="text-lg font-bold tabular-nums leading-tight">
                {Math.floor(animatedTotalHours)}:{Math.floor((animatedTotalHours % 1) * 60).toString().padStart(2, "0")}
              </p>
            </div>
          </div>
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
