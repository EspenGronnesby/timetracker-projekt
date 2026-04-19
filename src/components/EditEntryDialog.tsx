import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TimeEntry, DriveEntry, Material } from "@/hooks/useProjects";

type EditType = "time" | "drive" | "material";

interface EditEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EditType;
  entry: TimeEntry | DriveEntry | Material;
  requireComment?: boolean;
  onUpdateTimeEntry: (data: {
    entryId: string;
    startTime: string;
    endTime: string;
    comment?: string;
  }) => void;
  onUpdateDriveEntry: (data: {
    entryId: string;
    kilometers: number;
    comment?: string;
  }) => void;
  onUpdateMaterial: (data: {
    materialId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }) => void;
  /** Valgfri — hvis satt vises en Slett-knapp i dialogen. Type matcher editType. */
  onDelete?: (type: EditType, entryId: string) => void;
}

export const EditEntryDialog = ({
  open,
  onOpenChange,
  type,
  entry,
  requireComment = false,
  onUpdateTimeEntry,
  onUpdateDriveEntry,
  onUpdateMaterial,
  onDelete,
}: EditEntryDialogProps) => {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Time entry fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Drive entry fields
  const [kilometers, setKilometers] = useState("");

  // Material fields
  const [materialName, setMaterialName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  // Shared
  const [comment, setComment] = useState("");

  // Populate fields when dialog opens
  useEffect(() => {
    if (!open) return;

    if (type === "time") {
      const e = entry as TimeEntry;
      setStartTime(format(new Date(e.start_time), "yyyy-MM-dd'T'HH:mm"));
      if (e.end_time) {
        setEndTime(format(new Date(e.end_time), "yyyy-MM-dd'T'HH:mm"));
      }
      setComment(e.comment || "");
    } else if (type === "drive") {
      const e = entry as DriveEntry;
      setKilometers(e.kilometers?.toString() || "");
      setComment("");
    } else if (type === "material") {
      const e = entry as Material;
      setMaterialName(e.name);
      setQuantity(e.quantity.toString());
      setUnitPrice(e.unit_price.toString());
      setComment("");
    }
  }, [open, type, entry]);

  const canSubmit = () => {
    if (requireComment && !comment.trim()) return false;

    if (type === "time") {
      return startTime && endTime && new Date(endTime) > new Date(startTime);
    } else if (type === "drive") {
      return Number(kilometers) > 0;
    } else if (type === "material") {
      return materialName.trim() && Number(quantity) > 0 && Number(unitPrice) >= 0;
    }
    return false;
  };

  const handleSubmit = () => {
    if (!canSubmit()) return;

    if (type === "time") {
      onUpdateTimeEntry({
        entryId: entry.id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        comment: comment || undefined,
      });
    } else if (type === "drive") {
      onUpdateDriveEntry({
        entryId: entry.id,
        kilometers: Number(kilometers),
        comment: comment || undefined,
      });
    } else if (type === "material") {
      onUpdateMaterial({
        materialId: entry.id,
        name: materialName.trim(),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      });
    }

    onOpenChange(false);
  };

  const getTitle = () => {
    switch (type) {
      case "time": return "Rediger tidsregistrering";
      case "drive": return "Rediger kjøreregistrering";
      case "material": return "Rediger materiale";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Endre verdiene og lagre. {requireComment && "En kommentar er påkrevd."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {type === "time" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="start-time">Starttid</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Sluttid</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
              {startTime && endTime && new Date(endTime) > new Date(startTime) && (
                <p className="text-sm text-muted-foreground">
                  Varighet: {formatDuration(new Date(startTime), new Date(endTime))}
                </p>
              )}
            </>
          )}

          {type === "drive" && (
            <div className="space-y-2">
              <Label htmlFor="kilometers">Kilometer</Label>
              <Input
                id="kilometers"
                type="number"
                step="0.1"
                min="0"
                value={kilometers}
                onChange={(e) => setKilometers(e.target.value)}
                placeholder="F.eks. 12.5"
              />
            </div>
          )}

          {type === "material" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="material-name">Navn</Label>
                <Input
                  id="material-name"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="F.eks. Kobberrør"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Antall</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-price">Enhetspris (kr)</Label>
                  <Input
                    id="unit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                  />
                </div>
              </div>
              {Number(quantity) > 0 && Number(unitPrice) >= 0 && (
                <p className="text-sm text-muted-foreground">
                  Total: {(Number(quantity) * Number(unitPrice)).toFixed(2)} kr
                </p>
              )}
            </>
          )}

          {/* Kommentarfelt */}
          <div className="space-y-2">
            <Label htmlFor="edit-comment">
              Kommentar {requireComment && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="edit-comment"
              placeholder={
                requireComment
                  ? "Forklar hva som ble endret og hvorfor..."
                  : "Valgfritt — legg til en kommentar"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            {requireComment && (
              <p className="text-xs text-muted-foreground">
                En kommentar er påkrevd for å registrere endringen
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onDelete ? (
            <Button
              variant="ghost"
              onClick={() => setConfirmDeleteOpen(true)}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Slett
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit()}>
              Lagre
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {onDelete && (
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {type === "time" && "Slett tidsregistrering?"}
                {type === "drive" && "Slett kjøreregistrering?"}
                {type === "material" && "Slett materiale?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Denne handlingen kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(type, entry.id);
                  setConfirmDeleteOpen(false);
                  onOpenChange(false);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slett
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Dialog>
  );
};

function formatDuration(start: Date, end: Date): string {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}t ${minutes}m`;
}
