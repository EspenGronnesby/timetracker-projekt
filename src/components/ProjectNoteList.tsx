import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useProjectNoteItems, ProjectNoteItem } from "@/hooks/useProjectNoteItems";
import { ProjectNoteItemDialog } from "@/components/ProjectNoteItemDialog";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface ProjectNoteListProps {
  projectId: string;
  canEdit: boolean;
}

// Liste med separate titulerte notater per prosjekt (handleliste,
// kutt-dimensjoner, planlegging osv). Oppretting skjer via
// NewProjectNoteButton i action-raden øverst; denne komponenten viser
// eksisterende notater og håndterer redigering/sletting.
export function ProjectNoteList({ projectId, canEdit }: ProjectNoteListProps) {
  const { items, isLoading, updateItem, deleteItem } =
    useProjectNoteItems(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectNoteItem | null>(null);

  const openEdit = (item: ProjectNoteItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const handleSave = async (input: { title: string; content: string }) => {
    if (!editing) return;
    await updateItem.mutateAsync({ id: editing.id, ...input });
  };

  const handleDelete = async () => {
    if (!editing) return;
    await deleteItem.mutateAsync(editing.id);
  };

  const saving = updateItem.isPending || deleteItem.isPending;

  return (
    <Card className="p-3 sm:p-4 rounded-2xl">
      <div className="flex items-center mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-11 w-11 flex items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight truncate">
            Andre notater
          </h2>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Laster…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {canEdit
            ? "Ingen notater ennå. Bruk «Nytt notat»-knappen øverst for å lage handleliste, planlegging eller andre notater."
            : "Ingen notater"}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => (canEdit ? openEdit(item) : undefined)}
              disabled={!canEdit}
              className="w-full text-left p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-muted/30 active:scale-[0.99] transition-all duration-150 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default disabled:active:scale-100 disabled:hover:bg-card/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-tight truncate flex-1 min-w-0">
                  {item.title}
                </h3>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
                  {formatDistanceToNow(new Date(item.updated_at), {
                    locale: nb,
                    addSuffix: true,
                  })}
                </span>
              </div>
              {item.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {item.content}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <ProjectNoteItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        onSave={handleSave}
        onDelete={editing ? handleDelete : undefined}
        saving={saving}
      />
    </Card>
  );
}
