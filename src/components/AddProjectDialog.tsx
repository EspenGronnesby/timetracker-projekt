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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { CustomerInfo } from "@/types/project";
import { ScrollArea } from "@/components/ui/scroll-area";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100, "Project name must be less than 100 characters"),
  customerName: z.string().trim().min(1, "Customer name is required").max(100, "Customer name must be less than 100 characters"),
  customerAddress: z.string().trim().max(200, "Address must be less than 200 characters").optional(),
  customerPhone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  customerEmail: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").or(z.literal("")).optional(),
  contractNumber: z.string().trim().max(50, "Contract number must be less than 50 characters").optional(),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

interface AddProjectDialogProps {
  onAddProject: (name: string, color: string, customerInfo: CustomerInfo) => void;
}

const PRESET_COLORS = [
  "#0F766E", "#3B82F6", "#8B5CF6", "#EC4899", 
  "#F59E0B", "#10B981", "#EF4444", "#6366F1"
];

export const AddProjectDialog = ({ onAddProject }: AddProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
    contractNumber: "",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = projectSchema.parse({
        name,
        customerName: customerInfo.name,
        customerAddress: customerInfo.address,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        contractNumber: customerInfo.contractNumber,
        description: customerInfo.description,
      });
      
      onAddProject(validatedData.name, selectedColor, {
        name: validatedData.customerName,
        address: validatedData.customerAddress || "",
        phone: validatedData.customerPhone || "",
        email: validatedData.customerEmail || "",
        contractNumber: validatedData.contractNumber || "",
        description: validatedData.description || "",
      });
      
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
      setCustomerInfo({
        name: "",
        address: "",
        phone: "",
        email: "",
        contractNumber: "",
        description: "",
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/50 transition-all duration-500 animate-[pulse_8s_ease-in-out_infinite]">
          <Plus className="mr-2 h-5 w-5" />
          Nytt Prosjekt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Legg til nytt prosjekt</DialogTitle>
          <DialogDescription>
            Opprett et nytt prosjekt med kundeinformasjon
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Prosjektnavn *</Label>
              <Input
                id="project-name"
                placeholder="F.eks. Volframbvegen 12"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-semibold text-sm">Kundeinformasjon</h3>
              
              <div className="space-y-2">
                <Label htmlFor="customer-name">Kundenavn *</Label>
                <Input
                  id="customer-name"
                  placeholder="Navn på kunde"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-address">Adresse</Label>
                <Input
                  id="customer-address"
                  placeholder="Gateadresse"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">Telefon</Label>
                  <Input
                    id="customer-phone"
                    placeholder="12345678"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-email">E-post</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="kunde@epost.no"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract-number">Avtalenummer</Label>
                <Input
                  id="contract-number"
                  placeholder="Avtale-/ordrenummer"
                  value={customerInfo.contractNumber}
                  onChange={(e) => setCustomerInfo({...customerInfo, contractNumber: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  placeholder="Beskrivelse av prosjektet"
                  value={customerInfo.description}
                  onChange={(e) => setCustomerInfo({...customerInfo, description: e.target.value})}
                  rows={3}
                />
              </div>
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
