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
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, relativeDate } from "@/lib/dates";
import { Check, X, Trash2, Inbox, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Status = "pending" | "approved" | "rejected";

export default function PayerRequests() {
  const { isAdmin, loading, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<Status>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase
      .from("payer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <Navigate to="/" replace />;

  async function toggleTraumasoft(r: any, v: boolean) {
    const { error } = await supabase.from("payer_requests").update({ added_to_traumasoft: v }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function approve(r: any) {
    // Create the payer
    const { data: payer, error: e1 } = await supabase.from("payers").insert({
      name: r.insurance_name,
      payer_type: "Other",
      claims_address: r.claims_address,
      electronic_payer_id: r.electronic_payer_id ?? null,
      internal_notes: [
        r.phone ? `Phone: ${r.phone}` : null,
        r.fax ? `Fax: ${r.fax}` : null,
        r.run_number ? `Run #: ${r.run_number}` : null,
      ].filter(Boolean).join("\n") || null,
    }).select().single();
    if (e1) return toast.error(e1.message);

    const { error: e2 } = await supabase.from("payer_requests").update({
      status: "approved",
      admin_notes: notes[r.id] ?? r.admin_notes ?? null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      created_payer_id: payer.id,
    }).eq("id", r.id);
    if (e2) return toast.error(e2.message);

    await supabase.from("change_log").insert({
      entity_type: "payer",
      entity_id: payer.id,
      entity_label: payer.name,
      summary: "Created payer from request",
      author_name: user?.email ?? null,
    });
    toast.success("Payer created");
    load();
  }

  async function reject(r: any) {
    const { error } = await supabase.from("payer_requests").update({
      status: "rejected",
      admin_notes: notes[r.id] ?? r.admin_notes ?? null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Marked rejected");
    load();
  }

  async function remove(r: any) {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase.from("payer_requests").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  const filtered = items.filter((r) => r.status === tab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New payer requests</h1>
        <p className="text-sm text-muted-foreground mt-1">
          User-submitted requests for new payers. Approving creates the payer in the directory.
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
              No {tab} requests.
            </Card>
          )}
          {filtered.map((r) => (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Payer request</Badge>
                  <span className="font-medium">{r.insurance_name}</span>
                  <Badge variant="outline">Run #{r.run_number}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.submitter_email ?? "user"} · {relativeDate(r.created_at)}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Claims address</div>
                  <div className="whitespace-pre-wrap">{r.claims_address}</div>
                </div>
                <div className="space-y-1">
                  {r.phone && <div><span className="text-xs text-muted-foreground">Phone: </span>{r.phone}</div>}
                  {r.fax && <div><span className="text-xs text-muted-foreground">Fax: </span>{r.fax}</div>}
                  {r.electronic_payer_id && <div><span className="text-xs text-muted-foreground">EDI ID: </span>{r.electronic_payer_id}</div>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`ts-${r.id}`}
                  checked={r.added_to_traumasoft}
                  onCheckedChange={(v) => toggleTraumasoft(r, !!v)}
                />
                <Label htmlFor={`ts-${r.id}`} className="cursor-pointer">Added to Traumasoft</Label>
              </div>

              {r.status === "pending" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Admin notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(r)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve & create payer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(r)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground border-t pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span>
                    {r.status === "approved" ? "Approved" : "Rejected"} {formatDate(r.reviewed_at)}
                    {r.admin_notes ? ` — ${r.admin_notes}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.created_payer_id && (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/payers/${r.created_payer_id}`}>Open payer <ExternalLink className="h-3 w-3 ml-1" /></Link>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
