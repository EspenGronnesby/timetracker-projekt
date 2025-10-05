import { useState, useMemo } from "react";
import { Project, TimeEntry, DriveEntry, Material } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Trash2,
  Car,
  Building2,
  Share2,
  Copy,
  Check,
  Clock,
  Package,
  Calendar,
} from "lucide-react";
import { isWithinInterval, startOfDay, endOfDay, format } from "date-fns";
import { DriveDialog } from "./DriveDialog";
import { AddMaterialDialog } from "./AddMaterialDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  userName: string;
  filterPeriod?: string;
  customRange?: { from: Date; to: Date };
  teamMemberCount?: number;
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
  userName,
  filterPeriod,
  customRange,
  teamMemberCount = 1,
}: ProjectCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleDrivingSubmit = (kilometers: number) => {
    onToggleDriving(kilometers);
  };

  const handleGenerateInvite = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-project-invite', {
        body: { projectId: project.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setInviteUrl(data.inviteUrl);
      setShareDialogOpen(true);
    } catch (err: any) {
      console.error('Error generating invite:', err);
      toast({
        variant: "destructive",
        title: "Failed to generate invite",
        description: err.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
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
      className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/project/${project.id}`)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {project.customer_name}
              </span>
              <span className="flex items-center gap-1 text-xs">
                👥 {teamMemberCount} {teamMemberCount === 1 ? 'medlem' : 'medlemmer'}
              </span>
            </div>
          </div>
        </div>
        {filterLabel && (
          <Badge variant="secondary" className="ml-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {filterLabel}
          </Badge>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button
            variant={isActive ? "default" : "outline"}
            onClick={onToggle}
            className={`h-16 w-full hover:scale-105 transition-all ${
              isActive ? "bg-green-500 hover:bg-green-600 animate-pulse" : ""
            }`}
          >
            {isActive ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </Button>

          <DriveDialog isDriving={isDriving} onToggleDriving={handleDrivingSubmit} />

          <AddMaterialDialog onAddMaterial={onAddMaterial} />
        </div>

        <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
          {!hasActivity && filterPeriod ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Ingen aktivitet i denne perioden
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Total tid:</span>
                </div>
                <span className="font-semibold text-foreground">{formatTime(totalTime)}</span>
              </div>
              {totalKilometers > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="h-4 w-4" />
                    <span>Kjørt:</span>
                  </div>
                  <span className="font-semibold text-foreground">{totalKilometers.toFixed(1)} km</span>
                </div>
              )}
              {totalMaterialCost > 0 && (
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Materialer:</span>
                  </div>
                  <span className="font-semibold text-foreground">{totalMaterialCost.toFixed(2)} kr</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-4 border-t flex justify-between items-center">
          <Button 
            variant="outline" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/project/${project.id}#invites`);
            }}
            className="hover:scale-105 transition-transform"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="destructive" 
            size="icon" 
            onClick={onDelete}
            className="hover:scale-105 transition-transform"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              Share this invite link with your colleagues to give them access to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md bg-muted"
            />
            <Button onClick={handleCopyInvite} size="icon">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
