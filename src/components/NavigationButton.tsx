import { useState } from "react";
import { MapPin, Navigation, ExternalLink, Locate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FavoriteQuickSelect } from "@/components/FavoriteQuickSelect";
import { toast } from "sonner";

export const NavigationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [startAddress, setStartAddress] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolokasjon støttes ikke av nettleseren din");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setUseCurrentLocation(true);
        setIsGettingLocation(false);
        toast.success("Posisjon funnet!");
      },
      (error) => {
        setIsGettingLocation(false);
        toast.error("Kunne ikke hente posisjon: " + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenGoogleMaps = () => {
    if (!destination.trim()) return;

    const encodedDestination = encodeURIComponent(destination);
    let googleMapsUrl: string;

    if (useCurrentLocation && currentCoords) {
      // Use current GPS coordinates as origin
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${encodedDestination}`;
    } else if (!useCurrentLocation && startAddress.trim()) {
      // Use manual start address
      const encodedStart = encodeURIComponent(startAddress);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedStart}&destination=${encodedDestination}`;
    } else {
      // No origin, just destination
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    }

    window.open(googleMapsUrl, "_blank");
    setIsOpen(false);
    setDestination("");
    setStartAddress("");
  };

  const handleSelectFavorite = (address: string) => {
    setDestination(address);
  };

  const handleSelectStartFavorite = (address: string) => {
    setStartAddress(address);
    setUseCurrentLocation(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="flex items-center gap-2 hover:border-primary/50 hover:bg-primary/10 transition-all"
        >
          <Navigation className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Naviger til adresse
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Start location section */}
          <div className="space-y-2">
            <Label>Fra</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useCurrentLocation ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUseCurrentLocation(true);
                  if (!currentCoords) {
                    getCurrentLocation();
                  }
                }}
                disabled={isGettingLocation}
                className="gap-2"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Locate className="h-4 w-4" />
                )}
                Min posisjon
              </Button>
              <Button
                type="button"
                variant={!useCurrentLocation ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCurrentLocation(false)}
              >
                Annen adresse
              </Button>
            </div>
            
            {useCurrentLocation && currentCoords && (
              <p className="text-sm text-muted-foreground">
                📍 Posisjon hentet ({currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)})
              </p>
            )}
            
            {!useCurrentLocation && (
              <div className="space-y-2">
                <Input
                  placeholder="Skriv inn startadresse..."
                  value={startAddress}
                  onChange={(e) => setStartAddress(e.target.value)}
                />
                <FavoriteQuickSelect onSelect={handleSelectStartFavorite} />
              </div>
            )}
          </div>

          {/* Destination section */}
          <div className="space-y-2">
            <Label htmlFor="destination">Til</Label>
            <Input
              id="destination"
              placeholder="Skriv inn destinasjon..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOpenGoogleMaps();
                }
              }}
            />
            <FavoriteQuickSelect onSelect={handleSelectFavorite} />
          </div>

          <Button
            onClick={handleOpenGoogleMaps}
            disabled={!destination.trim()}
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Åpne i Google Maps
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
