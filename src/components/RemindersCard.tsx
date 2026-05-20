import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { relativeDate } from "@/lib/dates";

type Reminder = {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  created_at: string;
};

export function RemindersCard() {
  const { session } = useAuth();
  const [items, setItems] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("reminders")
      .select("id,title,due_at,completed,created_at")
      .order("completed", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) toast({ title: "Couldn't load reminders", description: error.message, variant: "destructive" });
    else setItems((data ?? []) as Reminder[]);
  };

  useEffect(() => {
    if (session) load();
  }, [session]);

  const add = async () => {
    if (!title.trim() || !session) return;
    setLoading(true);
    const { error } = await supabase.from("reminders").insert({
      user_id: session.user.id,
      title: title.trim(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    });
    setLoading(false);
    if (error) return toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
    setTitle("");
    setDueAt("");
    load();
  };

  const toggle = async (r: Reminder) => {
    const { error } = await supabase.from("reminders").update({ completed: !r.completed }).eq("id", r.id);
    if (error) return toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) return toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    load();
  };

  const isOverdue = (r: Reminder) => !r.completed && r.due_at && new Date(r.due_at) < new Date();

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Reminders
        </h2>
        <span className="text-xs text-muted-foreground">{items.filter(i => !i.completed).length} open</span>
      </div>

      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Add a reminder…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-[150px]"
        />
        <Button onClick={add} disabled={loading || !title.trim()} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="divide-y">
        {items.length === 0 && <p className="text-sm text-muted-foreground py-4">No reminders yet.</p>}
        {items.map((r) => (
          <div key={r.id} className="py-2.5 flex items-center gap-3">
            <Checkbox checked={r.completed} onCheckedChange={() => toggle(r)} />
            <div className="min-w-0 flex-1">
              <div className={`text-sm truncate ${r.completed ? "line-through text-muted-foreground" : ""}`}>
                {r.title}
              </div>
              {r.due_at && (
                <div className={`text-xs ${isOverdue(r) ? "text-warning font-medium" : "text-muted-foreground"}`}>
                  Due {relativeDate(r.due_at)}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
