import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Copy, Building2, Globe, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import SuggestEditDialog from "@/components/SuggestEditDialog";

export default function Denials() {
  const [rows, setRows] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [articleMap, setArticleMap] = useState<Record<string, { title: string }>>({});
  const [q, setQ] = useState("");
  const [payerFilter, setPayerFilter] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("denial_guides")
      .select("*, payers(id,name)")
      .eq("archived", false)
      .order("denial_code")
      .then(({ data }) => setRows(data ?? []));
    supabase
      .from("payers")
      .select("id,name")
      .eq("archived", false)
      .order("name")
      .then(({ data }) => setPayers(data ?? []));
    supabase.from("training_articles").select("id,title").eq("archived", false).then(({ data }) => {
      const m: Record<string, { title: string }> = {};
      (data ?? []).forEach((a: any) => { m[a.id] = { title: a.title }; });
      setArticleMap(m);
    });
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (payerFilter === "global" && r.payer_id) return false;
      if (payerFilter !== "all" && payerFilter !== "global" && r.payer_id !== payerFilter) return false;
      if (!t) return true;
      return (
        (r.denial_code ?? "").toLowerCase().includes(t) ||
        r.denial_reason.toLowerCase().includes(t) ||
        r.how_to_fix.toLowerCase().includes(t)
      );
    });
  }, [rows, q, payerFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Denials &amp; appeals guide</h1>
          <p className="text-sm text-muted-foreground">Lookup denial reasons, fixes, and appeal templates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={payerFilter} onValueChange={setPayerFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payers</SelectItem>
              <SelectItem value="global">Global only</SelectItem>
              {payers.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search code or reason…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground text-center">No denial guides match these filters.</Card>
        )}
        {filtered.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {d.denial_code && <Badge>{d.denial_code}</Badge>}
                  <h3 className="font-semibold">{d.denial_reason}</h3>
                </div>
                <div className="mt-1.5">
                  {d.payers ? (
                    <Link
                      to={`/payers/${d.payers.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Building2 className="h-3 w-3" /> {d.payers.name}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" /> Global — applies to all payers
                    </span>
                  )}
                </div>
              </div>
              <SuggestEditDialog
                targetType="denial_guide"
                targetId={d.id}
                targetLabel={`${d.denial_code ? d.denial_code + " · " : ""}${d.denial_reason}`}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <Block label="How to fix">{d.how_to_fix}</Block>
              <Block label="Required attachments">{d.required_attachments || "—"}</Block>
            </div>
            {d.appeal_template && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Appeal template</div>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(d.appeal_template); toast.success("Copied"); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                </div>
                <pre className="bg-muted/50 p-3 rounded text-xs whitespace-pre-wrap font-sans">{d.appeal_template}</pre>
              </div>
            )}
            {d.training_article_id && articleMap[d.training_article_id] && (
              <Link
                to={`/training#${d.training_article_id}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <GraduationCap className="h-4 w-4" /> Training: {articleMap[d.training_article_id].title}
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}
