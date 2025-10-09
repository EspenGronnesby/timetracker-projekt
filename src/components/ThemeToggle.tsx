import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useColorTheme, ColorTheme } from "@/hooks/useColorTheme";

const themes: { value: ColorTheme; label: string; preview: string }[] = [
  { value: 'light', label: 'Lys', preview: 'bg-background border-2 border-border' },
  { value: 'dark', label: 'Mørk', preview: 'bg-[hsl(180,15%,8%)] border-2 border-[hsl(180,10%,20%)]' },
  { value: 'high-contrast-dark', label: 'Høy kontrast (sollys)', preview: 'bg-[hsl(180,25%,4%)] border-2 border-[hsl(180,15%,25%)]' },
  { value: 'ocean', label: 'Ocean blå', preview: 'bg-[hsl(220,35%,12%)] border-2 border-[hsl(195,85%,55%)]' },
  { value: 'forest', label: 'Skog grønn', preview: 'bg-[hsl(150,30%,10%)] border-2 border-[hsl(142,76%,50%)]' },
  { value: 'sunset', label: 'Solnedgang lilla', preview: 'bg-[hsl(280,25%,10%)] border-2 border-[hsl(280,65%,60%)]' },
];

export function ThemeToggle() {
  const { currentTheme, setColorTheme } = useColorTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 hover:border-accent-secondary/50 hover:bg-accent-secondary/10 transition-all"
        >
          <Palette className="h-4 w-4" />
          <span className="sr-only">Velg fargetema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.value}
            onClick={() => setColorTheme(theme.value)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={`w-6 h-6 rounded ${theme.preview}`} />
            <span className={currentTheme === theme.value ? 'font-semibold' : ''}>
              {theme.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
