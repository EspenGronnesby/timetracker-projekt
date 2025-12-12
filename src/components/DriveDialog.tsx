import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DriveConfirmationDialog } from "./DriveConfirmationDialog";
import { FavoriteQuickSelect } from "./FavoriteQuickSelect";
import { RouteMap } from "./RouteMap";

interface RouteData {
  polyline: string;
  startAddress: string;
  endAddress: string;
  distanceKm: number;
  durationMinutes: number;
}

interface DriveDialogProps {
  isDriving: boolean;
  onToggleDriving: (kilometers?: number, startLocation?: any, endLocation?: any, routeData?: any) => void;
  projectId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export const DriveDialog = ({
  isDriving,
  onToggleDriving,
  projectId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}: DriveDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [kilometers, setKilometers] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [calculatedKm, setCalculatedKm] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  // Get user's current location when starting drive
  useEffect(() => {
    if (isDriving === false && open && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, [isDriving, open]);
  const handleStart = () => {
    const startLoc = startLocation || currentLocation;
    onToggleDriving(undefined, startLoc, undefined);
    setStartLocation("");
    setEndLocation("");
    setOpen(false);
  };
  const calculateDistance = async () => {
    if (!startLocation || !endLocation) {
      toast.error("Vennligst fyll ut start og slutt lokasjon");
      return;
    }

    setIsCalculating(true);
    setRouteData(null);
    
    try {
      console.log('Calling calculate-driving-distance with:', { startLocation, endLocation });
      
      const { data, error } = await supabase.functions.invoke('calculate-driving-distance', {
        body: { startLocation, endLocation }
      });

      console.log('Response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data || !data.distance_km) {
        throw new Error('Invalid response from distance service');
      }

      setCalculatedKm(data.distance_km);
      setKilometers(data.distance_km.toString());
      
      // Store route data for map visualization
      if (data.route_polyline) {
        setRouteData({
          polyline: data.route_polyline,
          startAddress: data.start_address || startLocation,
          endAddress: data.end_address || endLocation,
          distanceKm: data.distance_km,
          durationMinutes: data.duration_minutes || 0
        });
      }
      
      toast.success(`Beregnet distanse: ${data.distance_km} km`);
    } catch (error) {
      console.error('Error calculating distance:', error);
      setCalculatedKm(null);
      setRouteData(null);
      toast.error("Kunne ikke beregne automatisk", {
        description: "Skriv inn km eller prøv igjen",
        duration: 5000,
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleConfirmDistance = (finalKm: number) => {
    // Pass route data for storage
    onToggleDriving(finalKm, startLocation, endLocation, routeData ? {
      polyline: routeData.polyline,
      start_address: routeData.startAddress,
      end_address: routeData.endAddress,
      duration_minutes: routeData.durationMinutes
    } : undefined);
    
    // Show material prompt after drive
    setTimeout(() => {
      toast.info("Kjørte du til butikken?", {
        description: "Legg til materialer hvis du handlet",
        action: {
          label: "Legg til materialer",
          onClick: () => {
            toast.info("Åpner materialdialog...");
          }
        },
        duration: 8000,
      });
    }, 1000);

    setStartLocation("");
    setEndLocation("");
    setKilometers("");
    setCalculatedKm(null);
    setRouteData(null);
    setShowConfirmation(false);
    setOpen(false);
  };

  const handleStop = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prioritize manual input if provided
    const manualKm = parseFloat(kilometers);
    if (!isNaN(manualKm) && manualKm > 0) {
      handleConfirmDistance(manualKm);
      return;
    }
    
    // Try automatic calculation if both locations are provided
    if (startLocation && endLocation) {
      setIsCalculating(true);
      setRouteData(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('calculate-driving-distance', {
          body: { startLocation, endLocation }
        });

        if (error || !data || !data.distance_km) {
          throw new Error('Could not calculate distance');
        }

        // Show confirmation with calculated distance
        setCalculatedKm(data.distance_km);
        setKilometers(data.distance_km.toString());
        
        // Store route data for map
        if (data.route_polyline) {
          setRouteData({
            polyline: data.route_polyline,
            startAddress: data.start_address || startLocation,
            endAddress: data.end_address || endLocation,
            distanceKm: data.distance_km,
            durationMinutes: data.duration_minutes || 0
          });
        }
        
        setShowConfirmation(true);
      } catch (error) {
        console.error('Automatic calculation failed:', error);
        toast.error("Kunne ikke beregne automatisk", {
          description: "Skriv inn kilometer manuelt",
          duration: 5000,
        });
      } finally {
        setIsCalculating(false);
      }
      return;
    }
    
    // If neither manual input nor locations, show error
    toast.error("Vennligst fyll inn kilometer eller begge lokasjoner");
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
            Fyll inn start og slutt lokasjon for automatisk beregning
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleStop} className="space-y-4">
          <FavoriteQuickSelect
            onSelect={(address) => {
              if (!startLocation) {
                setStartLocation(address);
              } else {
                setEndLocation(address);
              }
            }}
            selectedAddress={startLocation || endLocation}
          />
          
          <div className="space-y-2">
            <Label htmlFor="start-location">Startsted</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="start-location" 
                placeholder="F.eks. Hjemmeadresse" 
                value={startLocation} 
                onChange={e => setStartLocation(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-location">Sluttsted</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="end-location" 
                placeholder="F.eks. Byggvarehus" 
                value={endLocation} 
                onChange={e => setEndLocation(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kilometers">
              Kilometer {!kilometers && "(valgfritt)"}
            </Label>
            <Input 
              id="kilometers" 
              type="number" 
              step="0.1" 
              min="0.1" 
              placeholder="F.eks. 15.5" 
              value={kilometers} 
              onChange={e => setKilometers(e.target.value)}
              disabled={isCalculating}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {kilometers 
                ? "Trykk Lagre for å bekrefte" 
                : "Skriv km manuelt eller la automatisk beregning gjøre det"}
            </p>
          </div>
          
          {/* Route Map Preview */}
          {routeData && (
            <RouteMap
              polyline={routeData.polyline}
              startAddress={routeData.startAddress}
              endAddress={routeData.endAddress}
              distanceKm={routeData.distanceKm}
              durationMinutes={routeData.durationMinutes}
            />
          )}
          
          {startLocation && endLocation && !kilometers && !routeData && (
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={calculateDistance}
              disabled={isCalculating}
            >
              {isCalculating ? "Beregner..." : "Beregn km automatisk"}
            </Button>
          )}
          <Button type="submit" className="w-full" disabled={isCalculating}>
            {isCalculating ? "Beregner..." : "Lagre kjøring"}
          </Button>
        </form>
        
        {calculatedKm !== null && (
          <DriveConfirmationDialog
            open={showConfirmation}
            onOpenChange={setShowConfirmation}
            calculatedKm={calculatedKm}
            startLocation={startLocation}
            endLocation={endLocation}
            onConfirm={handleConfirmDistance}
          />
        )}
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
        <div className="space-y-4">
          <FavoriteQuickSelect
            onSelect={(address) => setStartLocation(address)}
            selectedAddress={startLocation}
          />
          
          <div className="space-y-2">
            <Label htmlFor="start-location-begin">Startsted (valgfritt)</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                id="start-location-begin" 
                placeholder="F.eks. Hjemmeadresse" 
                value={startLocation} 
                onChange={e => setStartLocation(e.target.value)}
                className="pl-9"
              />
            </div>
            {currentLocation && !startLocation && (
              <p className="text-xs text-muted-foreground">
                Bruker din nåværende posisjon
              </p>
            )}
          </div>
          <Button onClick={handleStart} className="w-full bg-accent hover:bg-accent/90">
            Start nå
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};