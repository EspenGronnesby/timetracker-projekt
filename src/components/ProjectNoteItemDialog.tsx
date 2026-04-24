import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ProjectNoteItem } from "@/hooks/useProjectNoteItems";

interface ProjectNoteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = opprett ny, objekt = rediger eksisterende
  item: ProjectNoteItem | null;
  onSave: (input: { title: string; content: string }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  saving?: boolean;
}

// Dialog for opprettelse og redigering av et titulert prosjekt-notat.
// Samme komponent for begge modi — `item` er null ved opprettelse.
export function ProjectNoteItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
  saving,
}: ProjectNoteItemDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset state når dialog åpnes eller item skifter
  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setContent(item?.content ?? "");
      setError(null);
    }
  }, [open, item]);

  const isEditing = !!item;
  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    try {
      await onSave({ title: title.trim(), content });
      onOpenChange(false);
    } catch (e) {
      // Toasten fra onError i mutation er lett å gå glipp av — vis
      // feilen inline i dialogen også og behold innholdet så bruker
      // ikke må skrive på nytt.
      const message = e instanceof Error ? e.message : "Ukjent feil";
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Rediger notat" : "Nytt notat"}</DialogTitle>
          <DialogDescription>
            F.eks. handleliste, kutt-dimensjoner eller planlegging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="note-title">Tittel</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Handleliste"
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-content">Innhold</Label>
            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv noe…"
              className="min-h-[160px] resize-y text-sm leading-relaxed"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed min-w-0">
                <p className="font-semibold">Kunne ikke lagre</p>
                <p className="opacity-90 break-words">{error}</p>
                {error.includes("project_note_items") && (
                  <p className="mt-1 opacity-90">
                    DB-migreringen er sannsynligvis ikke kjørt. Be admin om å
                    kjøre <code className="px-1 rounded bg-destructive/20">supabase db push</code>.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2 sm:gap-0">
          {isEditing && onDelete ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30 gap-2">
                  <Trash2 className="h-4 w-4" />
                  Slett
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slette notat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette kan ikke angres.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await onDelete();
                      onOpenChange(false);
                    }}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Slett
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <div />
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {saving ? "Lagrer…" : isEditing ? "Lagre" : "Opprett"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
