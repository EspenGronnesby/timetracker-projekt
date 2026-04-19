import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Package, Play, Pause, Square } from "lucide-react";
import { DriveDialog } from "./DriveDialog";
import { AddMaterialDialog } from "./AddMaterialDialog";
import { useNavigate } from "react-router-dom";
import { DriveEntry } from "@/hooks/useProjects";

interface QuickStartProjectCardProps {
  projectId: string;
  projectName: string;
  projectColor: string;
  customerInfo?: string;
  teamMemberCount: number;
  isActive: boolean;
  isPaused: boolean;
  isDriving: boolean;
  onToggle: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleDriving: (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => void;
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
  driveEntries?: DriveEntry[];
  userId?: string;
}

export const QuickStartProjectCard = ({
  projectId,
  projectName,
  projectColor,
  customerInfo,
  teamMemberCount,
  isActive,
  isPaused,
  isDriving,
  onToggle,
  onPause,
  onResume,
  onToggleDriving,
  onAddMaterial,
  driveEntries = [],
  userId,
}: QuickStartProjectCardProps) => {
  const navigate = useNavigate();
  const [materialOpen, setMaterialOpen] = useState(false);

  const activeDriveEntry = useMemo(
    () => driveEntries.find((e) => e.user_id === userId && !e.end_time),
    [driveEntries, userId]
  );

  return (
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/project/${projectId}`)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: projectColor }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{projectName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {customerInfo && `${customerInfo} | `}
              {teamMemberCount} {teamMemberCount === 1 ? 'medlem' : 'medlemmer'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Hovedknapp: Play / Pause / Resume */}
          {isActive && !isPaused ? (
            <Button
              variant="default"
              size="icon"
              aria-label="Pause timer"
              className="h-12 w-12 transition-all bg-yellow-500 hover:bg-yellow-600"
              onClick={onPause}
            >
              <Pause className="h-6 w-6 text-white" />
            </Button>
          ) : isPaused ? (
            <Button
              variant="default"
              size="icon"
              aria-label="Fortsett timer"
              className="h-12 w-12 transition-all bg-blue-500 hover:bg-blue-600 animate-pulse"
              onClick={onResume}
            >
              <Play className="h-6 w-6 text-white" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              aria-label="Start timer"
              className="h-12 w-12 transition-all"
              onClick={onToggle}
            >
              <Play className="h-6 w-6" />
            </Button>
          )}

          {/* Stopp-knapp (kun når aktiv/pauset) */}
          {(isActive || isPaused) && (
            <Button
              variant="default"
              size="icon"
              aria-label="Stopp timer"
              className="h-12 w-12 transition-all bg-red-500 hover:bg-red-600"
              onClick={onToggle}
            >
              <Square className="h-5 w-5 text-white" />
            </Button>
          )}

          {/* Kjøring */}
          <DriveDialog
            isDriving={isDriving}
            onToggleDriving={onToggleDriving}
            projectId={projectId}
            activeDriveStartLocation={activeDriveEntry?.start_location ?? null}
            onRequestMaterialDialog={() => setMaterialOpen(true)}
          />

          {/* Material — skjul hvis aktiv for å spare plass */}
          {!isActive && !isPaused && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Registrer materiale"
              className="h-12 w-12 hover:bg-orange-500/10 hover:border-orange-500/50 transition-all"
              onClick={() => setMaterialOpen(true)}
            >
              <Package className="h-6 w-6 text-orange-500 dark:text-orange-400" />
            </Button>
          )}
        </div>
      </div>

      <AddMaterialDialog
        onAddMaterial={onAddMaterial}
        open={materialOpen}
        onOpenChange={setMaterialOpen}
      />
    </Card>
  );
};
