import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SELF_PROJECT_NAME } from "@/lib/projectConstants";

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
  notes: string | null;
  is_simple_project: boolean;
  created_by: string;
  created_at: string;
  completed: boolean;
  hide_customer_info: boolean;
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
  comment: string | null;
  is_manual: boolean;
  paused_at: string | null;
  // Fase 5a: Overtid (krever SQL-migrering)
  is_overtime?: boolean | null;
  overtime_rate?: number | null; // 50 eller 100
  comp_method?: "money" | "avspasering" | null;
};

export type PauseType = "general" | "breakfast" | "lunch";

export type TimeEntryPause = {
  id: string;
  time_entry_id: string;
  paused_at: string;
  resumed_at: string | null;
  pause_type: PauseType;
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
  start_location: string | null;
  end_location: string | null;
  route_data: Record<string, unknown> | null;
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
  hideCustomerInfo?: boolean;
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
      // Project owners see full customer info, members see NULL for sensitive fields
      const { data, error } = await supabase
        .from("projects_secure_member_view")
        .select("*")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(project => ({
        ...project,
        hide_customer_info: (project as { hide_customer_info?: boolean }).hide_customer_info ?? false,
        notes: (project as { notes?: string | null }).notes ?? null,
        is_simple_project: (project as { is_simple_project?: boolean }).is_simple_project ?? false,
      })) as Project[];
    },
    enabled: !!userId,
  });

  const projectIds = projects.map((p) => p.id);

  const { data: timeEntries = [] } = useQuery({
    queryKey: ["time_entries", projectIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .in("project_id", projectIds)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as TimeEntry[];
    },
    enabled: !!userId && projectIds.length > 0,
  });

  const { data: driveEntries = [] } = useQuery({
    queryKey: ["drive_entries", projectIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_entries")
        .select("*")
        .in("project_id", projectIds)
        .order("start_time", { ascending: false });

      if (error) throw error;
      return data as DriveEntry[];
    },
    enabled: !!userId && projectIds.length > 0,
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials", projectIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Material[];
    },
    enabled: !!userId && projectIds.length > 0,
  });

  // Hent pause-rader for ALLE viste tidsregistreringer (ikke bare aktive).
  // Ferdige timer trenger også pausehistorikk for korrekt visning av
  // pausetotaler i DayOverviewCard og SimpleTimer.
  //
  // Fix: tidligere `map → filter(!e.end_time) → map` på samme array ga
  // array av `undefined` fordi andre `.map` kalte `.id` på strings, så
  // pause-query returnerte alltid tomt. Main hadde en mellomløsning som
  // kun ga aktive entries — men da forsvinner pausehistorikk for dagens
  // ferdige entries. Riktig er ALLE.
  const allTimeEntryIds = useMemo(
    () => timeEntries.map((e) => e.id),
    [timeEntries]
  );

  const { data: timeEntryPauses = [] } = useQuery({
    queryKey: ["time_entry_pauses", allTimeEntryIds],
    queryFn: async () => {
      if (allTimeEntryIds.length === 0) return [];
      const { data, error } = await supabase
        .from("time_entry_pauses")
        .select("*")
        .in("time_entry_id", allTimeEntryIds)
        .order("paused_at", { ascending: false });

      if (error) throw error;
      return data as TimeEntryPause[];
    },
    enabled: !!userId && allTimeEntryIds.length > 0,
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
        p_hide_customer_info: customerInfo.hideCustomerInfo || false,
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

  // Hjelpefunksjon: beregn total pausetid for en tidsoppføring
  const calculatePausedSeconds = async (timeEntryId: string): Promise<number> => {
    const { data: pauses, error } = await supabase
      .from("time_entry_pauses")
      .select("*")
      .eq("time_entry_id", timeEntryId);

    if (error || !pauses) return 0;

    return pauses.reduce((total, pause) => {
      const pauseStart = new Date(pause.paused_at).getTime();
      const pauseEnd = pause.resumed_at
        ? new Date(pause.resumed_at).getTime()
        : Date.now(); // Hvis fortsatt pauset, regn til nå
      return total + Math.floor((pauseEnd - pauseStart) / 1000);
    }, 0);
  };

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
        // STOPP: Hvis timeren er pauset, avslutt pausen først
        if (activeEntry.paused_at) {
          const now = new Date().toISOString();
          await supabase
            .from("time_entry_pauses")
            .update({ resumed_at: now })
            .eq("time_entry_id", activeEntry.id)
            .is("resumed_at", null);
        }

        const endTime = new Date().toISOString();
        const startTime = new Date(activeEntry.start_time);
        const totalElapsed = Math.floor(
          (new Date(endTime).getTime() - startTime.getTime()) / 1000
        );

        // Trekk fra total pausetid
        const pausedSeconds = await calculatePausedSeconds(activeEntry.id);
        const duration = Math.max(0, totalElapsed - pausedSeconds);

        const { error } = await supabase
          .from("time_entries")
          .update({
            end_time: endTime,
            duration_seconds: duration,
            paused_at: null,
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
      queryClient.invalidateQueries({ queryKey: ["time_entry_pauses"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feil ved tidssporing",
        description: error.message,
      });
    },
  });

  const pauseTimer = useMutation({
    mutationFn: async ({ projectId, pauseType = "general" }: { projectId: string; pauseType?: "general" | "breakfast" | "lunch" }) => {
      if (!userId) throw new Error("Must be logged in");

      const activeEntry = timeEntries.find(
        (entry) =>
          entry.project_id === projectId &&
          entry.user_id === userId &&
          !entry.end_time &&
          !entry.paused_at
      );

      if (!activeEntry) throw new Error("Ingen aktiv timer å pause");

      const now = new Date().toISOString();

      // Opprett pause-oppføring med type
      const { error: pauseError } = await supabase
        .from("time_entry_pauses")
        .insert({
          time_entry_id: activeEntry.id,
          paused_at: now,
          pause_type: pauseType,
        });

      if (pauseError) throw pauseError;

      // Marker tidsoppføringen som pauset
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ paused_at: now })
        .eq("id", activeEntry.id);

      if (updateError) throw updateError;

      return { action: "pause", entryId: activeEntry.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entry_pauses"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feil ved pause",
        description: error.message,
      });
    },
  });

  const resumeTimer = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      if (!userId) throw new Error("Must be logged in");

      const pausedEntry = timeEntries.find(
        (entry) =>
          entry.project_id === projectId &&
          entry.user_id === userId &&
          !entry.end_time &&
          entry.paused_at
      );

      if (!pausedEntry) throw new Error("Ingen pauset timer å gjenoppta");

      const now = new Date().toISOString();

      // Avslutt den aktive pausen
      const { error: pauseError } = await supabase
        .from("time_entry_pauses")
        .update({ resumed_at: now })
        .eq("time_entry_id", pausedEntry.id)
        .is("resumed_at", null);

      if (pauseError) throw pauseError;

      // Fjern paused_at fra tidsoppføringen
      const { error: updateError } = await supabase
        .from("time_entries")
        .update({ paused_at: null })
        .eq("id", pausedEntry.id);

      if (updateError) throw updateError;

      return { action: "resume", entryId: pausedEntry.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["time_entry_pauses"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Feil ved gjenopptakelse",
        description: error.message,
      });
    },
  });

  const toggleDriving = useMutation({
    mutationFn: async ({
      projectId,
      userName,
      kilometers,
      startLocation,
      endLocation,
      routeData,
    }: {
      projectId: string;
      userName: string;
      kilometers?: number;
      startLocation?: string | { lat: number; lng: number } | null;
      endLocation?: string | null;
      routeData?: Record<string, unknown> | null;
    }) => {
      if (!userId) throw new Error("Must be logged in");

      const activeDrive = driveEntries.find(
        (entry) =>
          entry.project_id === projectId &&
          entry.user_id === userId &&
          !entry.end_time
      );

      if (activeDrive) {
        const startLoc = typeof startLocation === "object" && startLocation !== null
          ? JSON.stringify(startLocation)
          : (startLocation as string | null | undefined) ?? null;
        const endLoc = typeof endLocation === "object" && endLocation !== null
          ? JSON.stringify(endLocation)
          : (endLocation as string | null | undefined) ?? null;

        const { error } = await supabase
          .from("drive_entries")
          .update({
            end_time: new Date().toISOString(),
            kilometers: kilometers || null,
            start_location: startLoc,
            end_location: endLoc,
            route_data: routeData ? JSON.parse(JSON.stringify(routeData)) : null,
          })
          .eq("id", activeDrive.id);

        if (error) throw error;
        return { action: "stop" };
      } else {
        const startLoc = typeof startLocation === "object" && startLocation !== null
          ? JSON.stringify(startLocation)
          : (startLocation as string | null | undefined) ?? null;

        const { error } = await supabase.from("drive_entries").insert({
          project_id: projectId,
          user_id: userId,
          user_name: userName,
          start_time: new Date().toISOString(),
          start_location: startLoc,
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

  const updateTimeEntry = useMutation({
    mutationFn: async ({
      entryId,
      startTime,
      endTime,
      comment,
    }: {
      entryId: string;
      startTime: string;
      endTime: string;
      comment?: string;
    }) => {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const duration = Math.floor((end.getTime() - start.getTime()) / 1000);

      // Trekk fra pauser
      const pausedSeconds = await calculatePausedSeconds(entryId);
      const adjustedDuration = Math.max(0, duration - pausedSeconds);

      const updateData: Record<string, unknown> = {
        start_time: startTime,
        end_time: endTime,
        duration_seconds: adjustedDuration,
      };
      if (comment !== undefined) {
        updateData.comment = comment;
      }

      const { error } = await supabase
        .from("time_entries")
        .update(updateData)
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast({ title: "Tidsregistrering oppdatert!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke oppdatere tidsregistrering",
        description: error.message,
      });
    },
  });

  const updateDriveEntry = useMutation({
    mutationFn: async ({
      entryId,
      kilometers,
      comment,
    }: {
      entryId: string;
      kilometers: number;
      comment?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        kilometers,
      };
      // Lagre kommentar i route_data (enkleste uten ny kolonne)
      if (comment !== undefined) {
        const { data: existing } = await supabase
          .from("drive_entries")
          .select("route_data")
          .eq("id", entryId)
          .single();

        updateData.route_data = {
          ...(existing?.route_data as Record<string, unknown> || {}),
          edit_comment: comment,
          edited_at: new Date().toISOString(),
        };
      }

      const { error } = await supabase
        .from("drive_entries")
        .update(updateData)
        .eq("id", entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive_entries"] });
      toast({ title: "Kjøreregistrering oppdatert!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke oppdatere kjøreregistrering",
        description: error.message,
      });
    },
  });

  const updateMaterial = useMutation({
    mutationFn: async ({
      materialId,
      name,
      quantity,
      unitPrice,
    }: {
      materialId: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }) => {
      const { error } = await supabase
        .from("materials")
        .update({
          name,
          quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice,
        })
        .eq("id", materialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Materiale oppdatert!" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke oppdatere materiale",
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

  // ───────────────────────────────────────────────────────────
  // Fase 4: Papirark-modus
  // ───────────────────────────────────────────────────────────

  /**
   * Finn eller opprett brukerens personlige "Eget arbeid"-prosjekt.
   * Brukes av papirark-modus når bruker registrerer timer uten å velge prosjekt.
   * Konstant navn: "Eget arbeid". Skjult kundeinfo.
   */
  const getOrCreateSelfProject = async (): Promise<string> => {
    if (!userId) throw new Error("Må være innlogget");

    const existing = projects.find((p) => p.name === SELF_PROJECT_NAME);
    if (existing) return existing.id;

    // Refresh session for å sikre gyldig JWT mot RLS
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !session) {
      throw new Error("Sesjonen er utløpt. Logg inn på nytt.");
    }

    const { data, error } = await supabase.rpc("create_project", {
      p_name: SELF_PROJECT_NAME,
      p_color: "#6b7280",
      p_customer_name: "—",
      p_customer_address: "",
      p_customer_phone: "",
      p_customer_email: "",
      p_contract_number: "",
      p_description: "Auto-opprettet av appen for manuelle timer uten prosjekt.",
      p_hide_customer_info: true,
    });

    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
    return (data as { id: string }).id;
  };

  /**
   * Lagre én manuell tidsoppføring (papirark-modus).
   * Hvis projectId mangler, opprettes/brukes "Eget arbeid"-prosjektet automatisk.
   */
  const addManualTimeEntry = useMutation({
    mutationFn: async ({
      projectId,
      userName,
      startTime,
      endTime,
      comment,
      isOvertime,
      overtimeRate,
      compMethod,
    }: {
      projectId: string | null;
      userName: string;
      startTime: Date;
      endTime: Date;
      comment?: string;
      isOvertime?: boolean;
      overtimeRate?: number | null;
      compMethod?: "money" | "avspasering" | null;
    }) => {
      if (!userId) throw new Error("Må være innlogget");

      const targetProjectId = projectId || (await getOrCreateSelfProject());

      const durationSec = Math.max(
        0,
        Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
      );

      const { error } = await supabase.from("time_entries").insert({
        project_id: targetProjectId,
        user_id: userId,
        user_name: userName,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: durationSec,
        is_manual: true,
        comment: comment || null,
        is_overtime: isOvertime ?? false,
        overtime_rate: overtimeRate ?? null,
        comp_method: compMethod ?? null,
      });

      if (error) throw error;
      return { projectId: targetProjectId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Timer lagt til" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre timer",
        description: error.message,
      });
    },
  });

  // Fase 5a: Slett en tidsregistrering (for \u00e5 fikse feiltastinger)
  const deleteTimeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time_entries"] });
      toast({ title: "Tidsregistrering slettet" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
        description: error.message,
      });
    },
  });

  // Slett en kj\u00f8reregistrering
  const deleteDriveEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("drive_entries")
        .delete()
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drive_entries"] });
      toast({ title: "Kj\u00f8reregistrering slettet" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
        description: error.message,
      });
    },
  });

  // Slett et materiale
  const deleteMaterial = useMutation({
    mutationFn: async (materialId: string) => {
      const { error } = await supabase
        .from("materials")
        .delete()
        .eq("id", materialId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast({ title: "Materiale slettet" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
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
    timeEntryPauses,
    isLoading,
    addProject: addProject.mutate,
    toggleProject: toggleProject.mutate,
    pauseTimer: pauseTimer.mutate,
    resumeTimer: resumeTimer.mutate,
    toggleDriving: toggleDriving.mutate,
    addMaterial: addMaterial.mutate,
    updateTimeEntry: updateTimeEntry.mutate,
    updateDriveEntry: updateDriveEntry.mutate,
    updateMaterial: updateMaterial.mutate,
    deleteProject: deleteProject.mutate,
    toggleComplete: toggleComplete.mutate,
    // Fase 4: Papirark-modus
    addManualTimeEntry: addManualTimeEntry.mutate,
    addManualTimeEntryAsync: addManualTimeEntry.mutateAsync,
    // Fase 5a: Slett tidsregistrering
    deleteTimeEntry: deleteTimeEntry.mutate,
    deleteTimeEntryAsync: deleteTimeEntry.mutateAsync,
    deleteDriveEntry: deleteDriveEntry.mutate,
    deleteDriveEntryAsync: deleteDriveEntry.mutateAsync,
    deleteMaterial: deleteMaterial.mutate,
    deleteMaterialAsync: deleteMaterial.mutateAsync,
  };
};
