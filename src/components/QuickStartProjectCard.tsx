import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Car, Package, Play, Pause } from "lucide-react";
import { DriveDialog } from "./DriveDialog";
import { AddMaterialDialog } from "./AddMaterialDialog";

interface QuickStartProjectCardProps {
  projectId: string;
  projectName: string;
  projectColor: string;
  customerInfo?: string;
  teamMemberCount: number;
  isActive: boolean;
  isDriving: boolean;
  onToggle: () => void;
  onToggleDriving: (kilometers?: number) => void;
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
}

export const QuickStartProjectCard = ({
  projectName,
  projectColor,
  customerInfo,
  teamMemberCount,
  isActive,
  isDriving,
  onToggle,
  onToggleDriving,
  onAddMaterial,
}: QuickStartProjectCardProps) => {
  const [driveOpen, setDriveOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
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

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant={isActive ? "default" : "outline"}
            size="icon"
            className={`h-12 w-12 transition-all ${
              isActive ? "bg-green-500 hover:bg-green-600 animate-pulse" : ""
            }`}
            onClick={onToggle}
          >
            {isActive ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>

          <Button
            variant={isDriving ? "destructive" : "outline"}
            size="icon"
            className={`h-12 w-12 transition-all ${
              isDriving ? "animate-pulse" : ""
            }`}
            onClick={() => {
              if (isDriving) {
                setDriveOpen(true);
              } else {
                onToggleDriving();
              }
            }}
          >
            <Car className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all"
            onClick={() => setMaterialOpen(true)}
          >
            <Package className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <DriveDialog
        isDriving={isDriving}
        onToggleDriving={onToggleDriving}
        open={driveOpen}
        onOpenChange={setDriveOpen}
      />

      <AddMaterialDialog
        onAddMaterial={onAddMaterial}
        open={materialOpen}
        onOpenChange={setMaterialOpen}
      />
    </Card>
  );
};
