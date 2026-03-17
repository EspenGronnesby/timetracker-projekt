/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RouteMapProps {
  polyline: string;
  startAddress: string;
  endAddress: string;
  distanceKm: number;
  durationMinutes: number;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

// Decode Google's encoded polyline
const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
};

export const RouteMap = ({
  polyline,
  startAddress,
  endAddress,
  distanceKm,
  durationMinutes,
  bounds
}: RouteMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const fullscreenMapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [fullscreenMap, setFullscreenMap] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not found");
      return;
    }

    if ((window as any).google?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => console.error("Failed to load Google Maps");
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it might be used elsewhere
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !polyline) return;

    const points = decodePolyline(polyline);
    if (points.length === 0) return;

    const g = (window as any).google;
    const mapInstance = new g.maps.Map(mapRef.current, {
      zoom: 12,
      center: points[0],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    // Draw route polyline
    new g.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstance
    });

    // Start marker
    new g.maps.Marker({
      position: points[0],
      map: mapInstance,
      icon: {
        path: g.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#22c55e",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
      },
      title: "Start"
    });

    // End marker
    new google.maps.Marker({
      position: points[points.length - 1],
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2
      },
      title: "Slutt"
    });

    // Fit bounds to show entire route
    const boundsObj = new google.maps.LatLngBounds();
    points.forEach(point => boundsObj.extend(point));
    mapInstance.fitBounds(boundsObj, 40);

    setMap(mapInstance);
  }, [isLoaded, polyline]);

  // Initialize fullscreen map
  useEffect(() => {
    if (!isLoaded || !fullscreenMapRef.current || !polyline || !isFullscreen) return;

    const points = decodePolyline(polyline);
    if (points.length === 0) return;

    const mapInstance = new google.maps.Map(fullscreenMapRef.current, {
      zoom: 12,
      center: points[0],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true
    });

    // Draw route polyline
    new google.maps.Polyline({
      path: points,
      geodesic: true,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 5,
      map: mapInstance
    });

    // Start marker with info
    const startMarker = new google.maps.Marker({
      position: points[0],
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#22c55e",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3
      },
      title: startAddress
    });

    const startInfo = new google.maps.InfoWindow({
      content: `<div class="p-2"><strong>Start:</strong><br/>${startAddress}</div>`
    });
    startMarker.addListener("click", () => startInfo.open(mapInstance, startMarker));

    // End marker with info
    const endMarker = new google.maps.Marker({
      position: points[points.length - 1],
      map: mapInstance,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ef4444",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3
      },
      title: endAddress
    });

    const endInfo = new google.maps.InfoWindow({
      content: `<div class="p-2"><strong>Slutt:</strong><br/>${endAddress}</div>`
    });
    endMarker.addListener("click", () => endInfo.open(mapInstance, endMarker));

    // Fit bounds
    const boundsObj = new google.maps.LatLngBounds();
    points.forEach(point => boundsObj.extend(point));
    mapInstance.fitBounds(boundsObj, 60);

    setFullscreenMap(mapInstance);
  }, [isLoaded, polyline, isFullscreen, startAddress, endAddress]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}t ${mins}min` : `${hours}t`;
  };

  if (!polyline) return null;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Map container */}
          <div className="relative">
            <div 
              ref={mapRef} 
              className="h-[180px] w-full bg-muted"
              style={{ minHeight: "180px" }}
            />
            
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="animate-pulse text-muted-foreground text-sm">
                  Laster kart...
                </div>
              </div>
            )}

            {/* Fullscreen button */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 bg-background/90 backdrop-blur-sm"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Route info */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                <span className="font-medium">{distanceKm} km</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(durationMinutes)}</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
                <span className="line-clamp-1">{startAddress}</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />
                <span className="line-clamp-1">{endAddress}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0">
          <DialogHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>Rutevisning</DialogTitle>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-primary" />
                  <span className="font-medium">{distanceKm} km</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(durationMinutes)}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div 
            ref={fullscreenMapRef} 
            className="flex-1 w-full"
            style={{ height: "calc(80vh - 80px)" }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
