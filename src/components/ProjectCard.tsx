import { Project, TimeEntry, DriveEntry } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Trash2,
  Car,
  Package,
  Clock,
  Building2,
} from "lucide-react";
import { formatTime } from "@/lib/timeUtils";
import { DriveDialog } from "./DriveDialog";
import { AddMaterialDialog } from "./AddMaterialDialog";
import { useNavigate } from "react-router-dom";

interface ProjectCardProps {
  project: Project;
  timeEntries: TimeEntry[];
  driveEntries: DriveEntry[];
  isActive: boolean;
  isDriving: boolean;
  onToggle: () => void;
  onToggleDriving: (kilometers?: number) => void;
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
  onDelete: () => void;
  userName: string;
}

export const ProjectCard = ({
  project,
  timeEntries,
  driveEntries,
  isActive,
  isDriving,
  onToggle,
  onToggleDriving,
  onAddMaterial,
  onDelete,
  userName,
}: ProjectCardProps) => {
  const navigate = useNavigate();

  const handleDrivingSubmit = (kilometers: number) => {
    onToggleDriving(kilometers);
  };

  const totalTime = timeEntries.reduce(
    (acc, entry) => acc + entry.duration_seconds,
    0
  );

  const totalKilometers = driveEntries.reduce(
    (acc, entry) => acc + (entry.kilometers || 0),
    0
  );

  return (
    <Card
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {project.customer_name}
            </p>
          </div>
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 mb-4">
          <Button
            variant={isActive ? "secondary" : "default"}
            size="sm"
            onClick={onToggle}
            className="flex-1"
          >
            {isActive ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stopp timer
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start timer
              </>
            )}
          </Button>

          <DriveDialog isDriving={isDriving} onToggleDriving={handleDrivingSubmit} />

          <AddMaterialDialog onAddMaterial={onAddMaterial} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total tid: {formatTime(totalTime)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Kjørt: {totalKilometers.toFixed(1)} km
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex justify-end">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
