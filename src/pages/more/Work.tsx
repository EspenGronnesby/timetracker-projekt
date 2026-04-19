import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Wallet, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";

const Work = () => {
  const { user, profile, loading } = useAuth();
  const { toast } = useToast();

  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [taxPercentage, setTaxPercentage] = useState<string>("");
  const [normalHoursDay, setNormalHoursDay] = useState<string>("7.5");
  const [normalHoursWeek, setNormalHoursWeek] = useState<string>("37.5");
  const [defaultStartTime, setDefaultStartTime] = useState<string>("07:00");
  const [defaultEndTime, setDefaultEndTime] = useState<string>("15:00");
  const [defaultBreakfastTime, setDefaultBreakfastTime] = useState<string>("09:00");
  const [defaultLunchTime, setDefaultLunchTime] = useState<string>("11:30");
  const [defaultBreakfastMin, setDefaultBreakfastMin] = useState<string>("20");
  const [defaultLunchMin, setDefaultLunchMin] = useState<string>("30");
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setHourlyRate(
        profile.hourly_rate_nok != null ? String(profile.hourly_rate_nok) : ""
      );
      setTaxPercentage(
        profile.tax_percentage != null ? String(profile.tax_percentage) : ""
      );
      setNormalHoursDay(
        profile.normal_hours_per_day != null ? String(profile.normal_hours_per_day) : "7.5"
      );
      setNormalHoursWeek(
        profile.normal_hours_per_week != null ? String(profile.normal_hours_per_week) : "37.5"
      );
      setDefaultStartTime(profile.default_start_time?.slice(0, 5) || "07:00");
      setDefaultEndTime(profile.default_end_time?.slice(0, 5) || "15:00");
      setDefaultBreakfastTime(profile.default_breakfast_time?.slice(0, 5) || "09:00");
      setDefaultLunchTime(profile.default_lunch_time?.slice(0, 5) || "11:30");
      setDefaultBreakfastMin(
        profile.default_breakfast_min != null ? String(profile.default_breakfast_min) : "20"
      );
      setDefaultLunchMin(
        profile.default_lunch_min != null ? String(profile.default_lunch_min) : "30"
      );
      setAutoScheduleEnabled(profile.auto_schedule_enabled === true);
    }
  }, [profile]);

  const saveSetting = useCallback(async (field: string, value: unknown) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Kunne ikke lagre", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laster...</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Arbeid & Lønn</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-snug">
          Administrer lønn, arbeidstidfølg og standarddager
        </p>
      </div>

      {/* Lønn */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Min lønn</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Skriv inn timelønn og skatteprosent så regner appen ut hva du tjener basert på timene dine.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hourly-rate" className="text-base">
              Timelønn (brutto, NOK)
            </Label>
            <Input
              id="hourly-rate"
              type="number"
              inputMode="decimal"
              min="0"
              step="10"
              placeholder="f.eks. 350"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              onBlur={() => {
                const parsed = hourlyRate === "" ? null : Number(hourlyRate);
                if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
                saveSetting("hourly_rate_nok", parsed);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Det du får utbetalt før skatt per time.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax-percentage" className="text-base">
              Skatteprosent (%)
            </Label>
            <Input
              id="tax-percentage"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="1"
              placeholder="f.eks. 30"
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(e.target.value)}
              onBlur={() => {
                const parsed = taxPercentage === "" ? null : Number(taxPercentage);
                if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) return;
                saveSetting("tax_percentage", parsed);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Din egen anslåtte skatteprosent. Sjekk skattekortet ditt om du er usikker.
            </p>
          </div>
        </div>
      </Card>

      {/* Normal arbeidstid */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Normal arbeidstid</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Brukes for å regne ut overtid automatisk. Standard i Norge er 7,5 timer per dag og 37,5 timer per uke.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="normal-hours-day" className="text-base">
              Timer per dag
            </Label>
            <Input
              id="normal-hours-day"
              type="number"
              inputMode="decimal"
              min="0"
              max="24"
              step="0.5"
              placeholder="7.5"
              value={normalHoursDay}
              onChange={(e) => setNormalHoursDay(e.target.value)}
              onBlur={() => {
                const parsed = normalHoursDay === "" ? 7.5 : Number(normalHoursDay);
                if (Number.isNaN(parsed) || parsed < 0 || parsed > 24) return;
                saveSetting("normal_hours_per_day", parsed);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="normal-hours-week" className="text-base">
              Timer per uke
            </Label>
            <Input
              id="normal-hours-week"
              type="number"
              inputMode="decimal"
              min="0"
              max="168"
              step="0.5"
              placeholder="37.5"
              value={normalHoursWeek}
              onChange={(e) => setNormalHoursWeek(e.target.value)}
              onBlur={() => {
                const parsed = normalHoursWeek === "" ? 37.5 : Number(normalHoursWeek);
                if (Number.isNaN(parsed) || parsed < 0 || parsed > 168) return;
                saveSetting("normal_hours_per_week", parsed);
              }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Når du jobber mer enn dette regnes det som overtid. Du kan velge 50% eller 100% tillegg, og om det skal utbetales eller tas ut som avspasering.
        </p>
      </Card>

      {/* Standard arbeidsdag */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Standard arbeidsdag</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Når du fyller inn timer i etterkant fylles disse tidene ut automatisk, så du bare må trykke Lagre.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-start" className="text-base">Vanlig start</Label>
              <Input
                id="default-start"
                type="time"
                value={defaultStartTime}
                onChange={(e) => setDefaultStartTime(e.target.value)}
                onBlur={() => saveSetting("default_start_time", defaultStartTime)}
                className="tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-end" className="text-base">Vanlig slutt</Label>
              <Input
                id="default-end"
                type="time"
                value={defaultEndTime}
                onChange={(e) => setDefaultEndTime(e.target.value)}
                onBlur={() => saveSetting("default_end_time", defaultEndTime)}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="border-t border-border/30 pt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Pauser</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bf-time" className="text-sm">Frokost-tid</Label>
                <Input
                  id="bf-time"
                  type="time"
                  value={defaultBreakfastTime}
                  onChange={(e) => setDefaultBreakfastTime(e.target.value)}
                  onBlur={() => saveSetting("default_breakfast_time", defaultBreakfastTime)}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bf-min" className="text-sm">Frokost-minutter</Label>
                <Input
                  id="bf-min"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="120"
                  step="5"
                  value={defaultBreakfastMin}
                  onChange={(e) => setDefaultBreakfastMin(e.target.value)}
                  onBlur={() => {
                    const parsed = defaultBreakfastMin === "" ? 0 : Number(defaultBreakfastMin);
                    if (Number.isNaN(parsed) || parsed < 0 || parsed > 120) return;
                    saveSetting("default_breakfast_min", parsed);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="space-y-2">
                <Label htmlFor="lunch-time" className="text-sm">Lunsj-tid</Label>
                <Input
                  id="lunch-time"
                  type="time"
                  value={defaultLunchTime}
                  onChange={(e) => setDefaultLunchTime(e.target.value)}
                  onBlur={() => saveSetting("default_lunch_time", defaultLunchTime)}
                  className="tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lunch-min" className="text-sm">Lunsj-minutter</Label>
                <Input
                  id="lunch-min"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="120"
                  step="5"
                  value={defaultLunchMin}
                  onChange={(e) => setDefaultLunchMin(e.target.value)}
                  onBlur={() => {
                    const parsed = defaultLunchMin === "" ? 0 : Number(defaultLunchMin);
                    if (Number.isNaN(parsed) || parsed < 0 || parsed > 120) return;
                    saveSetting("default_lunch_min", parsed);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Disse tidene styrer også dagsplanen (frokost/lunsj/ferdig) på hovedsiden.
        </p>
      </Card>

      {/* Automatisk tidsplan */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">Automatisk tidsplan</h3>
          </div>
          <Switch
            checked={autoScheduleEnabled}
            onCheckedChange={(checked) => {
              setAutoScheduleEnabled(checked);
              saveSetting("auto_schedule_enabled", checked);
            }}
            aria-label="Slå på automatisk tidsplan"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Start, pause og avslutt arbeidsdagen automatisk basert på tidene over. Fungerer mandag til fredag mens appen er åpen. Du kan fortsatt stoppe eller pause manuelt når som helst.
        </p>
      </Card>
    </div>
  );
};

export default Work;
