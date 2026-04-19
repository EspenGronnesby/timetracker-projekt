import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, MapPin, ChevronDown, Loader2, Navigation, Clock, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invokeWithRetry } from "@/lib/invokeWithRetry";
import { toast } from "sonner";
import { FavoriteQuickSelect } from "./FavoriteQuickSelect";
import { RouteMap } from "./RouteMap";

interface DriveDialogProps {
  isDriving: boolean;
  onToggleDriving: (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => void;
  projectId: string;
  activeDriveStartLocation?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRequestMaterialDialog?: () => void;
}

export const DriveDialog = ({
  isDriving,
  onToggleDriving,
  projectId,
  activeDriveStartLocation,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onRequestMaterialDialog,
}: DriveDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [kilometers, setKilometers] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [autoResult, setAutoResult] = useState<{
    km: number;
    startAddress: string;
    endAddress: string;
    durationMinutes: number;
    polyline?: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [saved, setSaved] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // Auto-calculate on stop dialog open
  useEffect(() => {
    if (!isDriving || !open) return;

    // Reset state when dialog opens
    setKilometers("");
    setAutoResult(null);
    setGpsError(false);
    setShowManual(false);
    setManualStart("");
    setManualEnd("");
    setSaved(false);

    // Get current GPS and auto-calculate
    if (!("geolocation" in navigator)) {
      setGpsError(true);
      setShowManual(true);
      return;
    }

    setIsCalculating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const endCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        // Parse start location from stored drive entry
        let startLoc: any = null;
        if (activeDriveStartLocation) {
          try {
            startLoc = JSON.parse(activeDriveStartLocation);
          } catch {
            startLoc = activeDriveStartLocation; // fallback: it's a plain string address
          }
        }

        if (!startLoc) {
          // No start location saved — can't auto-calculate
          setGpsError(true);
          setShowManual(true);
          setIsCalculating(false);
          return;
        }

        try {
          const { data, error } = await invokeWithRetry<{
            distance_km: number;
            start_address?: string;
            end_address?: string;
            duration_minutes?: number;
            route_polyline?: unknown;
          }>(
            "calculate-driving-distance",
            { body: { startLocation: startLoc, endLocation: endCoords } },
            { idempotent: true }
          );

          if (error || !data?.distance_km) {
            throw new Error("Calculation failed");
          }

          setAutoResult({
            km: data.distance_km,
            startAddress: data.start_address || "Startposisjon",
            endAddress: data.end_address || "Nåværende posisjon",
            durationMinutes: data.duration_minutes || 0,
            polyline: data.route_polyline,
          });
          setKilometers(data.distance_km.toString());
        } catch {
          setGpsError(true);
          setShowManual(true);
          toast.error("Kunne ikke beregne distanse automatisk", {
            description: "Skriv inn km manuelt eller bruk adresser",
          });
        } finally {
          setIsCalculating(false);
        }
      },
      () => {
        setGpsError(true);
        setShowManual(true);
        setIsCalculating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isDriving, open, activeDriveStartLocation]);

  const handleStartDrive = useCallback(() => {
    if (isStarting) return;
    setIsStarting(true);

    if (!("geolocation" in navigator)) {
      onToggleDriving(undefined, null);
      setIsStarting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onToggleDriving(undefined, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsStarting(false);
      },
      () => {
        onToggleDriving(undefined, null);
        setIsStarting(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [onToggleDriving, isStarting]);

  const handleManualCalculate = async () => {
    if (!manualStart || !manualEnd) {
      toast.error("Fyll inn startsted og sluttsted");
      return;
    }

    setIsCalculating(true);
    try {
      const { data, error } = await invokeWithRetry<{
        distance_km: number;
        start_address?: string;
        end_address?: string;
        duration_minutes?: number;
        route_polyline?: unknown;
      }>(
        "calculate-driving-distance",
        { body: { startLocation: manualStart, endLocation: manualEnd } },
        { idempotent: true }
      );

      if (error || !data?.distance_km) throw new Error("Failed");

      setAutoResult({
        km: data.distance_km,
        startAddress: data.start_address || manualStart,
        endAddress: data.end_address || manualEnd,
        durationMinutes: data.duration_minutes || 0,
        polyline: data.route_polyline,
      });
      setKilometers(data.distance_km.toString());
    } catch {
      toast.error("Kunne ikke beregne distanse");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    const km = parseFloat(kilometers);
    if (isNaN(km) || km <= 0) {
      toast.error("Vennligst fyll inn gyldig kilometer");
      return;
    }

    const endLoc = autoResult?.endAddress || manualEnd || null;
    const startLoc = autoResult?.startAddress || manualStart || null;
    const routeData = autoResult?.polyline
      ? {
          polyline: autoResult.polyline,
          start_address: autoResult.startAddress,
          end_address: autoResult.endAddress,
          duration_minutes: autoResult.durationMinutes,
        }
      : undefined;

    onToggleDriving(km, startLoc, endLoc, routeData);
    setSaved(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSaved(false);
    setKilometers("");
    setAutoResult(null);
    setShowManual(false);
    setManualStart("");
    setManualEnd("");
    setGpsError(false);
  };

  // START MODE — no dialog, direct GPS capture
  if (!isDriving) {
    return (
      <Button
        variant="outline"
        className="h-14 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 hover:bg-green-500/10 hover:border-green-500/50"
        onClick={handleStartDrive}
        disabled={isStarting}
      >
        {isStarting ? (
          <Loader2 className="h-7 w-7 text-green-500 animate-spin" />
        ) : (
          <Car className="h-7 w-7 text-green-500 dark:text-green-400" />
        )}
      </Button>
    );
  }

  // STOP MODE — dialog with auto-calculation
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          className="h-14 w-full transition-all hover:scale-105 active:scale-95 active:brightness-150 animate-pulse hover:bg-destructive"
        >
          <Car className="h-7 w-7 text-white" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stopp kjøring</DialogTitle>
          <DialogDescription>
            {isCalculating
              ? "Beregner distanse automatisk..."
              : autoResult
              ? "Distanse beregnet. Juster km om nødvendig."
              : "Fyll inn kilometer manuelt eller beregn med adresser."}
          </DialogDescription>
        </DialogHeader>

        {!saved ? (
          <div className="space-y-4">
            {/* Loading state */}
            {isCalculating && (
              <div className="flex items-center justify-center py-6 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Henter GPS og beregner...</span>
              </div>
            )}

            {/* Auto-calculated result */}
            {autoResult && !isCalculating && (
              <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <span className="font-medium">{autoResult.km} km</span>
                  </div>
                  {autoResult.durationMinutes > 0 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">
                        {autoResult.durationMinutes < 60
                          ? `${autoResult.durationMinutes} min`
                          : `${Math.floor(autoResult.durationMinutes / 60)}t ${autoResult.durationMinutes % 60}min`}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="truncate">{autoResult.startAddress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="truncate">{autoResult.endAddress}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Editable km field */}
            {!isCalculating && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="kilometers">Kilometer</Label>
                  <Input
                    id="kilometers"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="F.eks. 15.5"
                    value={kilometers}
                    onChange={(e) => setKilometers(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus={!autoResult}
                  />
                  {autoResult && (
                    <p className="text-xs text-muted-foreground">
                      Automatisk beregnet — endre om det ikke stemmer
                    </p>
                  )}
                </div>

                {/* Manual address fallback (collapsible) */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowManual(!showManual)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showManual ? "rotate-180" : ""}`}
                    />
                    Beregn med adresser manuelt
                  </button>

                  {showManual && (
                    <div className="mt-3 space-y-3 p-3 bg-muted/50 rounded-lg">
                      <FavoriteQuickSelect
                        onSelect={(address) => {
                          if (!manualStart) setManualStart(address);
                          else setManualEnd(address);
                        }}
                        selectedAddress={manualStart || manualEnd}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="manual-start">Startsted</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manual-start"
                            placeholder="F.eks. Hjemmeadresse"
                            value={manualStart}
                            onChange={(e) => setManualStart(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="manual-end">Sluttsted</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="manual-end"
                            placeholder="F.eks. Byggvarehus"
                            value={manualEnd}
                            onChange={(e) => setManualEnd(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleManualCalculate}
                        disabled={isCalculating || !manualStart || !manualEnd}
                      >
                        {isCalculating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Beregner...
                          </>
                        ) : (
                          "Beregn km"
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Save button */}
                <Button className="w-full" onClick={handleSave} disabled={!kilometers || isCalculating}>
                  Lagre kjøring
                </Button>
              </>
            )}
          </div>
        ) : (
          /* Post-save: offer material add */
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium mb-3">
                <Car className="h-4 w-4" />
                {kilometers} km lagret
              </div>
              <p className="text-sm text-muted-foreground">Handlet du noe materialer underveis?</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Ferdig
              </Button>
              {onRequestMaterialDialog && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    handleClose();
                    onRequestMaterialDialog();
                  }}
                >
                  <Package className="h-4 w-4" />
                  Legg til materialer
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
