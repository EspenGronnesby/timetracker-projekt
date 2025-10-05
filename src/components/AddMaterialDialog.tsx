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
import { Package } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const materialSchema = z.object({
  name: z.string().trim().min(1, "Material name is required").max(100, "Material name must be less than 100 characters"),
  quantity: z.number().positive("Quantity must be positive").max(999999, "Quantity is too large"),
  unitPrice: z.number().positive("Unit price must be positive").max(999999, "Unit price is too large"),
});

interface AddMaterialDialogProps {
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
}

export const AddMaterialDialog = ({ onAddMaterial }: AddMaterialDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = materialSchema.parse({
        name,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
      });
      
      onAddMaterial(validatedData.name, validatedData.quantity, validatedData.unitPrice);
      setName("");
      setQuantity("");
      setUnitPrice("");
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const totalPrice = !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(unitPrice))
    ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2)
    : "0.00";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 sm:h-10 w-full">
          <Package className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline ml-2">Materiale</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Legg til materiale</DialogTitle>
          <DialogDescription>
            Registrer materiale brukt på prosjektet
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="material-name">Materiale</Label>
            <Input
              id="material-name"
              placeholder="F.eks. Skruer, Maling, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Antall</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-price">Pris per stk (kr)</Label>
              <Input
                id="unit-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="bg-secondary p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Total kostnad</p>
            <p className="text-2xl font-bold">{totalPrice} kr</p>
          </div>

          <Button type="submit" className="w-full">
            Legg til materiale
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
