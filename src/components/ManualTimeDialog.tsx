import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ManualTimeDialogProps {
  type: "start" | "end";
  onSubmit: (datetime: Date, comment: string) => void;
  disabled?: boolean;
}

export const ManualTimeDialog = ({ type, onSubmit, disabled }: ManualTimeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    if (!comment.trim()) return;

    const [hours, minutes] = time.split(":").map(Number);
    const datetime = new Date(date);
    datetime.setHours(hours, minutes, 0, 0);

    onSubmit(datetime, comment);
    setOpen(false);
    setComment("");
    setDate(new Date());
    setTime(format(new Date(), "HH:mm"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          {type === "start" ? "Glemte å stemple inn" : "Glemte å stemple ut"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {type === "start" ? "Sett starttid" : "Sett sluttid"}
          </DialogTitle>
          <DialogDescription>
            {type === "start" 
              ? "Velg når du faktisk startet arbeidet. Timeren vil vise riktig tid fra dette tidspunktet."
              : "Velg når du avsluttet arbeidet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Dato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Velg dato</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Tid</Label>
            <input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">
              Kommentar <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Forklar hvorfor du endrer tidspunktet..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              En kommentar er påkrevd for å registrere endringen
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!comment.trim()}
          >
            Bekreft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
