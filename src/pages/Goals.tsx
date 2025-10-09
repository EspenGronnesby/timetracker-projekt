import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit2, MoreHorizontal, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type GoalList = Database["public"]["Tables"]["goal_lists"]["Row"];
type GoalTask = Database["public"]["Tables"]["goal_tasks"]["Row"];

export default function Goals() {
  const navigate = useNavigate();
  const [lists, setLists] = useState<GoalList[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; name: string } | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isAddListDialogOpen, setIsAddListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const taskInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeListId && taskInputRefs.current[activeListId]) {
      taskInputRefs.current[activeListId]?.focus();
    }
  }, [activeListId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listsData, tasksData] = await Promise.all([fetchLists(), fetchTasks()]);
      setLists(listsData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Kunne ikke laste data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    const { data, error } = await supabase
      .from("goal_lists")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) throw error;
    return data;
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("goal_tasks")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("goal_lists").insert({
        name: newListName.trim(),
        order_index: lists.length,
      });

      if (error) throw error;

      toast.success("Liste opprettet!");
      setNewListName("");
      setIsAddListDialogOpen(false);
      await fetchLists();
    } catch (error) {
      console.error("Error creating list:", error);
      toast.error("Kunne ikke opprette liste");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateList = async (id: string) => {
    if (!editingList || !editingList.name.trim()) {
      setEditingList(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("goal_lists")
        .update({ name: editingList.name.trim() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Liste oppdatert!");
      setLists(lists.map((l) => (l.id === id ? { ...l, name: editingList.name.trim() } : l)));
      setEditingList(null);
    } catch (error) {
      console.error("Error updating list:", error);
      toast.error("Kunne ikke oppdatere liste");
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      const { error } = await supabase.from("goal_lists").delete().eq("id", id);

      if (error) throw error;

      toast.success("Liste slettet!");
      setDeleteListId(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting list:", error);
      toast.error("Kunne ikke slette liste");
    }
  };

  const handleCreateTask = async (listId: string, name: string) => {
    if (!name.trim()) return;

    try {
      const { error } = await supabase.from("goal_tasks").insert({
        name: name.trim(),
        list_id: listId,
      });

      if (error) throw error;

      await fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Kunne ikke opprette oppgave");
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from("goal_tasks")
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(
        tasks.map((t) =>
          t.id === taskId
            ? { ...t, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
            : t
        )
      );
    } catch (error) {
      console.error("Error toggling task:", error);
      toast.error("Kunne ikke oppdatere oppgave");
    }
  };

  const handleUpdateTask = async (id: string) => {
    if (!editingTask || !editingTask.name.trim()) {
      setEditingTask(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("goal_tasks")
        .update({ name: editingTask.name.trim() })
        .eq("id", id);

      if (error) throw error;

      toast.success("Oppgave oppdatert!");
      setTasks(tasks.map((t) => (t.id === id ? { ...t, name: editingTask.name.trim() } : t)));
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Kunne ikke oppdatere oppgave");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("goal_tasks").delete().eq("id", id);

      if (error) throw error;

      toast.success("Oppgave slettet!");
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Kunne ikke slette oppgave");
    }
  };

  const getListTasks = (listId: string) => {
    return tasks.filter((t) => t.list_id === listId);
  };

  const calculateProgress = (listId: string) => {
    const listTasks = getListTasks(listId);
    if (listTasks.length === 0) return 0;
    const completedTasks = listTasks.filter((t) => t.is_completed).length;
    return (completedTasks / listTasks.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-card via-primary/5 to-card border-b border-border py-2 sm:py-3 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Daily Goals
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Organiser dine daglige mål og oppgaver</p>
            </div>
          </div>
          <Button 
            onClick={() => setIsAddListDialogOpen(true)}
            size="icon"
            variant="outline"
            className="hover:bg-primary/10"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-0 py-8 max-w-7xl mx-auto">

      {lists.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto">
          <p className="text-muted-foreground mb-4">Ingen lister ennå</p>
          <Button onClick={() => setIsAddListDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Opprett din første liste
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
          {lists.map((list) => (
            <Card key={list.id} className="rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                {editingList?.id === list.id ? (
                  <Input
                    value={editingList.name}
                    onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                    onBlur={() => handleUpdateList(list.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateList(list.id);
                      if (e.key === "Escape") setEditingList(null);
                    }}
                    autoFocus
                    className="flex-1"
                  />
                ) : (
                  <h3
                    onClick={() => setEditingList({ id: list.id, name: list.name })}
                    className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors flex-1"
                  >
                    {list.name}
                  </h3>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingList({ id: list.id, name: list.name })}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteListId(list.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Progress value={calculateProgress(list.id)} className="mb-4" />

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4 scroll-smooth">
                {getListTasks(list.id).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 group">
                    <Checkbox checked={task.is_completed} onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)} />
                    {editingTask?.id === task.id ? (
                      <Input
                        value={editingTask.name}
                        onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                        onBlur={() => handleUpdateTask(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdateTask(task.id);
                          if (e.key === "Escape") setEditingTask(null);
                        }}
                        className="flex-1"
                        autoFocus
                      />
                    ) : (
                      <span
                        onClick={() => setEditingTask({ id: task.id, name: task.name })}
                        className={cn(
                          "flex-1 cursor-pointer hover:text-primary transition-colors",
                          task.is_completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.name}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  ref={(el) => (taskInputRefs.current[list.id] = el)}
                  placeholder="Legg til oppgave..."
                  onFocus={() => setActiveListId(list.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      handleCreateTask(list.id, e.currentTarget.value);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddListDialogOpen} onOpenChange={setIsAddListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ny liste</DialogTitle>
          </DialogHeader>
          <Input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Liste navn..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && newListName.trim()) {
                handleCreateList();
              }
            }}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleCreateList} disabled={!newListName.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette listen og alle oppgavene i den. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteListId && handleDeleteList(deleteListId)}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </main>
    </div>
  );
}
