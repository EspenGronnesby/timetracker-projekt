import { useWageSettings } from "@/hooks/useWageSettings";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DollarSign } from "lucide-react";

const WageSettings = () => {
  const { settings, isLoading, upsert, isSaving } = useWageSettings();
  const { toast } = useToast();

  const [hourlyRate, setHourlyRate] = useState("0");
  const [overtimeThreshold, setOvertimeThreshold] = useState("7.5");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [lunchMinutes, setLunchMinutes] = useState("30");
  const [lunchIsPaid, setLunchIsPaid] = useState(false);

  useEffect(() => {
    if (settings) {
      setHourlyRate(String(settings.hourly_rate));
      setOvertimeThreshold(String(settings.overtime_threshold));
      setOvertimeMultiplier(String(settings.overtime_multiplier));
      setLunchMinutes(String(settings.default_lunch_minutes));
      setLunchIsPaid(settings.lunch_is_paid);
    }
  }, [settings]);

  const handleSave = () => {
    upsert(
      {
        hourly_rate: parseFloat(hourlyRate) || 0,
        overtime_threshold: parseFloat(overtimeThreshold) || 7.5,
        overtime_multiplier: parseFloat(overtimeMultiplier) || 1.5,
        default_lunch_minutes: parseInt(lunchMinutes) || 30,
        lunch_is_paid: lunchIsPaid,
      },
      {
        onSuccess: () =>
          toast({ title: "Lagret", description: "Lønnsinnstillinger oppdatert" }),
        onError: () =>
          toast({ title: "Feil", description: "Kunne ikke lagre", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 max-w-lg mx-auto space-y-6">
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Lønnsinnstillinger</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hourly-rate">Timesats (NOK)</Label>
            <Input
              id="hourly-rate"
              type="number"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="250"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overtime-threshold">Overtid-terskel (timer)</Label>
            <Input
              id="overtime-threshold"
              type="number"
              min="0"
              step="0.5"
              value={overtimeThreshold}
              onChange={(e) => setOvertimeThreshold(e.target.value)}
              placeholder="7.5"
            />
            <p className="text-xs text-muted-foreground">
              Etter dette antall timer regnes resten som overtid
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overtime-multiplier">Overtidstillegg</Label>
            <div className="flex gap-2">
              <Button
                variant={overtimeMultiplier === "1.5" ? "default" : "outline"}
                size="sm"
                onClick={() => setOvertimeMultiplier("1.5")}
              >
                50% (1.5x)
              </Button>
              <Button
                variant={overtimeMultiplier === "2" ? "default" : "outline"}
                size="sm"
                onClick={() => setOvertimeMultiplier("2")}
              >
                100% (2x)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lunch-minutes">Standard lunsjtid (minutter)</Label>
            <Input
              id="lunch-minutes"
              type="number"
              min="0"
              value={lunchMinutes}
              onChange={(e) => setLunchMinutes(e.target.value)}
              placeholder="30"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="lunch-paid">Lunsj er betalt som standard</Label>
              <p className="text-xs text-muted-foreground">
                Om lunsj skal telle som arbeidstid
              </p>
            </div>
            <Switch
              id="lunch-paid"
              checked={lunchIsPaid}
              onCheckedChange={setLunchIsPaid}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? "Lagrer..." : "Lagre innstillinger"}
        </Button>
      </Card>

      {/* Preview */}
      {parseFloat(hourlyRate) > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Eksempel — 9 timers dag</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Normal: {overtimeThreshold}t × {hourlyRate} kr</span>
              <span>{(parseFloat(overtimeThreshold) * parseFloat(hourlyRate)).toFixed(0)} kr</span>
            </div>
            <div className="flex justify-between text-yellow-500">
              <span>
                Overtid: {(9 - parseFloat(overtimeThreshold)).toFixed(1)}t × {(parseFloat(hourlyRate) * parseFloat(overtimeMultiplier)).toFixed(0)} kr
              </span>
              <span>
                {((9 - parseFloat(overtimeThreshold)) * parseFloat(hourlyRate) * parseFloat(overtimeMultiplier)).toFixed(0)} kr
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-1">
              <span>Totalt</span>
              <span>
                {(
                  parseFloat(overtimeThreshold) * parseFloat(hourlyRate) +
                  (9 - parseFloat(overtimeThreshold)) * parseFloat(hourlyRate) * parseFloat(overtimeMultiplier)
                ).toFixed(0)}{" "}
                kr
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WageSettings;
