import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useColorTheme, ColorTheme } from "@/hooks/useColorTheme";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { currentTheme, setColorTheme, recentThemes } = useColorTheme();
  const [alternateTheme, setAlternateTheme] = useState<ColorTheme>('dark');

  useEffect(() => {
    // Set alternate theme to the other recent theme, or default to dark
    const otherTheme = recentThemes.find(t => t !== currentTheme) || 'dark';
    setAlternateTheme(otherTheme);
  }, [currentTheme, recentThemes]);

  const handleToggle = () => {
    setColorTheme(alternateTheme);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="flex items-center gap-2 hover:border-accent-secondary/50 hover:bg-accent-secondary/10 transition-all"
    >
      <Palette className="h-4 w-4" />
      <span className="sr-only">Bytt fargetema</span>
    </Button>
  );
}
