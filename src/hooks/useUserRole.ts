import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'user';

export const useUserRole = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole | null;
    },
    enabled: !!userId,
  });
};

export const useIsAdmin = (userId: string | undefined) => {
  const { data: role } = useUserRole(userId);
  return role === 'admin';
};
