import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useFavoriteAddresses, FavoriteAddress } from "@/hooks/useFavoriteAddresses";
import { Settings } from "lucide-react";
import { useState } from "react";
import { FavoriteAddressManager } from "./FavoriteAddressManager";

interface FavoriteQuickSelectProps {
  onSelect: (address: string) => void;
  selectedAddress?: string;
}

export const FavoriteQuickSelect = ({ onSelect, selectedAddress }: FavoriteQuickSelectProps) => {
  const { favorites, isLoading } = useFavoriteAddresses();
  const [showManager, setShowManager] = useState(false);

  if (isLoading) {
    return (
      <div className="flex gap-2 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  const displayFavorites = favorites.slice(0, 6);

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Favoritter</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowManager(true)}
            className="h-8 gap-1 text-xs"
          >
            <Settings className="h-3 w-3" />
            Administrer
          </Button>
        </div>
        
        {favorites.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            Ingen favoritter ennå. Klikk "Administrer" for å legge til.
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {displayFavorites.map((favorite: FavoriteAddress) => (
                <Button
                  key={favorite.id}
                  type="button"
                  variant={selectedAddress === favorite.address ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelect(favorite.address)}
                  className="whitespace-nowrap"
                >
                  <span className="mr-1">{favorite.icon}</span>
                  {favorite.name}
                </Button>
              ))}
              {favorites.length > 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManager(true)}
                  className="whitespace-nowrap"
                >
                  +{favorites.length - 6} flere
                </Button>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      <FavoriteAddressManager
        open={showManager}
        onOpenChange={setShowManager}
      />
    </>
  );
};
