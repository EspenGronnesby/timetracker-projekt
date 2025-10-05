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

interface AddMaterialDialogProps {
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
}

export const AddMaterialDialog = ({ onAddMaterial }: AddMaterialDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    
    if (name.trim() && !isNaN(qty) && qty > 0 && !isNaN(price) && price >= 0) {
      onAddMaterial(name.trim(), qty, price);
      setName("");
      setQuantity("");
      setUnitPrice("");
      setOpen(false);
    }
  };

  const totalPrice = !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(unitPrice))
    ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2)
    : "0.00";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 min-w-[150px]" variant="outline">
          <Package className="mr-2 h-5 w-5" />
          Legg til materiale
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
