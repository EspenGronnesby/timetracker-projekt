import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProjectNotesProps {
  projectId: string;
  initialNotes: string | null;
  canEdit: boolean;
}

// Prosjekt-notater med debounced autosave (800ms).
// Skriver til projects.notes som regenereres inn i projects_secure_member_view.
// Etter lagring invalideres ["projects"]-cache så andre visninger oppdateres.
export function ProjectNotes({ projectId, initialNotes, canEdit }: ProjectNotesProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<number | null>(null);
  const savedResetRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  // Holder siste ulagrede value så cleanup kan flushe den ved unmount.
  // Tidligere ble timer bare cleared — rask navigering tapte siste endring.
  const pendingRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  const save = useCallback(
    async (value: string) => {
      if (!mountedRef.current) return;
      setStatus("saving");
      const { error } = await supabase
        .from("projects")
        .update({ notes: value || null } as never)
        .eq("id", projectId);
      if (!mountedRef.current) return;
      if (error) {
        toast({
          variant: "destructive",
          title: "Kunne ikke lagre notat",
          description: error.message,
        });
        setStatus("idle");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (!mountedRef.current) return;
      setStatus("saved");
      if (savedResetRef.current) window.clearTimeout(savedResetRef.current);
      savedResetRef.current = window.setTimeout(() => {
        if (mountedRef.current) setStatus("idle");
      }, 1500);
    },
    [projectId, queryClient, toast]
  );

  const handleChange = (value: string) => {
    setNotes(value);
    pendingRef.current = value;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      pendingRef.current = null;
      save(value);
    }, 800);
  };

  // Hold save i ref så cleanup kan kalle seneste versjon uten å avhenge
  // av den i dep-arrayet (ville trigget re-kjøring av cleanup hver save).
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (savedResetRef.current) window.clearTimeout(savedResetRef.current);
      // Flush pending endring ved unmount — fire-and-forget. DB-kallet
      // fullfører i bakgrunnen selv om komponenten er borte; mountedRef-
      // sjekker inne i save() hindrer state-oppdateringer på unmounted.
      if (pendingRef.current !== null) {
        void saveRef.current(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, []);

  return (
    <Card className="p-3 sm:p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <StickyNote className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight truncate">
            Notater
          </h2>
        </div>
        <div
          className="text-xs text-muted-foreground flex items-center gap-1.5 flex-shrink-0"
          aria-live="polite"
        >
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Lagrer…</span>
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span>Lagret</span>
            </>
          )}
        </div>
      </div>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        disabled={!canEdit}
        placeholder={canEdit ? "Skriv notater for prosjektet…" : "Ingen notater"}
        className="min-h-[120px] resize-y text-sm leading-relaxed"
      />
      {!canEdit && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Kun prosjekteier kan redigere
        </p>
      )}
    </Card>
  );
}
