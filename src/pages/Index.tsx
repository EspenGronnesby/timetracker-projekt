import { Clock } from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { UserSelector } from "@/components/UserSelector";
import { useProjects } from "@/hooks/useProjects";
import { useActiveUser } from "@/hooks/useActiveUser";
import { formatDuration } from "@/lib/timeUtils";

const Index = () => {
  const { activeUser, setActiveUser, users } = useActiveUser();
  const { projects, addProject, toggleProject, deleteProject } = useProjects(activeUser.id, activeUser.name);

  // Calculate stats for the active user only
  const totalTime = projects.reduce((acc, p) => {
    const userEntries = p.entries.filter(e => e.userId === activeUser.id);
    const userTime = userEntries.reduce((sum, e) => sum + e.duration, 0);
    return acc + userTime;
  }, 0);
  
  const activeCount = projects.filter((p) => {
    const userState = p.activeUsers[activeUser.id];
    return userState?.isActive || false;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm sticky top-0 z-10 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-3 rounded-xl shadow-md">
                <Clock className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">TimeTracker</h1>
                <p className="text-sm text-muted-foreground">
                  Prosjekt tidsporing - {activeUser.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <UserSelector 
                users={users} 
                activeUser={activeUser} 
                onUserChange={setActiveUser} 
              />
              <AddProjectDialog onAdd={addProject} />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-secondary/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Totalt prosjekter</p>
              <p className="text-2xl font-bold text-foreground">{projects.length}</p>
            </div>
            <div className="bg-accent/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Aktive nå</p>
              <p className="text-2xl font-bold text-accent">{activeCount}</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total tid</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatDuration(totalTime)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Ingen prosjekter ennå
            </h2>
            <p className="text-muted-foreground mb-6">
              Kom i gang ved å opprette ditt første prosjekt
            </p>
            <AddProjectDialog onAdd={addProject} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                userId={activeUser.id}
                onToggle={toggleProject}
                onDelete={deleteProject}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
