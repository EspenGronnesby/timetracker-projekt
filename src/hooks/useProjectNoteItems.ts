import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ProjectNoteItem = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

// CRUD for project_note_items — separate titulerte notater per prosjekt
// (handleliste, kutt-dimensjoner, planlegging osv).
export const useProjectNoteItems = (projectId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["project_note_items", projectId],
    queryFn: async (): Promise<ProjectNoteItem[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_note_items" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectNoteItem[];
    },
    enabled: !!projectId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["project_note_items", projectId] });

  const createItem = useMutation({
    mutationFn: async (input: { title: string; content: string; userId: string }) => {
      if (!projectId) throw new Error("Mangler prosjekt-ID");
      const { data, error } = await supabase
        .from("project_note_items" as never)
        .insert({
          project_id: projectId,
          user_id: input.userId,
          title: input.title,
          content: input.content || null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectNoteItem;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke opprette notat",
        description: error.message,
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async (input: { id: string; title: string; content: string }) => {
      const { data, error } = await supabase
        .from("project_note_items" as never)
        .update({
          title: input.title,
          content: input.content || null,
        } as never)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectNoteItem;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre notat",
        description: error.message,
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_note_items" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette notat",
        description: error.message,
      });
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
};
