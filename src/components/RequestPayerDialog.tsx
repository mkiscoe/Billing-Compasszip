import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const blank = {
  run_number: "",
  insurance_name: "",
  claims_address: "",
  phone: "",
  fax: "",
  electronic_payer_id: "",
};

export function RequestPayerDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.run_number.trim() || !form.insurance_name.trim() || !form.claims_address.trim()) {
      return toast.error("Run number, insurance name, and claims address are required");
    }
    if (!user) return toast.error("Not signed in");
    setSaving(true);
    const { error } = await supabase.from("payer_requests").insert({
      ...form,
      submitter_id: user.id,
      submitter_email: user.email ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted for admin review");
    setForm(blank);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Request new payer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Request a new payer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Run number *</Label>
            <Input value={form.run_number} onChange={(e) => setForm({ ...form, run_number: e.target.value })} />
          </div>
          <div>
            <Label>Insurance name *</Label>
            <Input value={form.insurance_name} onChange={(e) => setForm({ ...form, insurance_name: e.target.value })} />
          </div>
          <div>
            <Label>Claims address *</Label>
            <Textarea rows={3} value={form.claims_address} onChange={(e) => setForm({ ...form, claims_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Fax</Label>
              <Input value={form.fax} onChange={(e) => setForm({ ...form, fax: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Electronic payer ID</Label>
            <Input value={form.electronic_payer_id} onChange={(e) => setForm({ ...form, electronic_payer_id: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
