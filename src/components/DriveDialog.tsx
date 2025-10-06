import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";
interface DriveDialogProps {
  isDriving: boolean;
  onToggleDriving: (kilometers?: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export const DriveDialog = ({
  isDriving,
  onToggleDriving,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: DriveDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [kilometers, setKilometers] = useState("");
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const handleStart = () => {
    onToggleDriving();
    setOpen(false);
  };
  const handleStop = (e: React.FormEvent) => {
    e.preventDefault();
    const km = parseFloat(kilometers);
    if (!isNaN(km) && km > 0) {
      onToggleDriving(km);
      setKilometers("");
      setOpen(false);
    }
  };
  if (isDriving) {
    return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="h-16 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 animate-pulse hover:bg-destructive">
            <Car className="h-8 w-8 text-white" />
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
              <Input id="kilometers" type="number" step="0.1" min="0" placeholder="F.eks. 15.5" value={kilometers} onChange={e => setKilometers(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              Lagre kjøring
            </Button>
          </form>
        </DialogContent>
      </Dialog>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-16 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 hover:bg-green-500/10 hover:border-green-500/50"
        >
          <Car className="h-8 w-8 text-green-500 dark:text-green-400" />
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
    </Dialog>;
};