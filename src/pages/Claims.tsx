import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus, CheckCircle2, Trash2, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

type Payer = { id: string; name: string };
type Claim = {
  id: string;
  run_number: string;
  run_numbers: string[] | null;
  payer_id: string | null;
  notes: string;
  follow_up_date: string;
  status: string;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  payers?: { name: string } | null;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const plus14 = () => { const d = new Date(); d.setDate(d.getDate() + 14); return d; };

export default function Claims() {
  const { user, isAdmin, isClaimsTracker, loading } = useAuth();
  const [rows, setRows] = useState<Claim[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "closed">("open");
  const [openNew, setOpenNew] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("claims_tracking")
      .select("*, payers(name)")
      .order("follow_up_date", { ascending: true });
    setRows((data ?? []) as any);
  }
  async function loadPayers() {
    const { data } = await supabase.from("payers").select("id,name").eq("archived", false).order("name");
    setPayers(data ?? []);
  }
  useEffect(() => { if (!loading && isClaimsTracker) { load(); loadPayers(); } }, [loading, isClaimsTracker]);

  const filtered = useMemo(() => {
    const t = todayISO();
    const s = search.toLowerCase();
    return rows.filter((r) => {
      if (filter === "open" && r.status !== "open") return false;
      if (filter === "closed" && r.status !== "closed") return false;
      if (filter === "overdue" && !(r.status === "open" && r.follow_up_date <= t)) return false;
      const allRuns = [r.run_number, ...(r.run_numbers ?? [])].join(" ").toLowerCase();
      if (s && !allRuns.includes(s) && !(r.notes || "").toLowerCase().includes(s) && !(r.payers?.name || "").toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, search, filter]);

  async function markResolved(id: string) {
    const { error } = await supabase.from("claims_tracking").update({ status: "closed", resolved_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked resolved");
    load();
  }
  async function reopen(id: string) {
    const { error } = await supabase.from("claims_tracking").update({ status: "open", resolved_at: null }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this claim entry?")) return;
    const { error } = await supabase.from("claims_tracking").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  if (loading) return null;
  if (!isClaimsTracker) {
    return (
      <Card className="p-8 text-center">
        <h2 className="font-semibold">Permission required</h2>
        <p className="text-sm text-muted-foreground mt-1">You don't have access to Claims Tracking. Ask an admin to grant the claims tracker permission.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Claims tracking</h1>
          <p className="text-sm text-muted-foreground">Log submitted claims and follow up on the reminder date.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New entry</Button></DialogTrigger>
          <ClaimDialog mode="new" payers={payers} userId={user?.id ?? ""} userName={user?.email ?? ""} onSaved={() => { setOpenNew(false); load(); }} />
        </Dialog>
      </div>

      <Card className="p-3 flex flex-wrap gap-2 items-center">
        <Input placeholder="Search run number, payer, notes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run #</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Follow-up</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Owner</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-sm text-muted-foreground py-8">No entries.</TableCell></TableRow>
            )}
            {filtered.map((r) => {
              const overdue = r.status === "open" && r.follow_up_date <= todayISO();
              const extraCount = (r.run_numbers?.length ?? 0);
              return (
                <TableRow key={r.id} className={cn(overdue && "bg-destructive/5")}>
                  <TableCell>
                    <div className="font-mono text-sm">{r.run_number}</div>
                    {extraCount > 0 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        +{extraCount} more: {r.run_numbers!.join(", ")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{r.payers?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-md"><div className="text-sm whitespace-pre-wrap line-clamp-3">{r.notes || <span className="text-muted-foreground">—</span>}</div></TableCell>
                  <TableCell>
                    <span className={cn("text-sm", overdue && "text-destructive font-medium")}>
                      {format(new Date(r.follow_up_date + "T00:00:00"), "MMM d, yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.status === "closed" ? (
                      <Badge variant="secondary">Closed</Badge>
                    ) : overdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : (
                      <Badge variant="outline">Open</Badge>
                    )}
                  </TableCell>
                  {isAdmin && <TableCell className="text-sm text-muted-foreground">{r.created_by_name ?? r.created_by.slice(0, 8)}</TableCell>}
                  <TableCell className="text-right space-x-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Pencil className="h-3 w-3" /></Button>
                      </DialogTrigger>
                      <ClaimDialog mode="edit" claim={r} payers={payers} userId={user?.id ?? ""} userName={user?.email ?? ""} onSaved={load} />
                    </Dialog>
                    {r.status === "open" ? (
                      <Button size="sm" variant="outline" onClick={() => markResolved(r.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Resolve</Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => reopen(r.id)}>Reopen</Button>
                    )}
                    {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ClaimDialog({
  mode,
  claim,
  payers,
  userId,
  userName,
  onSaved,
}: {
  mode: "new" | "edit";
  claim?: Claim;
  payers: Payer[];
  userId: string;
  userName: string;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const [runNumber, setRunNumber] = useState(claim?.run_number ?? "");
  const [extraRuns, setExtraRuns] = useState<string[]>(claim?.run_numbers ?? []);
  const [newExtra, setNewExtra] = useState("");
  const [payerId, setPayerId] = useState<string>(claim?.payer_id ?? "");
  const [notes, setNotes] = useState(claim?.notes ?? "");
  const [date, setDate] = useState<Date>(
    claim ? new Date(claim.follow_up_date + "T00:00:00") : plus14()
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!runNumber.trim()) return toast.error("Run number is required");
    setSaving(true);
    const payload = {
      run_number: runNumber.trim(),
      run_numbers: extraRuns.length ? extraRuns : null,
      payer_id: payerId || null,
      notes,
      follow_up_date: date.toISOString().slice(0, 10),
    };
    if (isEdit && claim) {
      const { error } = await supabase.from("claims_tracking").update(payload).eq("id", claim.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Claim updated");
    } else {
      const { error } = await supabase.from("claims_tracking").insert({
        ...payload,
        created_by: userId,
        created_by_name: userName,
      });
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Claim logged");
      setRunNumber(""); setExtraRuns([]); setPayerId(""); setNotes(""); setDate(plus14());
    }
    onSaved();
  }

  function addExtraRun() {
    const v = newExtra.trim();
    if (!v) return;
    if (v === runNumber.trim() || extraRuns.includes(v)) {
      toast.error("Run number already added");
      return;
    }
    setExtraRuns([...extraRuns, v]);
    setNewExtra("");
  }

  function removeExtraRun(idx: number) {
    setExtraRuns(extraRuns.filter((_, i) => i !== idx));
  }

  return (
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>{isEdit ? "Edit claim" : "New claim tracking entry"}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Run number *</Label>
          <Input value={runNumber} onChange={(e) => setRunNumber(e.target.value)} placeholder="e.g. 123456" />
        </div>

        <div>
          <Label>Additional run numbers</Label>
          <div className="flex gap-2">
            <Input value={newExtra} onChange={(e) => setNewExtra(e.target.value)} placeholder="Add another run number" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExtraRun(); } }} />
            <Button type="button" variant="outline" onClick={addExtraRun}><Plus className="h-4 w-4" /></Button>
          </div>
          {extraRuns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {extraRuns.map((run, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {run}
                  <button onClick={() => removeExtraRun(i)} className="ml-1 rounded-sm hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Payer</Label>
          <Select value={payerId} onValueChange={setPayerId}>
            <SelectTrigger><SelectValue placeholder="Select payer (optional)" /></SelectTrigger>
            <SelectContent>
              {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Notes (how submitted / reason tracking)</Label>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <Label>Follow-up date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground mt-1">Defaults to two weeks from today.</p>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : (isEdit ? "Update" : "Save")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
