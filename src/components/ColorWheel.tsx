import { useState, useEffect } from "react";
import { ColorTheme } from "@/hooks/useColorTheme";

const themes: { value: ColorTheme; label: string; color: string }[] = [
  { value: 'light', label: 'Lys', color: 'hsl(180, 5%, 95%)' },
  { value: 'dark', label: 'Mørk', color: 'hsl(180, 15%, 8%)' },
  { value: 'high-contrast-dark', label: 'Høy kontrast', color: 'hsl(180, 25%, 4%)' },
  { value: 'ocean', label: 'Ocean', color: 'hsl(220, 35%, 12%)' },
  { value: 'forest', label: 'Skog', color: 'hsl(150, 30%, 10%)' },
  { value: 'sunset', label: 'Solnedgang', color: 'hsl(280, 25%, 10%)' },
];

interface ColorWheelProps {
  onThemeSelect: (theme: ColorTheme) => void;
  currentTheme: ColorTheme;
  isSpinning: boolean;
}

export function ColorWheel({ onThemeSelect, currentTheme, isSpinning }: ColorWheelProps) {
  const [rotation, setRotation] = useState(0);
  const segmentAngle = 360 / themes.length;

  useEffect(() => {
    if (isSpinning) {
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const targetIndex = themes.findIndex(t => t.value === randomTheme.value);
      const targetRotation = rotation + 360 * 5 + (targetIndex * segmentAngle);
      
      setRotation(targetRotation);
      
      setTimeout(() => {
        onThemeSelect(randomTheme.value);
      }, 3000);
    }
  }, [isSpinning]);

  return (
    <div className="relative w-48 h-48 mx-auto">
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary border-4 border-background z-20 shadow-lg" />
      
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-30">
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary" />
      </div>
      
      {/* Wheel */}
      <div 
        className="absolute inset-0 rounded-full shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
      >
        {themes.map((theme, index) => {
          const angle = (index * segmentAngle) - 90;
          const isActive = theme.value === currentTheme && !isSpinning;
          
          return (
            <button
              key={theme.value}
              onClick={() => !isSpinning && onThemeSelect(theme.value)}
              disabled={isSpinning}
              className="absolute top-1/2 left-1/2 origin-left cursor-pointer hover:scale-105 transition-transform disabled:cursor-not-allowed"
              style={{
                transform: `rotate(${angle}deg) translateX(0)`,
                width: '96px',
                height: `${segmentAngle}deg`,
              }}
            >
              <div 
                className={`h-24 rounded-r-full flex items-center justify-end pr-4 border-2 ${
                  isActive ? 'border-primary' : 'border-border/50'
                }`}
                style={{ 
                  backgroundColor: theme.color,
                  clipPath: `polygon(0 0, 100% ${50 - (segmentAngle/4)}%, 100% ${50 + (segmentAngle/4)}%, 0 100%)`,
                }}
              >
                <span className="text-xs font-medium text-foreground/80 mix-blend-difference">
                  {theme.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
