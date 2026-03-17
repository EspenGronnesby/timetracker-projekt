import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Cloud, CloudRain, CloudSnow, CloudLightning, Sun, CloudSun, X, RefreshCw } from "lucide-react";
import { fetchWeatherData, WeatherForecast, getWeatherDescription } from "@/lib/weatherApi";
import { useToast } from "@/hooks/use-toast";

export const WeatherWidget = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setLoading(true);
    try {
      const data = await fetchWeatherData();
      setWeather(data);
    } catch (error) {
      console.error('Failed to load weather:', error);
      toast({
        title: "Kunne ikke laste vær",
        description: "Prøv igjen senere",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.show_weather_widget) {
    return null;
  }

  if (loading) {
    return (
      <Card className="mx-4 mb-4 p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-3 bg-muted rounded w-32" />
          </div>
        </div>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  const getWeatherIcon = (type: string) => {
    switch (type) {
      case 'sunny':
        return <Sun className="h-6 w-6 text-yellow-500" />;
      case 'partly-cloudy':
        return <CloudSun className="h-6 w-6 text-yellow-400" />;
      case 'cloudy':
        return <Cloud className="h-6 w-6 text-gray-400" />;
      case 'rain':
        return <CloudRain className="h-6 w-6 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="h-6 w-6 text-cyan-300" />;
      case 'storm':
        return <CloudLightning className="h-6 w-6 text-red-500" />;
      default:
        return <Cloud className="h-6 w-6 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'good':
        return 'text-green-500 border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
      case 'danger':
        return 'text-red-500 border-red-500/30 bg-red-500/10';
      default:
        return 'text-muted-foreground border-border bg-muted/10';
    }
  };

  const showTomorrowWarning = weather.tomorrow.severity !== 'good';

  return (
    <Card className="mx-4 mb-4 relative overflow-hidden">
      {/* Compact view */}
      {!expanded && (
        <div 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {getWeatherIcon(weather.current.weatherType)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">
                    {Math.round(weather.current.temperature)}°C
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getWeatherDescription(weather.current)}
                  </span>
                </div>
                {showTomorrowWarning && (
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    <span className="text-muted-foreground">
                      I morgen: {getWeatherDescription(weather.tomorrow)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <RefreshCw className="h-4 w-4" onClick={(e) => {
                e.stopPropagation();
                loadWeather();
              }} />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded view */}
      {expanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Værvarsel</h3>
            <Button variant="ghost" size="icon" onClick={() => setExpanded(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Current weather */}
          <div className={`p-4 rounded-lg border mb-3 ${getSeverityColor(weather.current.severity)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getWeatherIcon(weather.current.weatherType)}
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">I dag</p>
                <p className="text-2xl font-bold">{Math.round(weather.current.temperature)}°C</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {getWeatherDescription(weather.current)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
              <div>💧 Nedbør: {weather.current.precipitation.toFixed(1)} mm</div>
              <div>💨 Vind: {weather.current.windSpeed.toFixed(1)} m/s</div>
            </div>
          </div>

          {/* Tomorrow's weather */}
          <div className={`p-4 rounded-lg border ${getSeverityColor(weather.tomorrow.severity)}`}>
            <div className="flex items-center gap-3 mb-2">
              {getWeatherIcon(weather.tomorrow.weatherType)}
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">I morgen</p>
                <p className="text-2xl font-bold">{Math.round(weather.tomorrow.temperature)}°C</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {getWeatherDescription(weather.tomorrow)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-3">
              <div>💧 Nedbør: {weather.tomorrow.precipitation.toFixed(1)} mm</div>
              <div>💨 Vind: {weather.tomorrow.windSpeed.toFixed(1)} m/s</div>
            </div>
            {showTomorrowWarning && (
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  {weather.tomorrow.weatherType === 'rain' && 'Det er meldt regn i morgen. Husk regnklær!'}
                  {weather.tomorrow.weatherType === 'snow' && 'Det er meldt snø i morgen. Kjør forsiktig!'}
                  {weather.tomorrow.weatherType === 'storm' && 'Det er meldt storm i morgen. Vurder å utsette utendørsarbeid.'}
                  {weather.tomorrow.severity === 'danger' && weather.tomorrow.weatherType !== 'rain' && weather.tomorrow.weatherType !== 'snow' && weather.tomorrow.weatherType !== 'storm' && 'Værforholdene kan være utfordrende i morgen.'}
                </p>
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-3"
            onClick={loadWeather}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Oppdater værdata
          </Button>
        </div>
      )}
    </Card>
  );
};
