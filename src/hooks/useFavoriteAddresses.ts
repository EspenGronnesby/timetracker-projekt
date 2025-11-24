import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FavoriteAddress {
  id: string;
  user_id: string;
  name: string;
  address: string;
  category: 'home' | 'work' | 'store' | 'custom';
  icon: string;
  created_at: string;
  updated_at: string;
}

export const useFavoriteAddresses = () => {
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorite-addresses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorite_addresses')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as FavoriteAddress[];
    },
  });

  const addFavorite = useMutation({
    mutationFn: async (favorite: Omit<FavoriteAddress, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('favorite_addresses')
        .insert([{ ...favorite, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-addresses'] });
      toast.success("Favorittadresse lagret");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke lagre favoritt", {
        description: error.message
      });
    },
  });

  const updateFavorite = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FavoriteAddress> & { id: string }) => {
      const { data, error } = await supabase
        .from('favorite_addresses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-addresses'] });
      toast.success("Favoritt oppdatert");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke oppdatere favoritt", {
        description: error.message
      });
    },
  });

  const deleteFavorite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('favorite_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-addresses'] });
      toast.success("Favoritt slettet");
    },
    onError: (error: Error) => {
      toast.error("Kunne ikke slette favoritt", {
        description: error.message
      });
    },
  });

  return {
    favorites,
    isLoading,
    addFavorite: addFavorite.mutate,
    updateFavorite: updateFavorite.mutate,
    deleteFavorite: deleteFavorite.mutate,
    isAdding: addFavorite.isPending,
    isUpdating: updateFavorite.isPending,
    isDeleting: deleteFavorite.isPending,
  };
};
