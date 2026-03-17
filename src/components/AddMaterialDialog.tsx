import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
const materialSchema = z.object({
  name: z.string().trim().min(1, "Materialenavn er påkrevd").max(100, "Materialenavn må være under 100 tegn"),
  quantity: z.number().positive("Antall må være positivt").max(999999, "Antall er for stort"),
  unitPrice: z.number().positive("Pris må være positiv").max(999999, "Pris er for stor")
});
interface AddMaterialDialogProps {
  onAddMaterial: (name: string, quantity: number, unitPrice: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export const AddMaterialDialog = ({
  onAddMaterial,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: AddMaterialDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const {
    toast
  } = useToast();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validatedData = materialSchema.parse({
        name,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice)
      });
      onAddMaterial(validatedData.name, validatedData.quantity, validatedData.unitPrice);
      setName("");
      setQuantity("");
      setUnitPrice("");
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Valideringsfeil",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    }
  };
  const totalPrice = !isNaN(parseFloat(quantity)) && !isNaN(parseFloat(unitPrice)) ? (parseFloat(quantity) * parseFloat(unitPrice)).toFixed(2) : "0.00";
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="h-14 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 hover:bg-orange-500/10 hover:border-orange-500/50"
        >
          <Package className="h-7 w-7 text-orange-500 dark:text-orange-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Legg til materiale</DialogTitle>
          
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="material-name">Materiale</Label>
            <Input id="material-name" placeholder="F.eks. Skruer, Maling, etc." value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Antall</Label>
              <Input id="quantity" type="number" step="0.01" min="0" placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit-price">Pris per stk (kr)</Label>
              <Input id="unit-price" type="number" step="0.01" min="0" placeholder="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required />
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
    </Dialog>;
};