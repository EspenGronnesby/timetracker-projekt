import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";

interface DriveDialogProps {
  projectId: string;
  isDriving: boolean;
  onToggleDriving: (projectId: string, kilometers?: number) => void;
}

export const DriveDialog = ({ projectId, isDriving, onToggleDriving }: DriveDialogProps) => {
  const [open, setOpen] = useState(false);
  const [kilometers, setKilometers] = useState("");

  const handleStart = () => {
    onToggleDriving(projectId);
    setOpen(false);
  };

  const handleStop = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(kilometers);
    if (!isNaN(km) && km > 0) {
      onToggleDriving(projectId, km);
      setKilometers("");
      setOpen(false);
    }
  };

  if (isDriving) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="flex-1 min-w-[150px]">
            <Car className="mr-2 h-5 w-5" />
            Stopp kjøring
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stopp kjøring</DialogTitle>
            <DialogDescription>
              Registrer antall kilometer kjørt
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStop} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kilometers">Kilometer</Label>
              <Input
                id="kilometers"
                type="number"
                step="0.1"
                min="0"
                placeholder="F.eks. 15.5"
                value={kilometers}
                onChange={(e) => setKilometers(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Lagre kjøring
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 min-w-[150px] bg-accent hover:bg-accent/90">
          <Car className="mr-2 h-5 w-5" />
          Start kjøring
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start kjøring</DialogTitle>
          <DialogDescription>
            Klar for å starte kjøring? Når du er ferdig, registrer antall kilometer.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={handleStart} className="w-full bg-accent hover:bg-accent/90">
          Start nå
        </Button>
      </DialogContent>
    </Dialog>
  );
};
