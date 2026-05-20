import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { needsReview, formatDate, relativeDate } from "@/lib/dates";
import { AlertCircle, ArrowLeft, ExternalLink, Calendar, FileText, ShieldCheck, ClipboardList, MapPin, Send, Hash, Plus, Pencil, Trash2, FilePlus, Layers, Accessibility, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import SuggestEditDialog from "@/components/SuggestEditDialog";

export default function PayerDetail() {
  const { id } = useParams();
  const { isStaff, isAdmin, user } = useAuth();
  const [payer, setPayer] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [trainingTitles, setTrainingTitles] = useState<Record<string, string>>({});

  async function loadRules() {
    if (!id) return;
    const { data } = await supabase.from("payer_rules").select("*").eq("payer_id", id).eq("archived", false).order("category");
    setRules(data ?? []);
  }

  useEffect(() => {
    if (!id) return;
    supabase.from("payers").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      setPayer(data);
      if (data) {
        const ids = [data.prior_auth_training_id, data.wc_claim_training_id, data.wc_denial_training_id, data.medical_records_training_id, data.secondary_claims_training_id].filter(Boolean) as string[];
        if (ids.length) {
          const { data: arts } = await supabase.from("training_articles").select("id,title").in("id", ids);
          const map: Record<string, string> = {};
          (arts ?? []).forEach((a: any) => { map[a.id] = a.title; });
          setTrainingTitles(map);
        } else {
          setTrainingTitles({});
        }
      }
    });
    loadRules();
  }, [id]);


  async function saveRule(r: any) {
    if (!r.title || !r.body) return toast.error("Title and body are required");
    const isNew = !r.id;
    const payload: any = {
      payer_id: id,
      title: r.title,
      category: r.category || null,
      body: r.body,
      last_reviewed_at: r.last_reviewed_at ?? new Date().toISOString(),
    };
    const { data, error } = isNew
      ? await supabase.from("payer_rules").insert(payload).select().single()
      : await supabase.from("payer_rules").update(payload).eq("id", r.id).select().single();
    if (error) return toast.error(error.message);
    await supabase.from("change_log").insert({
      entity_type: "rule",
      entity_id: data.id,
      entity_label: `${payer.name} — ${data.title}`,
      summary: isNew ? "Created rule" : "Updated rule",
      author_name: user?.email ?? null,
    });
    toast.success("Saved");
    setEditing(null);
    loadRules();
  }

  async function deleteRule(r: any) {
    if (!confirm(`Delete rule "${r.title}"?`)) return;
    const { error } = await supabase.from("payer_rules").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await supabase.from("change_log").insert({
      entity_type: "rule",
      entity_id: r.id,
      entity_label: `${payer.name} — ${r.title}`,
      summary: "Deleted rule",
      author_name: user?.email ?? null,
    });
    loadRules();
  }

  if (!payer) return <p className="text-muted-foreground">Loading…</p>;
  const stale = needsReview(payer.last_reviewed_at);
  const sources: any[] = Array.isArray(payer.source_links) ? payer.source_links : [];

  return (
    <div className="space-y-6">
      <Link to="/payers" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="h-3 w-3" /> Back to payers
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary">{payer.payer_type}</Badge>
            {stale && <Badge variant="outline" className="text-warning border-warning gap-1"><AlertCircle className="h-3 w-3" />Needs review</Badge>}
          </div>
          <h1 className="text-2xl font-semibold">{payer.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Calendar className="inline h-3 w-3 mr-1" />
            Last reviewed {formatDate(payer.last_reviewed_at)} ({relativeDate(payer.last_reviewed_at)})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SuggestEditDialog
            targetType="payer"
            targetId={payer.id}
            targetLabel={payer.name}
            triggerLabel="Suggest update"
          />
          {payer.portal_url && (
            <Button asChild variant="outline">
              <a href={payer.portal_url} target="_blank" rel="noreferrer">
                Portal <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>





      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Timely filing</div>
          <div className="text-2xl font-semibold mt-1">{payer.timely_filing_days ? `${payer.timely_filing_days} days` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Appeal limit</div>
          <div className="text-2xl font-semibold mt-1">{payer.appeal_limit_days ? `${payer.appeal_limit_days} days` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Requirements</div>
          <div className="flex gap-2 mt-2">
            <Badge variant={payer.prior_auth_required ? "default" : "outline"}>PA {payer.prior_auth_required ? "required" : "not required"}</Badge>
            <Badge variant={payer.uses_broker ? "default" : "outline"}>{payer.uses_broker ? "Brokered" : "Direct"}</Badge>
            <Badge variant={payer.wheelchair_claims ? "default" : "outline"}>Wheelchair {payer.wheelchair_claims ? "covered" : "not covered"}</Badge>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Submission &amp; appeals</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <InfoBlock title="Claims address" icon={MapPin} body={payer.claims_address} />
          <InfoBlock title="Electronic payer ID" icon={Hash} body={payer.electronic_payer_id} mono />
          <InfoBlock title="Appeals address" icon={Send} body={payer.appeals_address} />
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Medical records submission" icon={FilePlus} body={payer.medical_records_submission} trainingId={payer.medical_records_training_id} trainingTitle={trainingTitles[payer.medical_records_training_id]} />
        <Section title="Secondary claims submission" icon={Layers} body={payer.secondary_claims_submission} trainingId={payer.secondary_claims_training_id} trainingTitle={trainingTitles[payer.secondary_claims_training_id]} />
        {(payer.prior_auth_notes || payer.prior_auth_hcpcs || payer.prior_auth_modifiers) && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">Prior authorization</h3>
            </div>
            {payer.prior_auth_hcpcs && (
              <div className="mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">HCPCS codes</p>
                <p className="text-sm font-mono whitespace-pre-wrap">{payer.prior_auth_hcpcs}</p>
              </div>
            )}
            {payer.prior_auth_modifiers && (
              <div className="mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Modifiers</p>
                <p className="text-sm font-mono whitespace-pre-wrap">{payer.prior_auth_modifiers}</p>
              </div>
            )}
            {payer.prior_auth_notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payer.prior_auth_notes}</p>
            )}
            {payer.prior_auth_training_id && trainingTitles[payer.prior_auth_training_id] && (
              <Link to={`/training#${payer.prior_auth_training_id}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <GraduationCap className="h-3.5 w-3.5" /> Training: {trainingTitles[payer.prior_auth_training_id]}
              </Link>
            )}
          </Card>
        )}
        {payer.uses_broker && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">Brokered company</h3>
            </div>
            {payer.broker_name && (
              <p className="text-sm font-medium mb-2">{payer.broker_name}</p>
            )}
            {payer.broker_notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payer.broker_notes}</p>
            )}
          </Card>
        )}
        <Section title="Documentation requirements" icon={FileText} body={payer.documentation_requirements} />
        <Section title="Common denial reasons" icon={AlertCircle} body={payer.common_denial_reasons} />
        <Section title="Portal notes" icon={ExternalLink} body={payer.portal_notes} />
        <Section title="Internal notes" icon={FileText} body={payer.internal_notes} />
        <Section
          title={payer.wheelchair_claims ? "How to submit wheelchair claims" : "How to submit a claim for denial"}
          icon={Accessibility}
          body={payer.wheelchair_notes}
          trainingId={payer.wheelchair_claims ? payer.wc_claim_training_id : payer.wc_denial_training_id}
          trainingTitle={trainingTitles[payer.wheelchair_claims ? payer.wc_claim_training_id : payer.wc_denial_training_id]}
        />
      </div>


      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Payer rules ({rules.length})</h2>
          {isStaff && !editing && (
            <Button size="sm" onClick={() => setEditing({ title: "", category: "", body: "", last_reviewed_at: new Date().toISOString() })}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add rule
            </Button>
          )}
        </div>

        {editing && (
          <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/30">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={editing.category ?? ""} placeholder="Filing, Coding, Auth, Eligibility…" onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Body</Label>
              <Textarea rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Last reviewed</Label>
              <Input
                type="date"
                value={editing.last_reviewed_at ? editing.last_reviewed_at.slice(0, 10) : ""}
                onChange={(e) => setEditing({ ...editing, last_reviewed_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveRule(editing)}>Save rule</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {rules.length === 0 && !editing && <p className="text-sm text-muted-foreground">No rules recorded.</p>}
          {rules.map((r) => {
            const ruleStale = needsReview(r.last_reviewed_at);
            return (
              <div key={r.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{r.title}</h3>
                    {r.category && <Badge variant="secondary">{r.category}</Badge>}
                    {ruleStale && <Badge variant="outline" className="text-warning border-warning gap-1"><AlertCircle className="h-3 w-3" />Review</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Reviewed {relativeDate(r.last_reviewed_at)}</span>
                    <SuggestEditDialog
                      targetType="payer_rule"
                      targetId={r.id}
                      targetLabel={`${payer.name} — ${r.title}`}
                      variant="ghost"
                      triggerLabel="Suggest"
                    />
                    {isStaff && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(r)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteRule(r)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.body}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {sources.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-2">Source links</h2>
          <ul className="space-y-1 text-sm">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  {s.label || s.url} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, body, trainingId, trainingTitle }: { title: string; icon: any; body?: string | null; trainingId?: string | null; trainingTitle?: string | null }) {
  if (!body) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{body}</p>
      {trainingId && trainingTitle && (
        <Link to={`/training#${trainingId}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <GraduationCap className="h-3.5 w-3.5" /> Training: {trainingTitle}
        </Link>
      )}
    </Card>
  );
}


function InfoBlock({ title, icon: Icon, body, mono }: { title: string; icon: any; body?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-xs uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {body ? (
        <p className={`text-sm whitespace-pre-wrap ${mono ? "font-mono" : ""}`}>{body}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">—</p>
      )}
    </div>
  );
}
