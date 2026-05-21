import { useEffect, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Archive, Plus, Pencil, RefreshCw, FileUp, Download, Users } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/lib/dates";
import { InvoicingEditDialog, blankCallType, type CallType } from "./Invoicing";
import { RichTextEditor } from "@/components/RichTextEditor";
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

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
          <TabsTrigger value="policies">Policies</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users &amp; roles</TabsTrigger>}
        </TabsList>
        <TabsContent value="payers"><PayersAdmin /></TabsContent>
        <TabsContent value="training"><TrainingAdmin /></TabsContent>
        <TabsContent value="denials"><DenialsAdmin /></TabsContent>
        <TabsContent value="invoicing"><InvoicingAdmin /></TabsContent>
        <TabsContent value="policies"><PoliciesAdmin /></TabsContent>
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
  const [showArchived, setShowArchived] = useState(false);

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

  const displayedPayers = showArchived ? rows : rows.filter((r) => !r.archived);

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
          {showArchived && rows.some((r) => r.archived) && (
            <Badge variant="outline" className="ml-1">{rows.filter((r) => r.archived).length} archived</Badge>
          )}
        </label>
        <div className="flex gap-2">
          <PayerCsvUploadDialog onDone={load} />
          <Button onClick={() => setEditing({ name: "", payer_type: "Commercial Insurance", prior_auth_required: false, pcs_required: false, uses_broker: false, wheelchair_claims: false, source_links: [], archived: false })}>
            <Plus className="h-4 w-4 mr-1" /> New payer
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Reviewed</TableHead><TableHead></TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {displayedPayers.map((p) => (
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
          {displayedPayers.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No payers found.</TableCell></TableRow>
          )}
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
              {["Commercial Insurance","Medicare","Medicare Advantage","Ohio Medicaid","Medicaid Advantage","Out of State Medicaid","Worker's Comp","Auto/Liability","Brokerage","VA/Military","Broker","Prison/Corrections","Supplemental"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
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

const PAYER_TYPES = [
  "Commercial Insurance", "Medicare", "Medicare Advantage", "Ohio Medicaid",
  "Medicaid Advantage", "Out of State Medicaid", "Worker's Comp", "Auto/Liability", "Brokerage",
  "VA/Military", "Broker", "Prison/Corrections", "Supplemental",
];

const CSV_COLUMNS = [
  "name", "payer_type", "electronic_payer_id", "portal_url", "portal_notes",
  "timely_filing_days", "appeal_limit_days", "pcs_required", "prior_auth_required",
  "uses_broker", "wheelchair_claims", "claims_address", "appeals_address",
  "documentation_requirements", "common_denial_reasons", "internal_notes",
];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseBool(v: string): boolean {
  return ["true", "yes", "1", "y"].includes((v ?? "").toLowerCase());
}

function validatePayerRow(row: any): string | null {
  if (!row.name?.trim()) return "Name is required";
  if (row.payer_type && !PAYER_TYPES.includes(row.payer_type.trim())) {
    return `Unknown payer_type "${row.payer_type}" — must match one of the 9 valid types`;
  }
  return null;
}

function PayerCsvUploadDialog({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const example = [
      "Acme Health Plan", "Commercial Insurance", "12345", "https://portal.example.com", "Login with NPI",
      "90", "180", "false", "false", "false", "false", "", "", "", "", "",
    ];
    const csv = [CSV_COLUMNS.join(","), example.join(",")].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "payer_import_template.csv";
    a.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row."); return; }
      const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const parsed = lines.slice(1).map((line, idx) => {
        const vals = parseCsvLine(line);
        const obj: any = { _row: idx + 2 };
        headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
        return obj;
      });
      setRows(parsed);
      setResults(null);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    const valid = rows.filter((r) => !validatePayerRow(r));
    if (!valid.length) return;
    setImporting(true);
    const errors: string[] = [];
    let success = 0;
    for (const row of valid) {
      const payload = {
        name: row.name.trim(),
        payer_type: row.payer_type?.trim() || "Commercial Insurance",
        electronic_payer_id: row.electronic_payer_id || null,
        portal_url: row.portal_url || null,
        portal_notes: row.portal_notes || null,
        timely_filing_days: row.timely_filing_days ? Number(row.timely_filing_days) : null,
        appeal_limit_days: row.appeal_limit_days ? Number(row.appeal_limit_days) : null,
        pcs_required: parseBool(row.pcs_required),
        prior_auth_required: parseBool(row.prior_auth_required),
        uses_broker: parseBool(row.uses_broker),
        wheelchair_claims: parseBool(row.wheelchair_claims),
        claims_address: row.claims_address || null,
        appeals_address: row.appeals_address || null,
        documentation_requirements: row.documentation_requirements || null,
        common_denial_reasons: row.common_denial_reasons || null,
        internal_notes: row.internal_notes || null,
        archived: false,
        source_links: [],
      };
      const { data, error } = await supabase.from("payers").insert(payload).select("id").single();
      if (error) {
        errors.push(`Row ${row._row} (${row.name}): ${error.message}`);
      } else {
        success++;
        await logChange("payer", data.id, row.name, "Imported via CSV", user?.email ?? undefined);
      }
    }
    setResults({ success, errors });
    setImporting(false);
    if (success > 0) onDone();
  }

  const validCount = rows.filter((r) => !validatePayerRow(r)).length;
  const invalidCount = rows.length - validCount;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => { setOpen(true); setRows([]); setResults(null); }}>
        <FileUp className="h-4 w-4 mr-1.5" /> Import CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import payers from CSV</DialogTitle>
            <DialogDescription>
              Download the template, fill it in (Excel or Google Sheets), save as CSV, then upload.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Step 1 */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Step 1 — Download the template</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Columns: {CSV_COLUMNS.join(", ")}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1.5" /> Template
              </Button>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Step 2 — Upload your completed CSV</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rows.length > 0 ? `${rows.length} row${rows.length !== 1 ? "s" : ""} parsed` : "No file selected yet"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-1.5" /> Choose file
              </Button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </div>

            {/* Preview */}
            {rows.length > 0 && !results && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Preview — review before importing</p>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-600 font-medium">{validCount} valid</span>
                    {invalidCount > 0 && <span className="text-destructive font-medium">{invalidCount} invalid</span>}
                  </div>
                </div>

                <div className="border rounded-md overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-xs">#</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Payer ID</TableHead>
                        <TableHead className="text-xs">Filing (days)</TableHead>
                        <TableHead className="text-xs">Appeal (days)</TableHead>
                        <TableHead className="w-12 text-xs text-center">OK?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => {
                        const err = validatePayerRow(row);
                        return (
                          <TableRow key={row._row} className={err ? "bg-destructive/5" : ""}>
                            <TableCell className="text-xs text-muted-foreground">{row._row}</TableCell>
                            <TableCell className="text-sm font-medium">
                              {row.name || <span className="text-destructive italic">missing</span>}
                            </TableCell>
                            <TableCell className="text-sm">{row.payer_type || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.electronic_payer_id || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.timely_filing_days || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.appeal_limit_days || "—"}</TableCell>
                            <TableCell className="text-center">
                              {err
                                ? <span className="text-destructive text-xs" title={err}>✕</span>
                                : <span className="text-green-600 text-xs">✓</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {invalidCount > 0 && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                    <p className="text-xs font-medium text-destructive">Issues to fix before importing:</p>
                    {rows.filter((r) => validatePayerRow(r)).map((r) => (
                      <p key={r._row} className="text-xs text-muted-foreground">Row {r._row}: {validatePayerRow(r)}</p>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button onClick={runImport} disabled={importing || validCount === 0}>
                    {importing ? "Importing…" : `Import ${validCount} payer${validCount !== 1 ? "s" : ""}`}
                  </Button>
                  {invalidCount > 0 && (
                    <p className="text-xs text-muted-foreground">{invalidCount} invalid row{invalidCount !== 1 ? "s" : ""} will be skipped.</p>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                <p className="font-medium text-sm">
                  {results.success > 0
                    ? `✓ ${results.success} payer${results.success !== 1 ? "s" : ""} imported successfully.`
                    : "No payers were imported."}
                </p>
                {results.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">{results.errors.length} error{results.errors.length !== 1 ? "s" : ""}:</p>
                    {results.errors.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{e}</p>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setRows([]); setResults(null); }}>
                    Import more
                  </Button>
                  <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
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

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/ {2,}/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }
  return parts.join("\n\n");
}

function TrainingAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  async function handlePdfImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setParsing(true);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) return toast.error("Couldn't extract any text from this PDF.");
      const inferredTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim();
      const html = text
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");
      setEditing((prev: any) => ({
        ...prev,
        title: prev.title?.trim() ? prev.title : inferredTitle,
        body: html,
      }));
      toast.success("PDF content extracted — review and save when ready.");
    } catch (err: any) {
      toast.error("Failed to parse PDF: " + (err?.message ?? "unknown error"));
    } finally {
      setParsing(false);
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("training-materials")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast.error(error.message); throw error; }
    const { data } = supabase.storage.from("training-materials").getPublicUrl(path);
    return data.publicUrl;
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
      setEditing((prev: any) => ({ ...prev, attachments: [...(prev.attachments ?? []), ...added] }));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function removeAttachment(idx: number) {
    const att = editing.attachments[idx];
    if (att?.path) await supabase.storage.from("training-materials").remove([att.path]);
    const next = editing.attachments.filter((_: any, i: number) => i !== idx);
    setEditing((prev: any) => ({ ...prev, attachments: next }));
  }

  if (editing) return (
    <Card className="p-5 mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{editing.id ? "Edit article" : "New article"}</h2>
        <label className={`inline-flex items-center gap-1.5 text-sm cursor-pointer px-3 py-1.5 rounded-md border border-dashed border-primary/50 text-primary hover:bg-primary/5 transition-colors ${parsing ? "opacity-60 pointer-events-none" : ""}`}>
          <FileUp className="h-4 w-4" />
          {parsing ? "Extracting…" : "Import from PDF"}
          <input type="file" accept=".pdf" className="hidden" onChange={handlePdfImport} disabled={parsing} />
        </label>
      </div>
      {parsing && <div className="text-xs text-muted-foreground animate-pulse">Reading PDF and extracting text…</div>}
      <Field label="Title"><Input value={editing.title ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, title: e.target.value }))} /></Field>
      <Field label="Category"><Input value={editing.category ?? ""} onChange={(e) => setEditing((prev: any) => ({ ...prev, category: e.target.value }))} /></Field>
      <Field label="Body">
        <RichTextEditor
          value={editing.body ?? ""}
          onChange={(html) => setEditing((prev: any) => ({ ...prev, body: html }))}
          onImageUpload={uploadImage}
          minHeight={320}
        />
      </Field>
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

  const displayedArticles = showArchived ? rows : rows.filter((r) => !r.archived);

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
          {showArchived && rows.some((r) => r.archived) && (
            <Badge variant="outline" className="ml-1">{rows.filter((r) => r.archived).length} archived</Badge>
          )}
        </label>
        <Button onClick={() => setEditing({ title: "", category: "Onboarding", body: "", attachments: [] })}>
          <Plus className="h-4 w-4 mr-1" />New article
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {displayedArticles.map((r) => (
            <TableRow key={r.id} className={r.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell>{r.category}</TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => archive(r)}>{r.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}</Button>
              </TableCell>
            </TableRow>
          ))}
          {displayedArticles.length === 0 && (
            <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No articles found.</TableCell></TableRow>
          )}
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
  const [showArchived, setShowArchived] = useState(false);
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

  const displayedDenials = showArchived ? rows : rows.filter((r) => !r.archived);

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
          {showArchived && rows.some((r) => r.archived) && (
            <Badge variant="outline" className="ml-1">{rows.filter((r) => r.archived).length} archived</Badge>
          )}
        </label>
        <Button onClick={() => setEditing({ denial_code: "", denial_reason: "", how_to_fix: "", required_attachments: "", appeal_template: "", payer_id: null })}>
          <Plus className="h-4 w-4 mr-1" />New guide
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Reason</TableHead><TableHead>Payer</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {displayedDenials.map((r) => (
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
          {displayedDenials.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No denial guides found.</TableCell></TableRow>
          )}
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
  const [showArchived, setShowArchived] = useState(false);

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

  const displayedCallTypes = showArchived ? rows : rows.filter((r) => !r.archived);

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
          {showArchived && rows.some((r) => r.archived) && (
            <Badge variant="outline" className="ml-1">{rows.filter((r) => r.archived).length} archived</Badge>
          )}
        </label>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New call type</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Natures</TableHead><TableHead>Updated</TableHead><TableHead></TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {displayedCallTypes.map((r) => (
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
          {displayedCallTypes.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No call types found.</TableCell></TableRow>
          )}
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

function PoliciesAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [ackModal, setAckModal] = useState<any | null>(null);
  const [acks, setAcks] = useState<any[]>([]);
  const [ackLoading, setAckLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("policies").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  }

  useEffect(() => { load(); }, []);

  async function uploadPdf(file: File): Promise<string | null> {
    const path = `${crypto.randomUUID()}.pdf`;
    const { error } = await supabase.storage
      .from("policy-pdfs")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (error) { toast.error("Upload failed: " + error.message); return null; }
    const { data } = supabase.storage.from("policy-pdfs").getPublicUrl(path);
    return data.publicUrl;
  }

  async function save(p: any) {
    const isNew = !p.id;
    const existing = isNew ? null : rows.find((r: any) => r.id === p.id);
    const wasPublished = existing?.published ?? false;
    const nowPublished = !!p.published;
    const payload: any = {
      title: (p.title ?? "").trim(),
      body: p.body ?? "",
      pdf_url: p.pdf_url ?? null,
      training_article_id: p.training_article_id || null,
      published: nowPublished,
      published_at: nowPublished && !wasPublished ? new Date().toISOString() : (p.published_at ?? null),
      archived: !!p.archived,
      updated_at: new Date().toISOString(),
    };
    const { error } = isNew
      ? await supabase.from("policies").insert(payload)
      : await supabase.from("policies").update(payload).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Policy created." : "Policy saved.");
    setEditing(null);
    load();
  }

  async function togglePublish(p: any) {
    const nowPublished = !p.published;
    const { error } = await supabase.from("policies").update({
      published: nowPublished,
      published_at: nowPublished && !p.published_at ? new Date().toISOString() : p.published_at,
      updated_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(nowPublished ? "Policy published — users will see it on their dashboard." : "Policy unpublished.");
    load();
  }

  async function toggleArchive(p: any) {
    await supabase.from("policies").update({ archived: !p.archived, updated_at: new Date().toISOString() }).eq("id", p.id);
    load();
  }

  async function openAckLog(pol: any) {
    setAckModal(pol);
    setAcks([]);
    setAckLoading(true);
    const { data } = await supabase
      .from("policy_acknowledgements")
      .select("*")
      .eq("policy_id", pol.id)
      .order("signed_at", { ascending: false });
    setAcks(data ?? []);
    setAckLoading(false);
  }

  const displayed = showArchived ? rows : rows.filter((r: any) => !r.archived);
  const archivedCount = rows.filter((r: any) => r.archived).length;

  if (editing) {
    return (
      <Card className="p-5 mt-4 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">{editing.id ? "Edit policy" : "New policy"}</h2>
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
        <Field label="Title">
          <Input
            value={editing.title ?? ""}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            placeholder="Policy title"
          />
        </Field>

        <Field label="PDF Document">
          {editing.pdf_url ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <FileUp className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm flex-1 truncate text-muted-foreground">PDF uploaded</span>
                <Button
                  size="sm" variant="ghost"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => setEditing({ ...editing, pdf_url: null })}
                >
                  Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">To replace, remove the current PDF then upload a new one.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Input
                type="file"
                accept="application/pdf"
                disabled={pdfUploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPdfUploading(true);
                  const url = await uploadPdf(file);
                  setPdfUploading(false);
                  if (url) setEditing({ ...editing, pdf_url: url });
                  e.target.value = "";
                }}
              />
              {pdfUploading && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Uploading…
                </p>
              )}
              <p className="text-xs text-muted-foreground">PDF will be shown inline — all pages visible by scrolling.</p>
            </div>
          )}
        </Field>

        <Field label="Notes (shown below PDF)">
          <Textarea
            value={editing.body ?? ""}
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            placeholder="Optional notes, reminders, or context shown below the PDF…"
            rows={4}
          />
        </Field>

        <TrainingLinkPicker
          label="Link to a training article (optional)"
          value={editing.training_article_id}
          onChange={(id) => setEditing({ ...editing, training_article_id: id })}
        />
        <Field label="Status">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Switch
              checked={!!editing.published}
              onCheckedChange={(v) => setEditing({ ...editing, published: v })}
            />
            <span className="text-sm">
              {editing.published
                ? <span className="font-medium text-green-700">Published — visible to all users</span>
                : <span className="text-muted-foreground">Draft — not visible to users</span>}
            </span>
          </label>
        </Field>
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={() => save(editing)} disabled={!editing.title?.trim()}>Save policy</Button>
          <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
          {showArchived && archivedCount > 0 && (
            <Badge variant="outline" className="ml-1">{archivedCount} archived</Badge>
          )}
        </label>
        <Button onClick={() => setEditing({ title: "", body: "", pdf_url: null, published: false, archived: false })}>
          <Plus className="h-4 w-4 mr-1" /> New policy
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Ack log</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayed.map((p: any) => (
            <TableRow key={p.id} className={p.archived ? "opacity-50" : ""}>
              <TableCell className="font-medium max-w-xs truncate">{p.title}</TableCell>
              <TableCell>
                {p.published
                  ? <Badge className="bg-green-100 text-green-800 border border-green-300">Published</Badge>
                  : <Badge variant="outline">Draft</Badge>}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {p.published_at ? format(new Date(p.published_at), "MMM d, yyyy") : "—"}
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openAckLog(p)}>
                  <Users className="h-3 w-3" /> View log
                </Button>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => togglePublish(p)}>
                  {p.published ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(p)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 w-7 p-0"
                  title={p.archived ? "Restore" : "Archive"}
                  onClick={() => toggleArchive(p)}
                >
                  {p.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {displayed.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                {showArchived ? "No policies." : "No policies yet. Click \"New policy\" to get started."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!ackModal} onOpenChange={(o) => { if (!o) setAckModal(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Acknowledgement log</DialogTitle>
            <DialogDescription className="font-medium truncate">{ackModal?.title}</DialogDescription>
          </DialogHeader>
          {ackLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : acks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">No acknowledgements recorded yet.</p>
              {ackModal?.published && (
                <p className="text-xs text-muted-foreground mt-1">
                  This policy is published — users will see it on their next login.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground -mt-1 mb-2">
                {acks.length} user{acks.length !== 1 ? "s have" : " has"} acknowledged this policy.
              </p>
              <div className="overflow-y-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name signed</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Signed at</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acks.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.signed_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.user_email ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(a.signed_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
