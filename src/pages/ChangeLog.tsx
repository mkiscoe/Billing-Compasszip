import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";

export default function ChangeLog() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("change_log").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Change log</h1>
        <p className="text-sm text-muted-foreground">Recent updates to payer rules and reference content.</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <ul className="divide-y">
          {rows.map((u) => (
            <li key={u.id} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge variant="secondary">{u.entity_type}</Badge>
                  {u.entity_label && <span className="text-sm font-medium truncate">{u.entity_label}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{u.summary}</p>
              </div>
              <div className="text-xs text-muted-foreground text-right shrink-0">
                <div>{formatDate(u.created_at)}</div>
                <div>{u.author_name ?? "System"}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
