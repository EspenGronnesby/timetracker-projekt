import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import { ProjectNoteItemDialog } from "@/components/ProjectNoteItemDialog";
import { useProjectNoteItems } from "@/hooks/useProjectNoteItems";

interface NewProjectNoteButtonProps {
  projectId: string;
  userId: string;
}

// Kompakt "Nytt notat"-knapp plassert i action-raden øverst i
// ProjectDetails (ved siden av Beregn pris). Åpner samme dialog som
// notatlisten bruker for opprettelse. React Query invalidering gjør at
// ProjectNoteList oppdateres automatisk etter lagring.
export function NewProjectNoteButton({ projectId, userId }: NewProjectNoteButtonProps) {
  const [open, setOpen] = useState(false);
  const { createItem } = useProjectNoteItems(projectId);

  const handleSave = async (input: { title: string; content: string }) => {
    await createItem.mutateAsync({ ...input, userId });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        aria-label="Nytt notat"
      >
        <FilePlus2 className="h-4 w-4" />
        <span className="hidden sm:inline">Nytt notat</span>
      </Button>
      <ProjectNoteItemDialog
        open={open}
        onOpenChange={setOpen}
        item={null}
        onSave={handleSave}
        saving={createItem.isPending}
      />
    </>
  );
}
