import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Clock } from "lucide-react";

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

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}t ${mins}min` : `${hours}t`;
};

export const RouteMap = ({
  startAddress,
  endAddress,
  distanceKm,
  durationMinutes,
}: RouteMapProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
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

        <div className="text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1 shrink-0" />
            <div>
              <span className="font-medium text-foreground">Fra:</span>{" "}
              <span>{startAddress}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-foreground">Til:</span>{" "}
              <span>{endAddress}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
