import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Upload, X, ImageIcon, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import SuggestEditDialog from "@/components/SuggestEditDialog";

export type CallType = {
  id: string;
  name: string;
  natures: string[];
  billing_tab: string;
  dispatch_tab: string;
  medical_tab: string;
  required_paperwork: string;
  payer_specific_rules: string;
  notes: string;
  screenshots: string[];
  archived: boolean;
  updated_at: string;
  training_article_id: string | null;
};

const BUCKET = "invoicing-screenshots";

const SECTIONS: { key: keyof Pick<CallType, "billing_tab" | "dispatch_tab" | "medical_tab" | "required_paperwork" | "payer_specific_rules" | "notes">; label: string }[] = [
  { key: "billing_tab", label: "Billing Tab" },
  { key: "dispatch_tab", label: "Dispatch Tab" },
  { key: "medical_tab", label: "Medical Tab" },
  { key: "required_paperwork", label: "Required Paperwork" },
  { key: "payer_specific_rules", label: "Payer Specific Rules" },
  { key: "notes", label: "Notes" },
];

export const blankCallType = (): CallType => ({
  id: "", name: "", natures: [],
  billing_tab: "", dispatch_tab: "", medical_tab: "",
  required_paperwork: "", payer_specific_rules: "", notes: "",
  screenshots: [], archived: false, updated_at: "", training_article_id: null,
});

export default function Invoicing() {
  const [rows, setRows] = useState<CallType[]>([]);
  const [q, setQ] = useState("");
  const [articleMap, setArticleMap] = useState<Record<string, { title: string; category: string }>>({});

  const load = async () => {
    const { data } = await supabase
      .from("invoicing_call_types")
      .select("*")
      .eq("archived", false)
      .order("name");
    setRows((data ?? []).map((r: any) => ({
      ...r,
      natures: r.natures ?? [],
      screenshots: r.screenshots ?? [],
    })));
  };

  useEffect(() => {
    load();
    supabase.from("training_articles").select("id,title,category").eq("archived", false).then(({ data }) => {
      const m: Record<string, { title: string; category: string }> = {};
      (data ?? []).forEach((a: any) => { m[a.id] = { title: a.title, category: a.category }; });
      setArticleMap(m);
    });
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(t) ||
      r.natures.some((n) => n.toLowerCase().includes(t)) ||
      SECTIONS.some((s) => (r[s.key] || "").toLowerCase().includes(t))
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoicing</h1>
          <p className="text-sm text-muted-foreground">
            Traumasoft invoicing guides organized by call type. Managed by admins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground text-center">
            No call types yet.
          </Card>
        )}
        {filtered.map((g) => (
          <Card key={g.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg">{g.name}</h3>
                {g.natures.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {g.natures.map((n) => (
                      <Badge key={n} variant="secondary">{n}</Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <SuggestEditDialog
                  targetType="payer_rule"
                  targetId={g.id}
                  targetLabel={`Invoicing · ${g.name}`}
                />
              </div>
            </div>

            <Tabs defaultValue="billing_tab" className="mt-2">
              <TabsList className="flex flex-wrap h-auto">
                {SECTIONS.map((s) => (
                  <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
                ))}
              </TabsList>
              {SECTIONS.map((s) => (
                <TabsContent key={s.key} value={s.key}>
                  {g[s.key] ? (
                    <div className="text-sm whitespace-pre-wrap">{g[s.key]}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">No content yet.</div>
                  )}
                </TabsContent>
              ))}
            </Tabs>

            {g.training_article_id && articleMap[g.training_article_id] && (
              <Link
                to={`/training#${g.training_article_id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <GraduationCap className="h-4 w-4" /> Training: {articleMap[g.training_article_id].title}
              </Link>
            )}


            {g.screenshots.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Screenshots</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {g.screenshots.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="block group">
                      <img
                        src={url}
                        alt="Invoicing screenshot"
                        loading="lazy"
                        className="rounded border w-full h-32 object-cover group-hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

    </div>
  );
}

export function InvoicingEditDialog({
  open, onOpenChange, callType, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  callType: CallType | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CallType>(blankCallType());
  const [natureInput, setNatureInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    setForm(callType ?? blankCallType());
    setNatureInput("");
  }, [callType]);

  useEffect(() => {
    supabase.from("training_articles").select("id,title,category").eq("archived", false).order("category").then(({ data }) => setArticles(data ?? []));
  }, []);

  const set = <K extends keyof CallType>(k: K, v: CallType[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const addNature = () => {
    const v = natureInput.trim();
    if (!v) return;
    if (form.natures.includes(v)) { setNatureInput(""); return; }
    set("natures", [...form.natures, v]);
    setNatureInput("");
  };
  const removeNature = (n: string) =>
    set("natures", form.natures.filter((x) => x !== n));

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "png";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (error) { toast.error(error.message); continue; }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      set("screenshots", [...form.screenshots, ...urls]);
    } finally {
      setUploading(false);
    }
  };

  const removeShot = (url: string) =>
    set("screenshots", form.screenshots.filter((u) => u !== url));

  const save = async () => {
    if (!form.name.trim()) { toast.error("Call type name is required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      natures: form.natures,
      billing_tab: form.billing_tab,
      dispatch_tab: form.dispatch_tab,
      medical_tab: form.medical_tab,
      required_paperwork: form.required_paperwork,
      payer_specific_rules: form.payer_specific_rules,
      notes: form.notes,
      screenshots: form.screenshots,
      training_article_id: form.training_article_id,
    };
    const res = form.id
      ? await supabase.from("invoicing_call_types").update(payload).eq("id", form.id)
      : await supabase.from("invoicing_call_types").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit" : "New"} call type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Call type name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Discharge"
            />
          </div>

          <div>
            <Label>System natures</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={natureInput}
                onChange={(e) => setNatureInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addNature(); }
                }}
                placeholder="Type a nature and press Enter"
              />
              <Button type="button" variant="secondary" onClick={addNature}>Add</Button>
            </div>
            {form.natures.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.natures.map((n) => (
                  <Badge key={n} variant="secondary" className="gap-1">
                    {n}
                    <button type="button" onClick={() => removeNature(n)} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {SECTIONS.map((s) => (
            <div key={s.key}>
              <Label>{s.label}</Label>
              <Textarea
                rows={5}
                value={form[s.key]}
                onChange={(e) => set(s.key, e.target.value)}
                placeholder={`${s.label} notes…`}
              />
            </div>
          ))}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Screenshots</Label>
              <label className="inline-flex items-center gap-1 text-sm cursor-pointer text-primary hover:underline">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Add images"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
              </label>
            </div>
            {form.screenshots.length === 0 ? (
              <div className="flex items-center justify-center border border-dashed rounded h-24 text-xs text-muted-foreground">
                <ImageIcon className="h-4 w-4 mr-1" /> No screenshots yet
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {form.screenshots.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="" className="rounded border w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => removeShot(url)}
                      className="absolute top-1 right-1 bg-background/90 border rounded p-0.5 opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.training_article_id}
                onChange={(e) => set("training_article_id", e.target.checked ? (form.training_article_id || (articles[0]?.id ?? null)) : null)}
                className="h-4 w-4"
              />
              Link to a training article
            </label>
            {form.training_article_id && (
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={form.training_article_id ?? ""}
                onChange={(e) => set("training_article_id", e.target.value)}
              >
                {articles.map((a) => (
                  <option key={a.id} value={a.id}>{a.category} — {a.title}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || uploading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
