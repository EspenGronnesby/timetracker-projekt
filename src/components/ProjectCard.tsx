import { useState, useMemo } from "react";
import { Project, TimeEntry, DriveEntry, Material } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Car,
  Building2,
  Clock,
  Package,
  Calendar,
} from "lucide-react";
import { isWithinInterval, startOfDay, endOfDay, format } from "date-fns";
import { DriveDialog } from "./DriveDialog";
import { AddMaterialDialog } from "./AddMaterialDialog";
import { useNavigate } from "react-router-dom";

interface ProjectCardProps {
  project: Project;
  timeEntries: TimeEntry[];
  driveEntries: DriveEntry[];
  materials: Material[];
  isActive: boolean;
  isDriving: boolean;
  onToggle: () => void;
  onToggleDriving: (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => void;
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  userName: string;
  filterPeriod?: string;
  customRange?: { from: Date; to: Date };
  teamMemberCount?: number;
  userId?: string;
  showShimmer?: boolean;
}

export const ProjectCard = ({
  project,
  timeEntries,
  driveEntries,
  materials,
  isActive,
  isDriving,
  onToggle,
  onToggleDriving,
  onAddMaterial,
  onDelete,
  onToggleComplete,
  userName,
  filterPeriod,
  customRange,
  teamMemberCount = 1,
  userId,
  showShimmer = false,
}: ProjectCardProps) => {
  const navigate = useNavigate();
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);

  // Find active drive entry to get stored start_location
  const activeDriveEntry = useMemo(
    () => driveEntries.find((e) => e.user_id === userId && !e.end_time),
    [driveEntries, userId]
  );

  const handleDrivingSubmit = (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => {
    onToggleDriving(kilometers, startLocation, endLocation, routeData);
  };

  // Get filter label for display
  const getFilterLabel = () => {
    if (!filterPeriod) return null;
    if (filterPeriod === 'day') return 'I dag';
    if (filterPeriod === 'week') return 'Siste 7 dager';
    if (filterPeriod === 'month') return 'Siste 30 dager';
    if (filterPeriod === 'custom' && customRange) {
      return `${format(customRange.from, 'dd.MM')} - ${format(customRange.to, 'dd.MM')}`;
    }
    return null;
  };

  // Filter entries based on period with useMemo for performance
  const { filteredTime, filteredDrive, filteredMaterials } = useMemo(() => {
    if (!filterPeriod) {
      return { filteredTime: timeEntries, filteredDrive: driveEntries, filteredMaterials: materials };
    }

    const now = new Date();
    let filterFn: (date: Date) => boolean;

    if (filterPeriod === 'custom' && customRange) {
      const rangeStart = startOfDay(customRange.from);
      const rangeEnd = endOfDay(customRange.to);
      filterFn = (date: Date) => isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    } else if (filterPeriod === 'day') {
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);
      filterFn = (date: Date) => isWithinInterval(date, { start: dayStart, end: dayEnd });
    } else if (filterPeriod === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filterFn = (date: Date) => date >= weekStart;
    } else if (filterPeriod === 'month') {
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filterFn = (date: Date) => date >= monthStart;
    } else {
      return { filteredTime: timeEntries, filteredDrive: driveEntries, filteredMaterials: materials };
    }

    return {
      filteredTime: timeEntries.filter(e => filterFn(new Date(e.start_time))),
      filteredDrive: driveEntries.filter(e => filterFn(new Date(e.start_time))),
      filteredMaterials: materials.filter(e => filterFn(new Date(e.created_at)))
    };
  }, [timeEntries, driveEntries, materials, filterPeriod, customRange]);

  // Calculate totals
  const totalTime = filteredTime.reduce((acc, entry) => acc + entry.duration_seconds, 0);
  const totalKilometers = filteredDrive.reduce((acc, entry) => acc + (entry.kilometers || 0), 0);
  const totalMaterialCost = filteredMaterials.reduce((acc, material) => acc + material.total_price, 0);

  const hasActivity = totalTime > 0 || totalKilometers > 0 || totalMaterialCost > 0;
  const filterLabel = getFilterLabel();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card
      className="p-4 sm:p-5 relative overflow-hidden group cursor-pointer
        backdrop-blur-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        rounded-lg"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      {/* Colored accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: project.color }}
      />

      {/* Subtle hover tint */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none rounded-lg"
        style={{ backgroundColor: project.color }}
      />

<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-4 h-4 flex-shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg sm:text-xl truncate">{project.name}</h3>
              {project.completed && (
                <Badge className="bg-green-500 hover:bg-green-600 flex-shrink-0 text-xs">
                  Fullført
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-purple-500 dark:text-purple-400" />
                <span className="truncate">{project.customer_name}</span>
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                👥 {teamMemberCount}
              </span>
            </div>
          </div>
        </div>
        {filterLabel && (
          <Badge variant="secondary" className="flex items-center gap-1 self-start sm:self-auto flex-shrink-0">
            <Calendar className="h-3 w-3" />
            <span className="text-xs">{filterLabel}</span>
          </Badge>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Button
            variant={isActive ? "default" : "outline"}
            onClick={onToggle}
            className={`h-14 w-full transition-all active:scale-[0.97] ${
              isActive ? "bg-green-500 hover:bg-green-600" : "hover:bg-blue-500/10 hover:border-blue-500/50"
            }`}
          >
            {isActive ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="h-7 w-7 text-blue-500 dark:text-blue-400" />
            )}
          </Button>

          <DriveDialog
            isDriving={isDriving}
            onToggleDriving={handleDrivingSubmit}
            projectId={project.id}
            activeDriveStartLocation={activeDriveEntry?.start_location ?? null}
            onRequestMaterialDialog={() => setMaterialDialogOpen(true)}
          />

          <AddMaterialDialog
            onAddMaterial={onAddMaterial}
            open={materialDialogOpen}
            onOpenChange={setMaterialDialogOpen}
          />
        </div>

        {/* Stats — only show if there's activity */}
        {hasActivity && (
          <div className="space-y-1.5 p-2.5 bg-muted/50 rounded-lg text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <span>Tid:</span>
              </div>
              <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
            </div>
            {totalKilometers > 0 && (
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
                  <span>Kjørt:</span>
                </div>
                <span className="font-semibold text-foreground">{totalKilometers.toFixed(1)} km</span>
              </div>
            )}
            {totalMaterialCost > 0 && (
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="h-4 w-4 flex-shrink-0 text-orange-500 dark:text-orange-400" />
                  <span>Materialer:</span>
                </div>
                <span className="font-semibold text-foreground">{totalMaterialCost.toFixed(2)} kr</span>
              </div>
            )}
          </div>
        )}

        {/* No activity message only when filter is active */}
        {!hasActivity && filterPeriod && (
          <div className="text-center py-3 text-muted-foreground text-xs">
            Ingen aktivitet i denne perioden
          </div>
        )}
      </div>
    </Card>
  );
};
