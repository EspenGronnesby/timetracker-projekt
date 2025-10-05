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
import { Plus } from "lucide-react";

interface AddProjectDialogProps {
  onAdd: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  "#0F766E", "#3B82F6", "#8B5CF6", "#EC4899", 
  "#F59E0B", "#10B981", "#EF4444", "#6366F1"
];

export const AddProjectDialog = ({ onAdd }: AddProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), selectedColor);
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
          <Plus className="mr-2 h-5 w-5" />
          Nytt Prosjekt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Legg til nytt prosjekt</DialogTitle>
          <DialogDescription>
            Opprett et nytt prosjekt for å starte tidsporing
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Prosjektnavn</Label>
            <Input
              id="project-name"
              placeholder="F.eks. Volframbvegen Kari"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Velg farge</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-10 h-10 rounded-lg transition-all duration-200 ${
                    selectedColor === color 
                      ? "ring-2 ring-primary ring-offset-2 scale-110" 
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Opprett Prosjekt
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
