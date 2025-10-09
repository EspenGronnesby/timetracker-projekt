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
  onToggleDriving: (kilometers?: number) => void;
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

  const handleDrivingSubmit = (kilometers: number) => {
    onToggleDriving(kilometers);
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
      return { 
        filteredTime: timeEntries, 
        filteredDrive: driveEntries, 
        filteredMaterials: materials 
      };
    }
    
    const now = new Date();
    let filterFn: (date: Date) => boolean;
    
    if (filterPeriod === 'custom' && customRange) {
      // For custom range, use both from and to dates, and include entire end day
      const rangeStart = startOfDay(customRange.from);
      const rangeEnd = endOfDay(customRange.to);
      filterFn = (date: Date) => isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    } else if (filterPeriod === 'day') {
      // Include entire current day
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
      return { 
        filteredTime: timeEntries, 
        filteredDrive: driveEntries, 
        filteredMaterials: materials 
      };
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

  // Check if there's any activity in the filtered period
  const hasActivity = filteredTime.length > 0 || filteredDrive.length > 0 || filteredMaterials.length > 0;
  const filterLabel = getFilterLabel();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card
      className="p-5 sm:p-6 relative overflow-hidden group cursor-pointer animate-fade-in
        backdrop-blur-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]
        shadow-[var(--glass-shadow)] -translate-y-1 md:translate-y-0
        transition-all duration-500 ease-out
        md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] md:hover:-translate-y-2
        dark:md:hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]
        before:absolute before:inset-0 before:rounded-lg before:p-[1px] 
        before:bg-gradient-to-br before:from-[var(--glass-glow)] before:via-transparent before:to-transparent
        before:opacity-0 before:transition-opacity before:duration-500
        md:hover:before:opacity-100 before:-z-10"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      {/* Colored accent bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80 group-hover:w-2 transition-all duration-300 shadow-lg"
        style={{ backgroundColor: project.color }}
      />
      
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] dark:group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none rounded-lg"
        style={{ 
          background: `radial-gradient(circle at top right, ${project.color}40, transparent 70%)` 
        }}
      />
      
      {/* Shimmer effect - plays once on load */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          showShimmer ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: `linear-gradient(110deg, transparent 40%, ${project.color}15 50%, transparent 60%)`,
          backgroundSize: '200% 100%',
          animation: showShimmer ? 'shimmer 3s ease-in-out' : 'none'
        }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 sm:gap-3 flex-1 min-w-0">
          <div
            className="w-5 h-5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xl sm:text-2xl truncate">{project.name}</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-sm text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <Building2 className="h-4 w-4 flex-shrink-0 text-purple-500 dark:text-purple-400" />
                <span className="truncate">{project.customer_name}</span>
              </span>
              <span className="flex items-center gap-1 flex-shrink-0">
                👥 {teamMemberCount} {teamMemberCount === 1 ? 'medlem' : 'medlemmer'}
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          <Button
            variant={isActive ? "default" : "outline"}
            onClick={onToggle}
            className={`h-16 sm:h-16 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 ${
              isActive ? "bg-green-500 hover:bg-green-500 animate-pulse" : "hover:bg-blue-500/10 hover:border-blue-500/50"
            }`}
          >
            {isActive ? (
              <Pause className="h-8 w-8 sm:h-8 sm:w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 sm:h-8 sm:w-8 text-blue-500 dark:text-blue-400" />
            )}
          </Button>

          <DriveDialog isDriving={isDriving} onToggleDriving={handleDrivingSubmit} />

          <AddMaterialDialog onAddMaterial={onAddMaterial} />
        </div>

        <div className="space-y-2 mb-4 p-3 sm:p-3 bg-muted/50 rounded-lg transition-colors hover:bg-muted/70">
          {!hasActivity && filterPeriod ? (
            <div className="text-center py-4 sm:py-4 text-muted-foreground text-sm sm:text-sm">
              Ingen aktivitet i denne perioden
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm sm:text-sm">
                <div className="flex items-center gap-2 sm:gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                  <span>Total tid:</span>
                </div>
                <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
              </div>
              {totalKilometers > 0 && (
                <div className="flex items-center justify-between text-sm sm:text-sm pt-2 border-t border-border">
                  <div className="flex items-center gap-2 sm:gap-2 text-muted-foreground">
                    <Car className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
                    <span>Kjørt:</span>
                  </div>
                  <span className="font-semibold text-foreground">{totalKilometers.toFixed(1)} km</span>
                </div>
              )}
              {totalMaterialCost > 0 && (
                <div className="flex items-center justify-between text-sm sm:text-sm pt-2 border-t border-border">
                  <div className="flex items-center gap-2 sm:gap-2 text-muted-foreground">
                    <Package className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 text-orange-500 dark:text-orange-400" />
                    <span>Materialer:</span>
                  </div>
                  <span className="font-semibold text-foreground">{totalMaterialCost.toFixed(2)} kr</span>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </Card>
  );
};
