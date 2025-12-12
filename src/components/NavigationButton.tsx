import { useState, useRef } from "react";
import { MapPin, Navigation, ExternalLink, Locate, Loader2, Copy, Check } from "lucide-react";
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
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

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

  const generateGoogleMapsUrl = () => {
    if (!destination.trim()) return;

    const encodedDestination = encodeURIComponent(destination);
    let googleMapsUrl: string;

    if (useCurrentLocation && currentCoords) {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentCoords.lat},${currentCoords.lng}&destination=${encodedDestination}`;
    } else if (!useCurrentLocation && startAddress.trim()) {
      const encodedStart = encodeURIComponent(startAddress);
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedStart}&destination=${encodedDestination}`;
    } else {
      googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    }

    setGeneratedUrl(googleMapsUrl);
  };

  const handleCopyUrl = async () => {
    if (!generatedUrl) return;
    
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      toast.success("Lenke kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Kunne ikke kopiere lenke");
    }
  };

  const handleSelectFavorite = (address: string) => {
    setDestination(address);
    setGeneratedUrl(null);
  };

  const handleSelectStartFavorite = (address: string) => {
    setStartAddress(address);
    setUseCurrentLocation(false);
    setGeneratedUrl(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setDestination("");
    setStartAddress("");
    setGeneratedUrl(null);
    setCopied(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
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
                  setGeneratedUrl(null);
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
                onClick={() => {
                  setUseCurrentLocation(false);
                  setGeneratedUrl(null);
                }}
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
                  onChange={(e) => {
                    setStartAddress(e.target.value);
                    setGeneratedUrl(null);
                  }}
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
              onChange={(e) => {
                setDestination(e.target.value);
                setGeneratedUrl(null);
              }}
            />
            <FavoriteQuickSelect onSelect={handleSelectFavorite} />
          </div>

          {!generatedUrl ? (
            <Button
              onClick={generateGoogleMapsUrl}
              disabled={!destination.trim()}
              className="w-full gap-2"
            >
              <Navigation className="h-4 w-4" />
              Generer navigasjonslenke
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Google Maps-lenke:</p>
                <div className="flex gap-2">
                  <a
                    ref={linkRef}
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-primary underline break-all hover:text-primary/80"
                  >
                    Åpne i Google Maps
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setGeneratedUrl(null)}
                className="w-full"
              >
                Ny søk
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
