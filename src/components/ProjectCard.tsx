import { useState } from "react";
import { Project, TimeEntry, DriveEntry } from "@/hooks/useProjects";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
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

  // Filter entries based on period
  const getFilteredEntries = () => {
    if (!filterPeriod) return { timeEntries, driveEntries };
    
    const now = new Date();
    let startDate: Date;
    
    if (filterPeriod === 'custom' && customRange) {
      startDate = customRange.from;
    } else if (filterPeriod === 'day') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (filterPeriod === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (filterPeriod === 'month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    } else {
      return { timeEntries, driveEntries };
    }
    
    const filtered = {
      timeEntries: timeEntries.filter(e => new Date(e.start_time) >= startDate),
      driveEntries: driveEntries.filter(e => new Date(e.start_time) >= startDate)
    };
    
    return filtered;
  };
  
  const { timeEntries: filteredTime, driveEntries: filteredDrive } = getFilteredEntries();

  const totalTime = filteredTime.reduce(
    (acc, entry) => acc + entry.duration_seconds,
    0
  );

  const totalKilometers = filteredDrive.reduce(
    (acc, entry) => acc + (entry.kilometers || 0),
    0
  );

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
        <div className="flex items-center gap-3">
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
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button
            variant={isActive ? "secondary" : "default"}
            onClick={onToggle}
            className="h-12 w-full hover:scale-105 transition-transform"
          >
            {isActive ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6" />
            )}
          </Button>

          <DriveDialog isDriving={isDriving} onToggleDriving={handleDrivingSubmit} />

          <AddMaterialDialog onAddMaterial={onAddMaterial} />
        </div>

        <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
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
