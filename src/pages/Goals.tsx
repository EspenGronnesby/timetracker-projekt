import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  Loader2,
  CheckSquare,
  ShoppingCart,
  FileText,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isPast, isToday } from "date-fns";
import { nb } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type GoalList = Database["public"]["Tables"]["goal_lists"]["Row"];
type GoalTask = Database["public"]["Tables"]["goal_tasks"]["Row"];
type ListType = "checklist" | "shopping" | "note";

const LIST_TYPES: { value: ListType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "checklist",
    label: "Sjekkliste",
    icon: <CheckSquare className="h-4 w-4" />,
    description: "Oppgaver med avkryssing",
  },
  {
    value: "shopping",
    label: "Handleliste",
    icon: <ShoppingCart className="h-4 w-4" />,
    description: "Ting som skal kjøpes",
  },
  {
    value: "note",
    label: "Notat",
    icon: <FileText className="h-4 w-4" />,
    description: "Fritekst og huskelapper",
  },
];

function getListTypeConfig(type: string) {
  return LIST_TYPES.find((t) => t.value === type) ?? LIST_TYPES[0];
}

export default function Goals() {
  const { user, loading: authLoading } = useAuth();
  const [lists, setLists] = useState<GoalList[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingList, setEditingList] = useState<{ id: string; name: string } | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; name: string } | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isAddListDialogOpen, setIsAddListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState<ListType>("checklist");
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [taskDeadlines, setTaskDeadlines] = useState<{ [inputId: string]: Date | undefined }>({});
  const [noteContents, setNoteContents] = useState<{ [listId: string]: string }>({});
  const taskInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const tasksChannel = supabase
      .channel("goal_tasks_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_tasks", filter: `user_id=eq.${user.id}` }, () => {
        fetchTasks().then((data) => setTasks(data || []));
      })
      .subscribe();

    const listsChannel = supabase
      .channel("goal_lists_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_lists", filter: `user_id=eq.${user.id}` }, () => {
        fetchLists().then((data) => setLists(data || []));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(listsChannel);
    };
  }, [user]);

  useEffect(() => {
    if (activeListId && taskInputRefs.current[activeListId]) {
      taskInputRefs.current[activeListId]?.focus();
    }
  }, [activeListId]);

  // Initialiser note-innhold fra tasks
  useEffect(() => {
    const notes: { [listId: string]: string } = {};
    lists.forEach((list) => {
      if (list.type === "note") {
        const listTasks = tasks.filter((t) => t.list_id === list.id);
        notes[list.id] = listTasks.map((t) => t.name).join("\n");
      }
    });
    setNoteContents(notes);
  }, [lists, tasks]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listsData, tasksData] = await Promise.all([fetchLists(), fetchTasks()]);
      setLists(listsData || []);
      setTasks(tasksData || []);
    } catch {
      toast.error("Kunne ikke laste data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    const { data, error } = await supabase.from("goal_lists").select("*").order("order_index", { ascending: true });
    if (error) throw error;
    return data;
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase.from("goal_tasks").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || !user) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("goal_lists").insert({
        name: newListName.trim(),
        order_index: lists.length,
        user_id: user.id,
        type: newListType,
      });
      if (error) throw error;
      toast.success("Liste opprettet!");
      setNewListName("");
      setNewListType("checklist");
      setIsAddListDialogOpen(false);
      setLists(await fetchLists() || []);
    } catch {
      toast.error("Kunne ikke opprette liste");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateList = async (id: string) => {
    if (!editingList || !editingList.name.trim()) { setEditingList(null); return; }
    try {
      const { error } = await supabase.from("goal_lists").update({ name: editingList.name.trim() }).eq("id", id);
      if (error) throw error;
      toast.success("Liste oppdatert!");
      setLists(lists.map((l) => (l.id === id ? { ...l, name: editingList.name.trim() } : l)));
      setEditingList(null);
    } catch {
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
    } catch {
      toast.error("Kunne ikke slette liste");
    }
  };

  const handleCreateTask = async (listId: string, name: string, deadline?: Date) => {
    if (!name.trim() || !user) return;
    try {
      const { error } = await supabase.from("goal_tasks").insert({
        name: name.trim(),
        list_id: listId,
        user_id: user.id,
        deadline: deadline ? deadline.toISOString() : null,
      });
      if (error) throw error;
      setTasks(await fetchTasks() || []);
    } catch {
      toast.error("Kunne ikke opprette oppgave");
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase.from("goal_tasks").update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      }).eq("id", taskId);
      if (error) throw error;
      setTasks(tasks.map((t) => t.id === taskId ? { ...t, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null } : t));
    } catch {
      toast.error("Kunne ikke oppdatere oppgave");
    }
  };

  const handleUpdateTask = async (id: string) => {
    if (!editingTask || !editingTask.name.trim()) { setEditingTask(null); return; }
    try {
      const { error } = await supabase.from("goal_tasks").update({ name: editingTask.name.trim() }).eq("id", id);
      if (error) throw error;
      setTasks(tasks.map((t) => (t.id === id ? { ...t, name: editingTask.name.trim() } : t)));
      setEditingTask(null);
    } catch {
      toast.error("Kunne ikke oppdatere oppgave");
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from("goal_tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== id));
    } catch {
      toast.error("Kunne ikke slette oppgave");
    }
  };

  const handleSaveNote = async (listId: string, content: string) => {
    if (!user) return;
    try {
      // Slett eksisterende tasks for denne listen og lagre nytt innhold som én task
      await supabase.from("goal_tasks").delete().eq("list_id", listId);
      if (content.trim()) {
        // Lagre hvert linjeskift som separat task
        const lines = content.split("\n").filter((l) => l.trim());
        if (lines.length > 0) {
          await supabase.from("goal_tasks").insert(
            lines.map((line) => ({ name: line.trim(), list_id: listId, user_id: user.id }))
          );
        }
      }
      setTasks(await fetchTasks() || []);
    } catch {
      toast.error("Kunne ikke lagre notat");
    }
  };

  const getListTasks = (listId: string) => tasks.filter((t) => t.list_id === listId);

  const calculateProgress = (listId: string) => {
    const listTasks = getListTasks(listId);
    if (listTasks.length === 0) return 0;
    return (listTasks.filter((t) => t.is_completed).length / listTasks.length) * 100;
  };

  if (loading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground leading-snug">Lister, notater og huskelapper</p>
        <Button
          onClick={() => setIsAddListDialogOpen(true)}
          size="icon"
          variant="outline"
          aria-label="Legg til liste"
          className="h-11 w-11 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-primary/10"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card className="p-12 text-center max-w-md mx-auto rounded-2xl">
          <p className="text-muted-foreground mb-4 leading-snug">Ingen lister ennå</p>
          <Button
            onClick={() => setIsAddListDialogOpen(true)}
            className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="mr-2 h-4 w-4" />
            Opprett din første liste
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {lists.map((list) => {
            const typeConfig = getListTypeConfig(list.type);
            const listTasks = getListTasks(list.id);
            const isNote = list.type === "note";

            return (
              <Card key={list.id} className="rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-150">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-muted-foreground flex-shrink-0">{typeConfig.icon}</span>
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
                        className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors duration-150 truncate tracking-tight"
                      >
                        {list.name}
                      </h3>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Liste-handlinger"
                        className="h-10 w-10 flex-shrink-0 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingList({ id: list.id, name: list.name })}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Gi nytt navn
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleteListId(list.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Slett liste
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Fremdrift (ikke for notater) */}
                {!isNote && listTasks.length > 0 && (
                  <Progress value={calculateProgress(list.id)} className="mb-4 h-1.5" />
                )}

                {/* Notat-type: textarea */}
                {isNote ? (
                  <textarea
                    className="w-full min-h-[120px] bg-muted/50 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 border-0 transition-colors duration-150 leading-snug"
                    placeholder="Skriv notatet her..."
                    value={noteContents[list.id] ?? ""}
                    onChange={(e) => setNoteContents({ ...noteContents, [list.id]: e.target.value })}
                    onBlur={(e) => handleSaveNote(list.id, e.target.value)}
                  />
                ) : (
                  <>
                    {/* Oppgaveliste */}
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {listTasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2">
                          <Checkbox
                            checked={task.is_completed}
                            onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                            className="mt-0.5 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            {editingTask?.id === task.id ? (
                              <Input
                                value={editingTask.name}
                                onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                onBlur={() => handleUpdateTask(task.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdateTask(task.id);
                                  if (e.key === "Escape") setEditingTask(null);
                                }}
                                autoFocus
                              />
                            ) : (
                              <div>
                                <span
                                  onClick={() => setEditingTask({ id: task.id, name: task.name })}
                                  className={cn(
                                    "cursor-pointer hover:text-primary transition-colors duration-150 text-sm block leading-snug",
                                    task.is_completed && "line-through text-muted-foreground"
                                  )}
                                >
                                  {task.name}
                                </span>
                                {task.deadline && (
                                  <span className={cn(
                                    "text-xs flex items-center gap-1 mt-0.5",
                                    isPast(new Date(task.deadline)) && !task.is_completed
                                      ? "text-destructive"
                                      : isToday(new Date(task.deadline))
                                      ? "text-orange-500"
                                      : "text-muted-foreground"
                                  )}>
                                    <CalendarIcon className="h-3 w-3" />
                                    {format(new Date(task.deadline), "d. MMM", { locale: nb })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTask(task.id)}
                            aria-label="Slett notat"
                            className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Legg til oppgave */}
                    <TaskInput
                      listId={list.id}
                      inputRef={(el) => (taskInputRefs.current[list.id] = el)}
                      onFocus={() => setActiveListId(list.id)}
                      onAdd={(name, deadline) => handleCreateTask(list.id, name, deadline)}
                    />
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Ny liste */}
      <Dialog open={isAddListDialogOpen} onOpenChange={setIsAddListDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight">Ny liste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Velg type */}
            <div className="grid grid-cols-3 gap-2">
              {LIST_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNewListType(type.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors duration-150 text-sm active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    newListType === type.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {type.icon}
                  <span className="font-medium leading-snug">{type.label}</span>
                </button>
              ))}
            </div>
            <Input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Navn på listen..."
              onKeyDown={(e) => { if (e.key === "Enter" && newListName.trim()) handleCreateList(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleCreateList}
              disabled={!newListName.trim() || isSubmitting}
              className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opprett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slett-bekreftelse */}
      <AlertDialog open={!!deleteListId} onOpenChange={() => setDeleteListId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="tracking-tight">Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription className="leading-snug">
              Dette vil slette listen og alt innholdet. Kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteListId && handleDeleteList(deleteListId)}
              className="h-10 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Separat komponent for oppgave-input med valgfri frist
interface TaskInputProps {
  listId: string;
  inputRef: (el: HTMLInputElement | null) => void;
  onFocus: () => void;
  onAdd: (name: string, deadline?: Date) => void;
}

function TaskInput({ inputRef, onFocus, onAdd }: TaskInputProps) {
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value.trim(), deadline);
    setValue("");
    setDeadline(undefined);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        placeholder="Legg til oppgave..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={onFocus}
        onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        className="flex-1 text-sm leading-snug"
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={deadline ? "Endre frist" : "Sett frist"}
            className={cn(
              "h-9 w-9 flex-shrink-0 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              deadline && "text-primary"
            )}
            title="Sett frist"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl" align="end">
          <Calendar
            mode="single"
            selected={deadline}
            onSelect={(date) => { setDeadline(date); setCalendarOpen(false); }}
            initialFocus
            locale={nb}
          />
          {deadline && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-9 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => setDeadline(undefined)}
              >
                Fjern frist
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {value.trim() && (
        <Button
          size="icon"
          aria-label="Legg til notat"
          className="h-9 w-9 flex-shrink-0 transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
