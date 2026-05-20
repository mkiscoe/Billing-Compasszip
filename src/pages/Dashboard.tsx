import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, AlertTriangle, History, ArrowRight, AlertCircle, FileSearch } from "lucide-react";
import { needsReview, relativeDate } from "@/lib/dates";
import { RemindersCard } from "@/components/RemindersCard";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

export default function Dashboard() {
  const { isClaimsTracker } = useAuth();
  const [stats, setStats] = useState({ payers: 0, rules: 0, training: 0, denials: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [needsReviewList, setNeedsReviewList] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [overdueClaims, setOverdueClaims] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, r, t, d, recentRules, log] = await Promise.all([
        supabase.from("payers").select("*", { count: "exact", head: true }).eq("archived", false),
        supabase.from("payer_rules").select("*", { count: "exact", head: true }).eq("archived", false),
        supabase.from("training_articles").select("*", { count: "exact", head: true }).eq("archived", false),
        supabase.from("denial_guides").select("*", { count: "exact", head: true }).eq("archived", false),
        supabase.from("payer_rules").select("id,title,category,last_reviewed_at,updated_at,payer_id,payers(name)").eq("archived", false).order("updated_at", { ascending: false }).limit(20),
        supabase.from("change_log").select("*").order("created_at", { ascending: false }).limit(6),
      ]);
      setStats({ payers: p.count ?? 0, rules: r.count ?? 0, training: t.count ?? 0, denials: d.count ?? 0 });
      const rules = recentRules.data ?? [];
      setRecent(rules.slice(0, 6));
      setNeedsReviewList(rules.filter((x: any) => needsReview(x.last_reviewed_at)).slice(0, 6));
      setUpdates(log.data ?? []);

      if (isClaimsTracker) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: claims } = await supabase
          .from("claims_tracking")
          .select("id,run_number,follow_up_date,notes,created_by_name,payers(name)")
          .eq("status", "open")
          .lte("follow_up_date", today)
          .order("follow_up_date", { ascending: true })
          .limit(20);
        setOverdueClaims(claims ?? []);
      }
    })();
  }, [isClaimsTracker]);

  const tiles = [
    { label: "Payers", value: stats.payers, icon: Building2, href: "/payers" },
    { label: "Training articles", value: stats.training, icon: GraduationCap, href: "/training" },
    { label: "Denial guides", value: stats.denials, icon: AlertTriangle, href: "/denials" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Operations dashboard</h1>
        <p className="text-sm text-muted-foreground">Reference guidance for ambulance medical billing.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.href}>
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</div>
                  <div className="text-2xl font-semibold mt-1">{t.value}</div>
                </div>
                <t.icon className="h-5 w-5 text-primary" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {isClaimsTracker && overdueClaims.length > 0 && (
        <Card className="p-5 border-destructive/40 bg-destructive/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-destructive">
              <FileSearch className="h-4 w-4" /> Claims due for follow-up
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{overdueClaims.length}</Badge>
              <Link to="/claims"><Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
          </div>
          <div className="divide-y">
            {overdueClaims.slice(0, 8).map((c: any) => (
              <Link key={c.id} to="/claims" className="block py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      <span className="font-mono">{c.run_number}</span> · {c.payers?.name ?? "No payer"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{c.notes || "—"}</div>
                  </div>
                  <span className="text-xs text-destructive shrink-0">
                    {format(new Date(c.follow_up_date + "T00:00:00"), "MMM d")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recently updated rules</h2>
            <Link to="/payers"><Button variant="ghost" size="sm">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
          </div>
          <div className="divide-y">
            {recent.length === 0 && <p className="text-sm text-muted-foreground py-4">No rules yet.</p>}
            {recent.map((r) => (
              <Link key={r.id} to={`/payers/${r.payer_id}`} className="block py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{(r.payers as any)?.name} · {r.category ?? "General"}</div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{relativeDate(r.updated_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" /> Needs review
            </h2>
            <Badge variant="outline" className="text-warning border-warning">{needsReviewList.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Rules not reviewed in the last 90 days.</p>
          <div className="divide-y">
            {needsReviewList.length === 0 && <p className="text-sm text-muted-foreground py-4">All rules current.</p>}
            {needsReviewList.map((r) => (
              <Link key={r.id} to={`/payers/${r.payer_id}`} className="block py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{(r.payers as any)?.name}</div>
                  </div>
                  <span className="text-xs text-warning shrink-0">{relativeDate(r.last_reviewed_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <RemindersCard />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Latest updates</h2>
          <Link to="/change-log"><Button variant="ghost" size="sm">Full log <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
        </div>
        <div className="divide-y">
          {updates.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm"><span className="font-medium">{u.entity_label ?? u.entity_type}</span> — {u.summary}</div>
                <div className="text-xs text-muted-foreground">{u.author_name ?? "System"} · {relativeDate(u.created_at)}</div>
              </div>
              <Badge variant="secondary">{u.entity_type}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
