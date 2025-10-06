import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Project = {
  id: string;
  name: string;
  color: string;
  customer_name: string;
  customer_address: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  contract_number: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  completed: boolean;
};

export type TimeEntry = {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  created_at: string;
};

export type DriveEntry = {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  start_time: string;
  end_time: string | null;
  kilometers: number | null;
  created_at: string;
};

export type Material = {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
};

interface CustomerInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  contractNumber: string;
  description: string;
}

export const useProjects = (userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!userId) return [];
      
      // Query projects where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);

      if (memberError) throw memberError;
      
      if (!memberships || memberships.length === 0) return [];
      
      const projectIds = memberships.map(m => m.project_id);
      
      // Use secure view that filters customer data based on role
      // Project owners see full customer info, members see "Customer" placeholder
      const { data, error } = await supabase
        .from("projects_member_view")
        .select("*")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
    enabled: !!userId,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["time_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!userId,
  });

  const { data: driveEntries = [] } = useQuery({
    queryKey: ["drive_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_entries")
        .select("*")
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as DriveEntry[];
    },
    enabled: !!userId,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Material[];
    },
    enabled: !!userId,
  });

  const addProject = useMutation({
    mutationFn: async ({
      name,
      color,
      customerInfo,
    }: {
      name: string;
      color: string;
      customerInfo: CustomerInfo;
    }) => {
      // CRITICAL: Refresh session to get a valid JWT for RLS
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !session) {
        console.error("Session refresh failed:", refreshError);
        throw new Error("Your session has expired. Please log in again.");
      }

      console.log("✅ Session refreshed, user:", session.user.id);

      // Use secure RPC to create project (bypasses client-side RLS pitfalls)
      const { data, error } = await supabase.rpc('create_project', {
        p_name: name,
        p_color: color,
        p_customer_name: customerInfo.name,
        p_customer_address: customerInfo.address,
        p_customer_phone: customerInfo.phone,
        p_customer_email: customerInfo.email,
        p_contract_number: customerInfo.contractNumber,
        p_description: customerInfo.description,
      });

      if (error) {
        console.error("❌ create_project failed:", error);
        throw error;
      }
      
      console.log("✅ Project created successfully:", data?.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Prosjekt opprettet!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke opprette prosjekt",
        description: error.message,
      });
    },
  });

  const toggleProject = useMutation({
    mutationFn: async ({
      projectId,
      userName,
    }: {
      projectId: string;
      userName: string;
    }) => {
      if (!userId) throw new Error("Must be logged in");

      const activeEntry = timeEntries.find(
        (entry) =>
          entry.project_id === projectId &&
          entry.user_id === userId &&
          !entry.end_time
      );

      if (activeEntry) {
        const endTime = new Date().toISOString();
        const startTime = new Date(activeEntry.start_time);
        const duration = Math.floor(
          (new Date(endTime).getTime() - startTime.getTime()) / 1000
        );

        const { error } = await supabase
          .from("time_entries")
          .update({
            end_time: endTime,
            duration_seconds: duration,
          })
          .eq("id", activeEntry.id);

        if (error) throw error;
        return { action: "stop", entryId: activeEntry.id };
      } else {
        const { error } = await supabase.from("time_entries").insert({
          project_id: projectId,
          user_id: userId,
          user_name: userName,
          start_time: new Date().toISOString(),
        });

        if (error) throw error;
        return { action: "start" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feil ved tidssporing",
        description: error.message,
      });
    },
  });

  const toggleDriving = useMutation({
    mutationFn: async ({
      projectId,
      userName,
      kilometers,
    }: {
      projectId: string;
      userName: string;
      kilometers?: number;
    }) => {
      if (!userId) throw new Error("Must be logged in");

      const activeDrive = driveEntries.find(
        (entry) =>
          entry.project_id === projectId &&
          entry.user_id === userId &&
          !entry.end_time
      );

      if (activeDrive) {
        const { error } = await supabase
          .from("drive_entries")
          .update({
            end_time: new Date().toISOString(),
            kilometers: kilometers || null,
          })
          .eq("id", activeDrive.id);

        if (error) throw error;
        return { action: "stop" };
      } else {
        const { error } = await supabase.from("drive_entries").insert({
          project_id: projectId,
          user_id: userId,
          user_name: userName,
          start_time: new Date().toISOString(),
        });

        if (error) throw error;
        return { action: "start" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive_entries"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feil ved kjøresporing",
        description: error.message,
      });
    },
  });

  const addMaterial = useMutation({
    mutationFn: async ({
      projectId,
      userName,
      name,
      quantity,
      unitPrice,
    }: {
      projectId: string;
      userName: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }) => {
      if (!userId) throw new Error("Must be logged in");

      const { error } = await supabase.from("materials").insert({
        project_id: projectId,
        user_id: userId,
        user_name: userName,
        name,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Materiale lagt til!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke legge til materiale",
        description: error.message,
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["drive_entries"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Prosjekt slettet!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette prosjekt",
        description: error.message,
      });
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async (projectId: string) => {
      const { data: project } = await supabase
        .from("projects")
        .select("completed")
        .eq("id", projectId)
        .single();

      const { error } = await supabase
        .from("projects")
        .update({ completed: !project?.completed })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Prosjektstatus oppdatert!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke oppdatere prosjekt",
        description: error.message,
      });
    },
  });

  return {
    projects,
    timeEntries,
    driveEntries,
    materials,
    isLoading,
    addProject: addProject.mutate,
    toggleProject: toggleProject.mutate,
    toggleDriving: toggleDriving.mutate,
    addMaterial: addMaterial.mutate,
    deleteProject: deleteProject.mutate,
    toggleComplete: toggleComplete.mutate,
  };
};
