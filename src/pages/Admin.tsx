import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Archive, Plus, Pencil, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { InvoicingEditDialog, blankCallType, type CallType } from "./Invoicing";

export default function Admin() {
  const { isAdmin, isStaff, user, loading } = useAuth();
  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!isStaff) return <Navigate to="/" replace />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage knowledge base content{isAdmin ? " and user roles" : ""}.</p>
      </div>
      <Tabs defaultValue="payers">
        <TabsList>
          <TabsTrigger value="payers">Payers</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="denials">Denial guides</TabsTrigger>
          <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users &amp; roles</TabsTrigger>}
        </TabsList>
        <TabsContent value="payers"><PayersAdmin /></TabsContent>
        <TabsContent value="training"><TrainingAdmin /></TabsContent>
        <TabsContent value="denials"><DenialsAdmin /></TabsContent>
        <TabsContent value="invoicing"><InvoicingAdmin /></TabsContent>
        {isAdmin && <TabsContent value="users"><UsersAdmin /></TabsContent>}
      </Tabs>
    </div>
  );
}

function logChange(entity_type: string, entity_id: string | null, label: string, summary: string, authorName?: string) {
  return supabase.from("change_log").insert({ entity_type, entity_id, entity_label: label, summary, author_name: authorName ?? null });
}

function PayersAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const { data } = await supabase.from("payers").select("*").order("name");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(p: any) {
    const isNew = !p.id;
    const payload = { ...p };
    delete payload.search_text;
    delete payload.created_at;
    delete payload.updated_at;
    if (typeof payload.source_links === "string") {
      try { payload.source_links = JSON.parse(payload.source_links || "[]"); } catch { payload.source_links = []; }
    }
    const { data, error } = isNew
      ? await supabase.from("payers").insert(payload).select().single()
      : await supabase.from("payers").update(payload).eq("id", p.id).select().single();
    if (error) return toast.error(error.message);
    await logChange("payer", data.id, data.name, isNew ? "Created payer" : "Updated payer", user?.email ?? undefined);
    toast.success("Saved");
    setEditing(null);
    load();
  }

  async function archive(p: any) {
    const { error } = await supabase.from("payers").update({ archived: !p.archived }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logChange("payer", p.id, p.name, p.archived ? "Restored payer" : "Archived payer", user?.email ?? undefined);
    load();
  }

  if (editing) return <PayerForm value={editing} onCancel={() => setEditing(null)} onSave={save} />;

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-end mb-3">
        <Button onClick={() => setEditing({ name: "", payer_type: "Commercial PPO", prior_auth_required: false, pcs_required: false, uses_broker: false, wheelchair_claims: false, source_links: [], archived: false })}>
          <Plus className="h-4 w-4 mr-1" /> New payer
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Reviewed</TableHead><TableHead></TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id} className={p.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.payer_type}</TableCell>
              <TableCell>{formatDate(p.last_reviewed_at)}</TableCell>
              <TableCell>{p.archived && <Badge variant="outline">Archived</Badge>}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(p)}>{p.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function PayerForm({ value, onSave, onCancel }: { value: any; onSave: (v: any) => void; onCancel: () => void }) {
  const [v, setV] = useState<any>({ ...value, source_links: typeof value.source_links === "object" ? JSON.stringify(value.source_links ?? [], null, 2) : value.source_links });
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));

  return (
    <Card className="p-5 mt-4 space-y-4">
      <h2 className="font-semibold">{value.id ? "Edit payer" : "New payer"}</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name"><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Type">
          <Select value={v.payer_type} onValueChange={(x) => set("payer_type", x)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Commercial HMO","Commercial PPO","Medicare","Medicare Advantage","State Medicaid","Workers Comp","Auto/PIP","Self-Pay","Other"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Portal URL"><Input value={v.portal_url ?? ""} onChange={(e) => set("portal_url", e.target.value)} /></Field>
        <Field label="Portal notes"><Input value={v.portal_notes ?? ""} onChange={(e) => set("portal_notes", e.target.value)} /></Field>
        <Field label="Timely filing (days)"><Input type="number" value={v.timely_filing_days ?? ""} onChange={(e) => set("timely_filing_days", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Appeal limit (days)"><Input type="number" value={v.appeal_limit_days ?? ""} onChange={(e) => set("appeal_limit_days", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Last reviewed"><Input type="date" value={v.last_reviewed_at ? v.last_reviewed_at.slice(0, 10) : ""} onChange={(e) => set("last_reviewed_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
        <Field label="Electronic payer ID"><Input value={v.electronic_payer_id ?? ""} onChange={(e) => set("electronic_payer_id", e.target.value)} /></Field>
      </div>
      <div className="space-y-3">
        <Field label="Prior auth required"><Switch checked={!!v.prior_auth_required} onCheckedChange={(x) => set("prior_auth_required", x)} /></Field>
        {v.prior_auth_required && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
            <div className="text-sm font-medium">Prior authorization details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="HCPCS codes requiring authorization"><Textarea rows={2} placeholder="e.g. A0426, A0428, A0433" value={v.prior_auth_hcpcs ?? ""} onChange={(e) => set("prior_auth_hcpcs", e.target.value)} /></Field>
              <Field label="Modifiers requiring authorization"><Textarea rows={2} placeholder="e.g. GY, GZ, TQ" value={v.prior_auth_modifiers ?? ""} onChange={(e) => set("prior_auth_modifiers", e.target.value)} /></Field>
            </div>
            <Field label="Prior auth notes"><Textarea rows={2} placeholder="How to obtain auth, timing, exceptions, etc." value={v.prior_auth_notes ?? ""} onChange={(e) => set("prior_auth_notes", e.target.value)} /></Field>
            <TrainingLinkPicker label="Link prior auth training" value={v.prior_auth_training_id} onChange={(id) => set("prior_auth_training_id", id)} />
          </div>
        )}
      </div>
      <div className="space-y-3">
        <Field label="Uses a brokered company"><Switch checked={!!v.uses_broker} onCheckedChange={(x) => set("uses_broker", x)} /></Field>
        {v.uses_broker && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
            <div className="text-sm font-medium">Brokered company details</div>
            <Field label="Brokered company name"><Input placeholder="e.g. ModivCare, Access2Care, MTM" value={v.broker_name ?? ""} onChange={(e) => set("broker_name", e.target.value)} /></Field>
            <Field label="Broker notes"><Textarea rows={4} placeholder="Which HCPCS codes, call types, regions, etc. route through this broker" value={v.broker_notes ?? ""} onChange={(e) => set("broker_notes", e.target.value)} /></Field>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <Field label="Pays wheelchair claims"><Switch checked={!!v.wheelchair_claims} onCheckedChange={(x) => set("wheelchair_claims", x)} /></Field>
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
          <div className="text-sm font-medium">{v.wheelchair_claims ? "Wheelchair claim submission" : "Wheelchair claim denial process"}</div>
          <Field label={v.wheelchair_claims ? "How to submit wheelchair claims" : "How to submit a claim for denial"}>
            <Textarea rows={4} placeholder={v.wheelchair_claims ? "Required documentation, modifiers, HCPCS codes, submission steps…" : "Required documentation and process to get the denial documented…"} value={v.wheelchair_notes ?? ""} onChange={(e) => set("wheelchair_notes", e.target.value)} />
          </Field>
          {v.wheelchair_claims ? (
            <TrainingLinkPicker label="Link wheelchair claim training" value={v.wc_claim_training_id} onChange={(id) => set("wc_claim_training_id", id)} />
          ) : (
            <TrainingLinkPicker label="Link wheelchair denial training" value={v.wc_denial_training_id} onChange={(id) => set("wc_denial_training_id", id)} />
          )}
        </div>
      </div>
      <Field label="Claims address"><Textarea rows={3} value={v.claims_address ?? ""} onChange={(e) => set("claims_address", e.target.value)} /></Field>
      <Field label="Appeals address"><Textarea rows={3} value={v.appeals_address ?? ""} onChange={(e) => set("appeals_address", e.target.value)} /></Field>
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <Field label="How to submit medical records"><Textarea rows={3} value={v.medical_records_submission ?? ""} onChange={(e) => set("medical_records_submission", e.target.value)} /></Field>
        <TrainingLinkPicker label="Link medical records training" value={v.medical_records_training_id} onChange={(id) => set("medical_records_training_id", id)} />
      </div>
      <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
        <Field label="How to submit secondary claims"><Textarea rows={3} value={v.secondary_claims_submission ?? ""} onChange={(e) => set("secondary_claims_submission", e.target.value)} /></Field>
        <TrainingLinkPicker label="Link secondary claims training" value={v.secondary_claims_training_id} onChange={(id) => set("secondary_claims_training_id", id)} />
      </div>
      <Field label="Documentation requirements"><Textarea rows={3} value={v.documentation_requirements ?? ""} onChange={(e) => set("documentation_requirements", e.target.value)} /></Field>
      <Field label="Common denial reasons"><Textarea rows={3} value={v.common_denial_reasons ?? ""} onChange={(e) => set("common_denial_reasons", e.target.value)} /></Field>
      <Field label="Internal notes"><Textarea rows={3} value={v.internal_notes ?? ""} onChange={(e) => set("internal_notes", e.target.value)} /></Field>
      <Field label='Source links (JSON: [{"label":"…","url":"…"}])'><Textarea rows={3} value={v.source_links} onChange={(e) => set("source_links", e.target.value)} /></Field>

      <div className="flex gap-2"><Button onClick={() => onSave(v)}>Save</Button><Button variant="outline" onClick={onCancel}>Cancel</Button></div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function TrainingLinkPicker({ value, onChange, label = "Link to a training article" }: { value: string | null | undefined; onChange: (id: string | null) => void; label?: string }) {
  const [articles, setArticles] = useState<any[]>([]);
  const enabled = !!value;
  useEffect(() => {
    supabase.from("training_articles").select("id,title,category").eq("archived", false).order("category").then(({ data }) => setArticles(data ?? []));
  }, []);
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? (value || (articles[0]?.id ?? null)) : null)}
          className="h-4 w-4"
        />
        {label}
      </label>

      {enabled && (
        <Select value={value ?? ""} onValueChange={(x) => onChange(x)}>
          <SelectTrigger><SelectValue placeholder="Select a training article…" /></SelectTrigger>
          <SelectContent>
            {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.category} — {a.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function TrainingAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  async function load() {
    const { data } = await supabase.from("training_articles").select("*").order("category");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);
  async function save(r: any) {
    const isNew = !r.id;
    const payload = { title: r.title, category: r.category, body: r.body, archived: !!r.archived, attachments: r.attachments ?? [] };
    const { data, error } = isNew
      ? await supabase.from("training_articles").insert(payload).select().single()
      : await supabase.from("training_articles").update(payload).eq("id", r.id).select().single();
    if (error) return toast.error(error.message);
    await logChange("training", data.id, data.title, isNew ? "Created article" : "Updated article", user?.email ?? undefined);
    toast.success("Saved"); setEditing(null); load();
  }
  async function archive(r: any) {
    await supabase.from("training_articles").update({ archived: !r.archived }).eq("id", r.id);
    await logChange("training", r.id, r.title, r.archived ? "Restored article" : "Archived article", user?.email ?? undefined);
    load();
  }
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const added: any[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const kind = ext === "pdf" ? "pdf" : ["mp4","mov","webm","m4v","ogg"].includes(ext) ? "video" : "file";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("training-materials").upload(path, file, { contentType: file.type, upsert: false });
        if (error) { toast.error(error.message); continue; }
        const { data: pub } = supabase.storage.from("training-materials").getPublicUrl(path);
        added.push({ name: file.name, path, url: pub.publicUrl, type: kind });
      }
      setEditing({ ...editing, attachments: [...(editing.attachments ?? []), ...added] });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }
  async function removeAttachment(idx: number) {
    const att = editing.attachments[idx];
    if (att?.path) await supabase.storage.from("training-materials").remove([att.path]);
    const next = editing.attachments.filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, attachments: next });
  }

  if (editing) return (
    <Card className="p-5 mt-4 space-y-4">
      <h2 className="font-semibold">{editing.id ? "Edit article" : "New article"}</h2>
      <Field label="Title"><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
      <Field label="Category"><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></Field>
      <Field label="Body"><Textarea rows={10} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></Field>
      <div className="space-y-2">
        <div className="text-sm font-medium">Attachments (PDFs &amp; videos)</div>
        <Input type="file" accept=".pdf,video/*" multiple disabled={uploading} onChange={handleUpload} />
        {uploading && <div className="text-xs text-muted-foreground">Uploading…</div>}
        {(editing.attachments ?? []).length > 0 && (
          <ul className="space-y-1">
            {editing.attachments.map((a: any, i: number) => (
              <li key={i} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                <a href={a.url} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.type === "video" ? "🎬" : "📄"} {a.name}</a>
                <Button size="sm" variant="ghost" onClick={() => removeAttachment(i)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2"><Button onClick={() => save(editing)}>Save</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
    </Card>
  );

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-end mb-3"><Button onClick={() => setEditing({ title: "", category: "Onboarding", body: "", attachments: [] })}><Plus className="h-4 w-4 mr-1" />New article</Button></div>
      <Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className={r.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell>{r.category}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function DenialsAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  async function load() {
    const [r, p] = await Promise.all([
      supabase.from("denial_guides").select("*, payers(name)").order("denial_code"),
      supabase.from("payers").select("id,name").eq("archived", false).order("name"),
    ]);
    setRows(r.data ?? []);
    setPayers(p.data ?? []);
  }
  useEffect(() => { load(); }, []);
  async function save(r: any) {
    const isNew = !r.id;
    const payload = {
      denial_code: r.denial_code || null,
      denial_reason: r.denial_reason,
      how_to_fix: r.how_to_fix,
      required_attachments: r.required_attachments || null,
      appeal_template: r.appeal_template || null,
      payer_id: r.payer_id || null,
      training_article_id: r.training_article_id || null,
      archived: !!r.archived,
    };
    const { data, error } = isNew
      ? await supabase.from("denial_guides").insert(payload).select().single()
      : await supabase.from("denial_guides").update(payload).eq("id", r.id).select().single();
    if (error) return toast.error(error.message);
    await logChange("denial_guide", data.id, data.denial_code ?? data.denial_reason, isNew ? "Created denial guide" : "Updated denial guide", user?.email ?? undefined);
    toast.success("Saved"); setEditing(null); load();
  }
  async function archive(r: any) {
    await supabase.from("denial_guides").update({ archived: !r.archived }).eq("id", r.id);
    await logChange("denial_guide", r.id, r.denial_code ?? r.denial_reason, r.archived ? "Restored guide" : "Archived guide", user?.email ?? undefined);
    load();
  }

  if (editing) return (
    <Card className="p-5 mt-4 space-y-4">
      <h2 className="font-semibold">{editing.id ? "Edit denial guide" : "New denial guide"}</h2>
      <Field label="Payer scope">
        <Select value={editing.payer_id ?? "__global__"} onValueChange={(x) => setEditing({ ...editing, payer_id: x === "__global__" ? null : x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__global__">Global — applies to all payers</SelectItem>
            {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Denial code"><Input value={editing.denial_code ?? ""} onChange={(e) => setEditing({ ...editing, denial_code: e.target.value })} placeholder="CO-29" /></Field>
      <Field label="Denial reason"><Input value={editing.denial_reason ?? ""} onChange={(e) => setEditing({ ...editing, denial_reason: e.target.value })} /></Field>
      <Field label="How to fix"><Textarea rows={4} value={editing.how_to_fix ?? ""} onChange={(e) => setEditing({ ...editing, how_to_fix: e.target.value })} /></Field>
      <Field label="Required attachments"><Textarea rows={2} value={editing.required_attachments ?? ""} onChange={(e) => setEditing({ ...editing, required_attachments: e.target.value })} /></Field>
      <Field label="Appeal template"><Textarea rows={6} value={editing.appeal_template ?? ""} onChange={(e) => setEditing({ ...editing, appeal_template: e.target.value })} /></Field>
      <TrainingLinkPicker value={editing.training_article_id} onChange={(id) => setEditing({ ...editing, training_article_id: id })} />
      <div className="flex gap-2"><Button onClick={() => save(editing)}>Save</Button><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
    </Card>
  );

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-end mb-3"><Button onClick={() => setEditing({ denial_code: "", denial_reason: "", how_to_fix: "", required_attachments: "", appeal_template: "", payer_id: null })}><Plus className="h-4 w-4 mr-1" />New guide</Button></div>
      <Table>
        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Reason</TableHead><TableHead>Payer</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className={r.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium">{r.denial_code}</TableCell>
              <TableCell>{r.denial_reason}</TableCell>
              <TableCell className="text-sm">{(r.payers as any)?.name ?? <span className="text-muted-foreground">Global</span>}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function InvoicingAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<CallType[]>([]);
  const [editing, setEditing] = useState<CallType | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data } = await supabase.from("invoicing_call_types").select("*").order("name");
    setRows((data ?? []).map((r: any) => ({ ...r, natures: r.natures ?? [], screenshots: r.screenshots ?? [] })));
  }
  useEffect(() => { load(); }, []);

  async function archive(r: CallType) {
    const { error } = await supabase.from("invoicing_call_types").update({ archived: !r.archived }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logChange("invoicing", r.id, r.name, r.archived ? "Restored call type" : "Archived call type", user?.email ?? undefined);
    load();
  }

  function startNew() { setEditing(blankCallType()); setOpen(true); }
  function startEdit(r: CallType) { setEditing({ ...r }); setOpen(true); }

  return (
    <Card className="p-4 mt-4">
      <div className="flex justify-end mb-3">
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New call type</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Natures</TableHead><TableHead>Updated</TableHead><TableHead></TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} className={r.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{r.natures.join(", ")}</TableCell>
              <TableCell>{formatDate(r.updated_at)}</TableCell>
              <TableCell>{r.archived && <Badge variant="outline">Archived</Badge>}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <InvoicingEditDialog open={open} onOpenChange={setOpen} callType={editing} onSaved={() => { setOpen(false); load(); }} />
    </Card>
  );
}

function UsersAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles ?? []).map((p: any) => ({ ...p, roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role) }));
    setRows(merged);
  }
  useEffect(() => { load(); }, []);

  async function setRole(userId: string, role: "admin" | "editor" | "viewer") {
    // Preserve claims_tracker permission when changing base role
    const { data: existing } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const hadTracker = (existing ?? []).some((r: any) => r.role === "claims_tracker");
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role });
    if (hadTracker && role !== "admin") {
      await supabase.from("user_roles").insert({ user_id: userId, role: "claims_tracker" });
    }
    toast.success("Role updated");
    load();
  }

  async function toggleClaimsTracker(userId: string, has: boolean) {
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "claims_tracker");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "claims_tracker" });
    }
    toast.success("Permission updated");
    load();
  }

  return (
    <Card className="p-4 mt-4">
      <Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Claims tracker</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((u) => {
            const hasTracker = u.roles.includes("claims_tracker");
            return (
              <TableRow key={u.id}>
                <TableCell>{u.display_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell>{u.roles.filter((r: string) => r !== "claims_tracker").map((r: string) => <Badge key={r} variant="secondary" className="mr-1">{r}</Badge>)}</TableCell>
                <TableCell>
                  <Button size="sm" variant={hasTracker ? "default" : "outline"} onClick={() => toggleClaimsTracker(u.id, hasTracker)}>
                    {hasTracker ? "Granted" : "Grant"}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <Select onValueChange={(v: any) => setRole(u.id, v)}>
                    <SelectTrigger className="w-32 ml-auto"><SelectValue placeholder="Set role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
