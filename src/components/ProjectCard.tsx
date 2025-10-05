import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Trash2, Clock } from "lucide-react";
import { Project } from "@/types/project";
import { formatDuration } from "@/lib/timeUtils";

interface ProjectCardProps {
  project: Project;
  userId: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard = ({ project, userId, onToggle, onDelete }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(project.totalTime);
  
  const userState = project.activeUsers[userId] || { isActive: false, isDriving: false };
  const currentEntry = project.currentEntries[userId];

  useEffect(() => {
    if (!userState.isActive) {
      setCurrentTime(project.totalTime);
      return;
    }

    const interval = setInterval(() => {
      if (currentEntry?.startTime) {
        const elapsed = Math.floor((Date.now() - currentEntry.startTime.getTime()) / 1000);
        setCurrentTime(project.totalTime + elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userState.isActive, project.totalTime, currentEntry]);

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all duration-300 border-border bg-card cursor-pointer"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-4 h-4 rounded-full transition-all duration-300"
            style={{ 
              backgroundColor: userState.isActive ? 'hsl(var(--accent))' : project.color,
              boxShadow: userState.isActive ? '0 0 12px hsl(var(--accent))' : 'none'
            }}
          />
          <div>
            <h3 className="font-semibold text-lg text-foreground">{project.name}</h3>
            <p className="text-sm text-muted-foreground">{project.customerInfo.name}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project.id);
          }}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-2xl font-mono font-semibold text-foreground">
            {formatDuration(currentTime)}
          </span>
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(project.id);
          }}
          className={`transition-all duration-300 ${
            userState.isActive
              ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
          size="lg"
        >
          {userState.isActive ? (
            <>
              <Pause className="mr-2 h-5 w-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start
            </>
          )}
        </Button>
      </div>

      {project.entries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            {project.entries.length} {project.entries.length === 1 ? 'økt' : 'økter'} totalt
          </p>
        </div>
      )}
    </Card>
  );
};
