import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PdfViewer } from "@/components/PdfViewer";
import { CheckCircle2, FileText, AlertCircle, ExternalLink, ScrollText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Policies() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [acks, setAcks] = useState<Record<string, any>>({});
  const [forms, setForms] = useState<Record<string, { name: string; date: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const today = format(new Date(), "MM/dd/yyyy");

  async function load() {
    const [polRes, ackRes] = await Promise.all([
      supabase
        .from("policies")
        .select("*, training_articles(id,title,category)")
        .eq("published", true)
        .eq("archived", false)
        .order("published_at", { ascending: false }),
      user
        ? supabase.from("policy_acknowledgements").select("*").eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    setPolicies(polRes.data ?? []);
    const map: Record<string, any> = {};
    ((ackRes as any).data ?? []).forEach((a: any) => { map[a.policy_id] = a; });
    setAcks(map);
  }

  useEffect(() => { load(); }, [user?.id]);

  function setForm(policyId: string, field: "name" | "date", value: string) {
    setForms((f) => ({ ...f, [policyId]: { ...f[policyId], name: f[policyId]?.name ?? "", date: f[policyId]?.date ?? "", [field]: value } }));
  }

  async function acknowledge(policyId: string) {
    const form = forms[policyId];
    if (!form?.name?.trim()) { toast.error("Please type your full name."); return; }
    if (form.date?.trim() !== today) { toast.error(`Please enter today's date exactly as shown: ${today}`); return; }
    if (!user) return;
    setSubmitting(policyId);
    try {
      const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      const { error } = await supabase.from("policy_acknowledgements").insert({
        policy_id: policyId,
        user_id: user.id,
        user_email: user.email ?? null,
        user_display_name: profile?.display_name ?? null,
        signed_name: form.name.trim(),
        signed_at: new Date().toISOString(),
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Policy acknowledged and recorded.");
      load();
    } finally {
      setSubmitting(null);
    }
  }

  const pending = policies.filter((p) => !acks[p.id]);
  const signed  = policies.filter((p) => acks[p.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <ScrollText className="h-6 w-6 text-primary shrink-0 mt-1" />
        <div>
          <h1 className="text-2xl font-semibold">Policies</h1>
          <p className="text-sm text-muted-foreground">Review and acknowledge all company policies. Your signature is required on each one.</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="rounded-lg border border-warning/60 bg-warning/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">{pending.length} polic{pending.length === 1 ? "y requires" : "ies require"} your acknowledgement</p>
            <p className="text-xs text-muted-foreground mt-0.5">Read each policy in full, then type your name and today's date ({today}) to confirm.</p>
          </div>
        </div>
      )}

      {pending.map((pol) => (
        <Card key={pol.id} className="p-6 border-warning/40 space-y-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-base">{pol.title}</h2>
                <Badge className="bg-warning/20 text-warning border-warning/40 text-xs">Acknowledgement required</Badge>
              </div>
              {pol.published_at && (
                <p className="text-xs text-muted-foreground mt-0.5">Published {format(new Date(pol.published_at), "MMMM d, yyyy")}</p>
              )}
            </div>
          </div>

          {/* PDF viewer — all pages rendered inline */}
          {pol.pdf_url ? (
            <div className="rounded-md border bg-muted/10 p-3">
              <PdfViewer url={pol.pdf_url} />
            </div>
          ) : (
            <div className="border rounded-md p-4 bg-muted/20 max-h-[520px] overflow-y-auto">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: pol.body ?? "" }}
              />
            </div>
          )}

          {/* Notes section — shown below PDF when present */}
          {pol.pdf_url && pol.body?.trim() && (
            <div className="rounded-md border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-foreground/80">{pol.body}</p>
            </div>
          )}

          {pol.training_articles && (
            <Link
              to={`/training#${pol.training_articles.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              Related training: {pol.training_articles.category} — {pol.training_articles.title}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          <div className="border-t pt-5 space-y-3">
            <p className="text-sm font-semibold">Sign to acknowledge</p>
            <p className="text-xs text-muted-foreground">
              By completing this form you confirm you have read and understood this policy in full.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Your full name</label>
                <Input
                  placeholder="Type your full name"
                  value={forms[pol.id]?.name ?? ""}
                  onChange={(e) => setForm(pol.id, "name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Today's date (MM/DD/YYYY)</label>
                <Input
                  placeholder={today}
                  value={forms[pol.id]?.date ?? ""}
                  onChange={(e) => setForm(pol.id, "date", e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={() => acknowledge(pol.id)}
              disabled={submitting === pol.id}
              className="mt-1"
            >
              {submitting === pol.id ? "Submitting…" : "I have read and acknowledge this policy"}
            </Button>
          </div>
        </Card>
      ))}

      {/* Acknowledged policies */}
      {signed.length > 0 && (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Already acknowledged</span>
              <div className="flex-1 border-t" />
            </div>
          )}
          {signed.map((pol) => {
            const ack = acks[pol.id];
            return (
              <Card key={pol.id} className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-sm">{pol.title}</h2>
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Acknowledged</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Signed as <span className="font-medium">{ack.signed_name}</span> on{" "}
                      {format(new Date(ack.signed_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {policies.length === 0 && (
        <Card className="p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold">No active policies</p>
          <p className="text-sm text-muted-foreground mt-1">You're all caught up. Check back when new policies are published.</p>
        </Card>
      )}

      {policies.length > 0 && pending.length === 0 && (
        <Card className="p-5 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-green-800">All policies acknowledged</p>
              <p className="text-xs text-muted-foreground mt-0.5">You're fully compliant. You'll be notified when new policies are published.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
