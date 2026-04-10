import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFavoriteAddresses, FavoriteAddress } from "@/hooks/useFavoriteAddresses";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FavoriteAddressManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ICON_OPTIONS = [
  { value: '🏠', label: 'Hjem' },
  { value: '🏢', label: 'Kontor' },
  { value: '🏗️', label: 'Byggeplass' },
  { value: '🏪', label: 'Butikk' },
  { value: '⛽', label: 'Bensinstasjon' },
  { value: '📍', label: 'Annet' },
];

const CATEGORY_OPTIONS = [
  { value: 'home', label: 'Hjem' },
  { value: 'work', label: 'Arbeid' },
  { value: 'store', label: 'Butikk' },
  { value: 'custom', label: 'Annet' },
];

export const FavoriteAddressManager = ({ open, onOpenChange }: FavoriteAddressManagerProps) => {
  const { favorites, addFavorite, updateFavorite, deleteFavorite, isAdding, isUpdating, isDeleting } = useFavoriteAddresses();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    category: 'custom' as 'home' | 'work' | 'store' | 'custom',
    icon: '📍',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      category: 'custom',
      icon: '📍',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.address) return;

    if (editingId) {
      updateFavorite({ id: editingId, ...formData });
      resetForm();
    } else {
      addFavorite(formData);
      resetForm();
    }
  };

  const handleEdit = (favorite: FavoriteAddress) => {
    setFormData({
      name: favorite.name,
      address: favorite.address,
      category: favorite.category,
      icon: favorite.icon,
    });
    setEditingId(favorite.id);
    setShowAddForm(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteFavorite(deleteId);
      setDeleteId(null);
    }
  };

  const filteredFavorites = favorites.filter((fav: FavoriteAddress) =>
    fav.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fav.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Administrer favorittadresser</DialogTitle>
            <DialogDescription>
              Lagre ofte brukte adresser for raskere kjøreregistrering
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk i favoritter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Add/Edit Form */}
            {showAddForm ? (
              <form onSubmit={handleSubmit} className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {editingId ? 'Rediger favoritt' : 'Legg til ny favoritt'}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                  >
                    Avbryt
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Navn</Label>
                    <Input
                      id="name"
                      placeholder="F.eks. Hjemmeadresse"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    placeholder="F.eks. Karl Johans gate 1, Oslo"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Ikon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger id="icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((icon) => (
                        <SelectItem key={icon.value} value={icon.value}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{icon.value}</span>
                            {icon.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isAdding || isUpdating}>
                  {editingId ? 'Oppdater' : 'Legg til'}
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Legg til ny favoritt
              </Button>
            )}

            {/* Favorites List */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {filteredFavorites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'Ingen favoritter matcher søket' : 'Ingen favoritter ennå'}
                  </div>
                ) : (
                  filteredFavorites.map((favorite: FavoriteAddress) => (
                    <div
                      key={favorite.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-2xl">{favorite.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{favorite.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {favorite.address}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(favorite)}
                          disabled={isUpdating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(favorite.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett favoritt?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette denne favorittadressen? Dette kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
