import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, AlertTriangle, History, ArrowRight, AlertCircle, FileSearch, ScrollText, ShieldAlert } from "lucide-react";
import { needsReview, relativeDate } from "@/lib/dates";
import { RemindersCard } from "@/components/RemindersCard";
import { useAuth } from "@/lib/auth";
import { format, differenceInDays } from "date-fns";

export default function Dashboard() {
  const { isAdmin, isClaimsTracker, user } = useAuth();
  const [stats, setStats] = useState({ payers: 0, rules: 0, training: 0, denials: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [needsReviewList, setNeedsReviewList] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [overdueClaims, setOverdueClaims] = useState<any[]>([]);
  const [pendingPolicies, setPendingPolicies] = useState<any[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<{ user: any; unsignedCount: number; type: string }[]>([]);

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

      // Pending policies for current user
      try {
        const [polRes, ackRes] = await Promise.all([
          supabase.from("policies").select("id,title").eq("published", true).eq("archived", false),
          user
            ? supabase.from("policy_acknowledgements").select("policy_id").eq("user_id", user.id)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const signedIds = new Set(((ackRes as any).data ?? []).map((a: any) => a.policy_id));
        setPendingPolicies((polRes.data ?? []).filter((p: any) => !signedIds.has(p.id)));
      } catch { /* policies table may not exist yet */ }

      // Admin compliance flags
      if (isAdmin) {
        try {
          const [profilesRes, polRes2, allAcksRes] = await Promise.all([
            supabase.from("profiles").select("id,email,display_name,login_count,first_login_at"),
            supabase.from("policies").select("id").eq("published", true).eq("archived", false),
            supabase.from("policy_acknowledgements").select("policy_id,user_id"),
          ]);
          const profiles = (profilesRes.data ?? []) as any[];
          const pols = (polRes2.data ?? []) as any[];
          const ackSet = new Set((allAcksRes.data ?? []).map((a: any) => `${a.user_id}:${a.policy_id}`));
          const flags: { user: any; unsignedCount: number; type: string }[] = [];
          for (const profile of profiles) {
            const unsigned = pols.filter((p: any) => !ackSet.has(`${profile.id}:${p.id}`));
            if (!unsigned.length) continue;
            const loginCount = profile.login_count ?? 0;
            const firstLogin = profile.first_login_at ? new Date(profile.first_login_at) : null;
            const daysSince = firstLogin ? differenceInDays(new Date(), firstLogin) : null;
            if (loginCount >= 2) {
              flags.push({ user: profile, unsignedCount: unsigned.length, type: "second-login" });
            } else if (daysSince !== null && daysSince > 14) {
              flags.push({ user: profile, unsignedCount: unsigned.length, type: "overdue-new-user" });
            }
          }
          setComplianceAlerts(flags);
        } catch { /* policies table may not exist yet */ }
      }
    })();
  }, [isClaimsTracker, isAdmin, user?.id]);

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

      {pendingPolicies.length > 0 && (
        <Link to="/policies">
          <div className="rounded-lg border border-warning/60 bg-warning/10 p-4 flex items-center gap-3 hover:bg-warning/20 transition-colors cursor-pointer">
            <ScrollText className="h-5 w-5 text-warning shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {pendingPolicies.length} polic{pendingPolicies.length === 1 ? "y requires" : "ies require"} your acknowledgement
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Go to Policies to review and sign — required by your second login.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-warning shrink-0" />
          </div>
        </Link>
      )}

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

      {isAdmin && complianceAlerts.length > 0 && (
        <Card className="p-5 border-destructive/40 bg-destructive/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" /> Policy compliance flags
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{complianceAlerts.length}</Badge>
              <Link to="/admin"><Button variant="ghost" size="sm">Manage <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Users with overdue policy acknowledgements.</p>
          <div className="divide-y">
            {complianceAlerts.map((alert, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {alert.user.display_name || alert.user.email || "Unknown user"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{alert.user.email}</div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div>
                    <Badge variant="destructive" className="text-xs">{alert.unsignedCount} unsigned</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {alert.type === "second-login"
                      ? `Logged in ${alert.user.login_count}× — past 2nd login deadline`
                      : "14-day new user window expired"}
                  </div>
                </div>
              </div>
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
