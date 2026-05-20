import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate, relativeDate } from "@/lib/dates";
import { Check, X, ExternalLink, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected";

const TARGET_LABELS: Record<string, string> = {
  payer: "Payer",
  payer_rule: "Payer rule",
  denial_guide: "Denial guide",
};

export default function Suggestions() {
  const { isAdmin, loading, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<Status>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function review(s: any, status: Status) {
    const { error } = await supabase
      .from("suggestions")
      .update({
        status,
        admin_notes: notes[s.id] ?? s.admin_notes ?? null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.from("change_log").insert({
      entity_type: "suggestion",
      entity_id: s.id,
      entity_label: `${TARGET_LABELS[s.target_type]} — ${s.target_label}`,
      summary: status === "approved" ? "Approved suggestion" : "Rejected suggestion",
      author_name: user?.email ?? null,
    });
    toast.success(status === "approved" ? "Marked approved" : "Marked rejected");
    load();
  }

  async function remove(s: any) {
    if (!confirm("Delete this suggestion?")) return;
    const { error } = await supabase.from("suggestions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    load();
  }

  const filtered = items.filter((s) => s.status === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Suggestion queue</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review proposed updates submitted by users. Approving marks it done — apply the change in the relevant Admin or detail page.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({items.filter((i) => i.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No {tab} suggestions.
            </Card>
          )}
          {filtered.map((s) => (
            <Card key={s.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{TARGET_LABELS[s.target_type]}</Badge>
                  <span className="font-medium">{s.target_label}</span>
                  {s.target_type === "payer" && s.target_id && (
                    <Button asChild size="sm" variant="ghost" className="h-7">
                      <Link to={`/payers/${s.target_id}`}>Open <ExternalLink className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  )}
                  {s.target_type === "denial_guide" && (
                    <Button asChild size="sm" variant="ghost" className="h-7">
                      <Link to="/denials">Open <ExternalLink className="h-3 w-3 ml-1" /></Link>
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.submitter_email ?? "user"} · {relativeDate(s.created_at)}
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap border-l-2 border-primary/40 pl-3">{s.body}</p>

              {s.status === "pending" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Admin notes (optional)</Label>
                  <Textarea
                    rows={2}
                    placeholder="Notes for the record…"
                    value={notes[s.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review(s, "approved")}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(s, "rejected")}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => remove(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground border-t pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span>
                    {s.status === "approved" ? "Approved" : "Rejected"} {formatDate(s.reviewed_at)}
                    {s.admin_notes ? ` — ${s.admin_notes}` : ""}
                  </span>
                  <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
