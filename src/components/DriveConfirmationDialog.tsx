import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface DriveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculatedKm: number;
  startLocation: string;
  endLocation: string;
  onConfirm: (finalKm: number) => void;
}

export const DriveConfirmationDialog = ({
  open,
  onOpenChange,
  calculatedKm,
  startLocation,
  endLocation,
  onConfirm,
}: DriveConfirmationDialogProps) => {
  const [editedKm, setEditedKm] = useState(calculatedKm.toString());

  const handleConfirm = () => {
    const km = parseFloat(editedKm);
    if (!isNaN(km) && km > 0) {
      onConfirm(km);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bekreft kjøredistanse</DialogTitle>
          <DialogDescription>
            Sjekk at kilometer stemmer basert på Google Maps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Fra:</p>
              <p className="text-muted-foreground">{startLocation}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Til:</p>
              <p className="text-muted-foreground">{endLocation}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="km-input">Kilometer</Label>
            <Input
              id="km-input"
              type="number"
              step="0.1"
              min="0"
              value={editedKm}
              onChange={(e) => setEditedKm(e.target.value)}
              className="text-lg font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              Beregnet distanse: {calculatedKm} km
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Avbryt
          </Button>
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Bekreft og lagre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
