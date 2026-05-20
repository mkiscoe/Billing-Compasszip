import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type Hit = { kind: string; id: string; label: string; sub: string; href: string };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const handle = setTimeout(async () => {
      const term = `%${q}%`;
      const [payers, rules, training, denials] = await Promise.all([
        supabase.from("payers").select("id,name,payer_type").ilike("name", term).eq("archived", false).limit(5),
        supabase.from("payer_rules").select("id,title,payer_id,category").or(`title.ilike.${term},body.ilike.${term}`).eq("archived", false).limit(5),
        supabase.from("training_articles").select("id,title,category").or(`title.ilike.${term},body.ilike.${term}`).eq("archived", false).limit(5),
        supabase.from("denial_guides").select("id,denial_code,denial_reason").or(`denial_reason.ilike.${term},denial_code.ilike.${term},how_to_fix.ilike.${term}`).eq("archived", false).limit(5),
      ]);
      const out: Hit[] = [];
      payers.data?.forEach((p: any) => out.push({ kind: "Payer", id: p.id, label: p.name, sub: p.payer_type, href: `/payers/${p.id}` }));
      rules.data?.forEach((r: any) => out.push({ kind: "Rule", id: r.id, label: r.title, sub: r.category ?? "", href: `/payers/${r.payer_id}` }));
      training.data?.forEach((t: any) => out.push({ kind: "Training", id: t.id, label: t.title, sub: t.category, href: `/training` }));
      denials.data?.forEach((d: any) => out.push({ kind: "Denial", id: d.id, label: d.denial_code ? `${d.denial_code} — ${d.denial_reason}` : d.denial_reason, sub: "", href: `/denials` }));
      setHits(out);
      setOpen(true);
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="relative" ref={ref}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder="Search payers, rules, training, denials…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
      />
      {open && hits.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-popover border rounded-md shadow-lg max-h-96 overflow-auto z-50">
          {hits.map((h) => (
            <button
              key={`${h.kind}-${h.id}`}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2"
              onClick={() => { nav(h.href); setOpen(false); setQ(""); }}
            >
              <div className="min-w-0">
                <div className="text-sm truncate">{h.label}</div>
                {h.sub && <div className="text-xs text-muted-foreground truncate">{h.sub}</div>}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{h.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
