import { useState, useRef } from "react";
import { MapPin, Navigation, Copy, Check, Share2 } from "lucide-react";
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
  const [startAddress, setStartAddress] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const generateGoogleMapsUrl = () => {
    if (!destination.trim()) return;

    const encodedDestination = encodeURIComponent(destination.trim());
    let googleMapsUrl: string;

    if (startAddress.trim()) {
      const encodedStart = encodeURIComponent(startAddress.trim());
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

  const handleShareUrl = async () => {
    if (!generatedUrl) return;

    const shareData = {
      title: `Veibeskrivelse til ${destination}`,
      text: startAddress 
        ? `Navigasjon fra ${startAddress} til ${destination}`
        : `Navigasjon til ${destination}`,
      url: generatedUrl,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Delt!");
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error("Kunne ikke dele");
        }
      }
    } else {
      // Fallback: copy to clipboard
      handleCopyUrl();
    }
  };

  const handleSelectFavorite = (address: string) => {
    setDestination(address);
    setGeneratedUrl(null);
  };

  const handleSelectStartFavorite = (address: string) => {
    setStartAddress(address);
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
            <Label>Fra (valgfritt)</Label>
            <Input
              placeholder="La stå tom for å bruke din posisjon..."
              value={startAddress}
              onChange={(e) => {
                setStartAddress(e.target.value);
                setGeneratedUrl(null);
              }}
            />
            <FavoriteQuickSelect onSelect={handleSelectStartFavorite} />
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
              <div className="p-3 bg-muted rounded-lg space-y-3">
                <p className="text-sm text-muted-foreground">Google Maps-lenke:</p>
                
                <a
                  ref={linkRef}
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-primary underline break-all hover:text-primary/80"
                >
                  Åpne i Google Maps
                </a>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareUrl}
                    className="flex-1 gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Del til mobil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    Kopier
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
