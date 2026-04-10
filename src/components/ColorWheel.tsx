import { useState, useEffect, useRef } from "react";
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
  const [selectedTheme, setSelectedTheme] = useState<ColorTheme | null>(null);
  const wheelRef = useRef<SVGSVGElement>(null);
  const segmentAngle = 360 / themes.length;

  // SVG path generator for wheel segments (pizza slices)
  const createSegmentPath = (index: number, radius: number) => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    
    const x1 = radius + radius * Math.cos(startAngle);
    const y1 = radius + radius * Math.sin(startAngle);
    const x2 = radius + radius * Math.cos(endAngle);
    const y2 = radius + radius * Math.sin(endAngle);
    
    const largeArc = segmentAngle > 180 ? 1 : 0;
    
    return `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  useEffect(() => {
    if (isSpinning) {
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      const targetIndex = themes.findIndex(t => t.value === randomTheme.value);

      // Beregn rotasjon slik at valgt segment ender under pekeren (toppen)
      const currentNormalized = ((rotation % 360) + 360) % 360;
      const targetAngleAtTop = -(targetIndex * segmentAngle) - (segmentAngle / 2);
      const deltaToTarget = targetAngleAtTop - currentNormalized;
      const finalRotation = rotation + 360 * 5 + deltaToTarget;

      setRotation(finalRotation);
      setSelectedTheme(randomTheme.value);
    }
  }, [isSpinning]);

  const handleTransitionEnd = () => {
    if (isSpinning && selectedTheme) {
      onThemeSelect(selectedTheme);
      setSelectedTheme(null);
    }
  };

  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 mx-auto">
      {/* Statisk peker på toppen */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-30">
        <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] border-t-primary drop-shadow-lg" />
      </div>
      
      {/* SVG Wheel */}
      <svg
        ref={wheelRef}
        viewBox="0 0 200 200"
        className="w-full h-full drop-shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Wheel segments */}
        {themes.map((theme, index) => {
          const midAngle = (index * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
          const textRadius = 65;
          const textX = 100 + textRadius * Math.cos(midAngle);
          const textY = 100 + textRadius * Math.sin(midAngle);
          const textRotation = index * segmentAngle + segmentAngle / 2;
          
          return (
            <g key={theme.value}>
              {/* Segment path */}
              <path
                d={createSegmentPath(index, 95)}
                fill={theme.color}
                stroke="hsl(var(--background))"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => !isSpinning && onThemeSelect(theme.value)}
              />
              
              {/* Text label */}
              <text
                x={textX}
                y={textY}
                fill="white"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                className="pointer-events-none"
                style={{ mixBlendMode: 'difference' }}
              >
                {theme.label}
              </text>
            </g>
          );
        })}
        
        {/* Center circle */}
        <circle cx="100" cy="100" r="15" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="3" />
      </svg>
    </div>
  );
}
