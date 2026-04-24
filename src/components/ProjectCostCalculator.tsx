import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Clock, Car, Package, Loader2 } from "lucide-react";
import { invokeWithRetry } from "@/lib/invokeWithRetry";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CostBreakdown {
  labor: {
    hours: number;
    rate: number;
    cost: number;
  };
  driving: {
    totalKm: number;
    billableKm: number;
    freeKm: number;
    rate: number;
    cost: number;
  };
  materials: {
    cost: number;
    items: number;
  };
  total: number;
}

interface ProjectCostCalculatorProps {
  projectId: string;
  userId?: string;
}

export function ProjectCostCalculator({ projectId, userId }: ProjectCostCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myCosts, setMyCosts] = useState<CostBreakdown | null>(null);
  const [allCosts, setAllCosts] = useState<CostBreakdown | null>(null);
  const { toast } = useToast();

  const calculateCosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await invokeWithRetry<{ success: boolean; myCosts: CostBreakdown; allCosts: CostBreakdown }>(
        'calculate-project-cost',
        { body: { projectId, userId } },
        { idempotent: true }
      );

      if (error) throw error;
      if (!data) throw new Error("Ingen data returnert");

      if (data.success) {
        setMyCosts(data.myCosts);
        setAllCosts(data.allCosts);
      }
    } catch (error) {
      console.error('Error calculating costs:', error);
      toast({
        title: "Feil ved beregning",
        description: "Kunne ikke beregne prosjektkostnader. Prøv igjen senere.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !myCosts && !allCosts) {
      calculateCosts();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const CostBreakdownView = ({ costs, title }: { costs: CostBreakdown; title: string }) => (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Arbeid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Timer</span>
            <span className="font-medium flex-shrink-0 tabular-nums">{formatHours(costs.labor.hours)} t</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Timepris</span>
            <span className="font-medium flex-shrink-0 tabular-nums">{formatCurrency(costs.labor.rate)}/t</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t gap-2">
            <span className="min-w-0 flex-1">Sum arbeid</span>
            <span className="flex-shrink-0 tabular-nums">{formatCurrency(costs.labor.cost)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Car className="h-4 w-4" />
            Kjøring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Total kjørt</span>
            <span className="font-medium flex-shrink-0 tabular-nums">{costs.driving.totalKm.toFixed(1)} km</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Gratis km</span>
            <span className="font-medium flex-shrink-0 tabular-nums">-{costs.driving.freeKm} km</span>
          </div>
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Fakturerbar kjøring</span>
            <span className="font-medium flex-shrink-0 tabular-nums">{costs.driving.billableKm.toFixed(1)} km × {formatCurrency(costs.driving.rate)}/km</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t gap-2">
            <span className="min-w-0 flex-1">Sum kjøring</span>
            <span className="flex-shrink-0 tabular-nums">{formatCurrency(costs.driving.cost)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Materialer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm gap-2">
            <span className="text-muted-foreground min-w-0 flex-1">Antall poster</span>
            <span className="font-medium flex-shrink-0 tabular-nums">{costs.materials.items}</span>
          </div>
          <div className="flex justify-between font-semibold pt-2 border-t gap-2">
            <span className="min-w-0 flex-1">Sum materialer</span>
            <span className="flex-shrink-0 tabular-nums">{formatCurrency(costs.materials.cost)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">TOTALKOSTNAD</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(costs.total)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" />
          Beregn kostnad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kostnadsberegning</DialogTitle>
          <DialogDescription>
            Beregning basert på registrerte timer, kjøring og materialer
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : myCosts && allCosts ? (
          <Tabs defaultValue="mine" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mine">Mine kostnader</TabsTrigger>
              <TabsTrigger value="totalt">Totalt prosjekt</TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="mt-4">
              <CostBreakdownView costs={myCosts} title="Mine kostnader" />
            </TabsContent>
            <TabsContent value="totalt" className="mt-4">
              <CostBreakdownView costs={allCosts} title="Totale prosjektkostnader" />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
