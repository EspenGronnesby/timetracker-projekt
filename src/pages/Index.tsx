import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { ProjectCard } from "@/components/ProjectCard";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { formatTime } from "@/lib/timeUtils";
import { Clock, Play, FolderOpen, LogOut } from "lucide-react";
import { OnlineUsersIndicator } from "@/components/OnlineUsersIndicator";
import { Button } from "@/components/ui/button";
import { usePresenceTracking } from "@/components/OnlineUsersIndicator";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { trackPresence } = usePresenceTracking();
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

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Laster...</p>
      </div>
    );
  }

  const myTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user.id && entry.end_time
  );
  const totalTime = myTimeEntries.reduce(
    (acc, entry) => acc + entry.duration_seconds,
    0
  );

  const activeTimeEntries = timeEntries.filter(
    (entry) => entry.user_id === user.id && !entry.end_time
  );
  const activeDriveEntries = driveEntries.filter(
    (entry) => entry.user_id === user.id && !entry.end_time
  );
  const activeCount = activeTimeEntries.length + activeDriveEntries.length;

  const handleToggleProject = (projectId: string) => {
    const isActive = activeTimeEntries.some(
      (entry) => entry.project_id === projectId
    );
    toggleProject(
      { projectId, userName: profile.name },
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
      { projectId, userName: profile.name, kilometers },
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
              {profile.name}
            </h1>
            {profile.organization_name && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {profile.organization_name}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2"
          >
            Admin
          </Button>
        </div>
      </header>

      <div className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-5xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Totalt prosjekter</p>
              <p className="text-xl sm:text-2xl font-bold">{projects.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Play className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Aktive nå</p>
              <p className="text-xl sm:text-2xl font-bold">{activeCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total tid</p>
              <p className="text-xl sm:text-2xl font-bold">{formatTime(totalTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
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
              const projectTimeEntries = timeEntries.filter(
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
                      userName: profile.name,
                      name,
                      quantity,
                      unitPrice,
                    })
                  }
                  onDelete={() => deleteProject(project.id)}
                  userName={profile.name}
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
