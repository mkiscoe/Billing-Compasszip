import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { needsReview, formatDate } from "@/lib/dates";
import { AlertCircle, Search } from "lucide-react";
import { RequestPayerDialog } from "@/components/RequestPayerDialog";

export default function Payers() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payers")
        .select("*, payer_rules(count)")
        .eq("archived", false)
        .order("name");
      setRows(data ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(t) || r.payer_type.toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payer directory</h1>
          <p className="text-sm text-muted-foreground">{rows.length} active payers</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <RequestPayerDialog />
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Timely filing</TableHead>
              <TableHead className="text-right">Appeal limit</TableHead>
              <TableHead>Prior auth</TableHead>
              <TableHead className="text-right">Rules</TableHead>
              <TableHead>Last reviewed</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const stale = needsReview(p.last_reviewed_at);
              const ruleCount = Array.isArray(p.payer_rules) ? (p.payer_rules[0]?.count ?? 0) : 0;
              return (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link to={`/payers/${p.id}`} className="hover:text-primary">{p.name}</Link>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{p.payer_type}</Badge></TableCell>
                  <TableCell className="text-right">{p.timely_filing_days ? `${p.timely_filing_days}d` : "—"}</TableCell>
                  <TableCell className="text-right">{p.appeal_limit_days ? `${p.appeal_limit_days}d` : "—"}</TableCell>
                  <TableCell>{p.prior_auth_required ? <Badge>Required</Badge> : <span className="text-muted-foreground text-sm">No</span>}</TableCell>
                  <TableCell className="text-right text-sm">{ruleCount}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.last_reviewed_at)}</TableCell>
                  <TableCell>{stale && <Badge variant="outline" className="text-warning border-warning gap-1"><AlertCircle className="h-3 w-3" />Review</Badge>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
