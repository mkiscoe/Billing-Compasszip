import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "lucide-react";

export default function Training() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.from("training_articles").select("*").eq("archived", false).order("category").then(({ data }) => setRows(data ?? []));
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash || rows.length === 0) return;
    setOpenId(hash);
    setTimeout(() => {
      const el = document.getElementById(`article-${hash}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [rows]);

  const grouped = useMemo(() => {
    const t = q.trim().toLowerCase();
    const filtered = t ? rows.filter((r) => r.title.toLowerCase().includes(t) || r.body.toLowerCase().includes(t)) : rows;
    const map: Record<string, any[]> = {};
    filtered.forEach((r) => { (map[r.category] ||= []).push(r); });
    return map;
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Training library</h1>
          <p className="text-sm text-muted-foreground">For new billing hires. Articles by category.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold">{cat}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <Accordion type="single" collapsible className="w-full" value={openId} onValueChange={setOpenId}>
              {items.map((a) => (
                <AccordionItem key={a.id} value={a.id} id={`article-${a.id}`}>
                  <AccordionTrigger>{a.title}</AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                    {Array.isArray(a.attachments) && a.attachments.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {a.attachments.map((att: any, i: number) => (
                          <div key={i} className="border rounded-md p-3 bg-muted/30">
                            <div className="text-sm font-medium mb-2">
                              {att.type === "video" ? "🎬" : "📄"} {att.name}
                            </div>
                            {att.type === "video" ? (
                              <video src={att.url} controls className="w-full max-h-96 rounded" />
                            ) : att.type === "pdf" ? (
                              <>
                                <iframe src={att.url} title={att.name} className="w-full h-96 rounded border bg-background" />
                                <a href={att.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Open in new tab</a>
                              </>
                            ) : (
                              <a href={att.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Download</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        ))}
      </div>
    </div>
  );
}
