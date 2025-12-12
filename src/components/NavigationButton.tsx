import { useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
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

export const NavigationButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [destination, setDestination] = useState("");

  const handleOpenGoogleMaps = () => {
    if (!destination.trim()) return;
    
    // Open Google Maps with the destination
    const encodedDestination = encodeURIComponent(destination);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`;
    window.open(googleMapsUrl, "_blank");
    setIsOpen(false);
    setDestination("");
  };

  const handleSelectFavorite = (address: string) => {
    setDestination(address);
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
          <div className="space-y-2">
            <Label htmlFor="destination">Destinasjon</Label>
            <Input
              id="destination"
              placeholder="Skriv inn adresse..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOpenGoogleMaps();
                }
              }}
            />
          </div>

          <FavoriteQuickSelect onSelect={handleSelectFavorite} />

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
