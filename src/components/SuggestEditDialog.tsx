import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type TargetType = "payer" | "payer_rule" | "denial_guide";

interface Props {
  targetType: TargetType;
  targetId?: string | null;
  targetLabel: string;
  triggerLabel?: string;
  variant?: "outline" | "ghost" | "secondary" | "default";
  size?: "sm" | "default";
}

export default function SuggestEditDialog({
  targetType, targetId, targetLabel, triggerLabel = "Suggest update", variant = "outline", size = "sm",
}: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!user) return toast.error("Sign in required");
    if (body.trim().length < 5) return toast.error("Please describe the change");
    setSaving(true);
    const { error } = await supabase.from("suggestions").insert({
      submitter_id: user.id,
      submitter_email: user.email,
      target_type: targetType,
      target_id: targetId ?? null,
      target_label: targetLabel,
      body: body.trim(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Suggestion submitted for admin review");
    setBody("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <MessageSquarePlus className="h-3.5 w-3.5 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest an update</DialogTitle>
          <DialogDescription>
            Describe the change for <span className="font-medium text-foreground">{targetLabel}</span>. An admin will review and apply approved updates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>What should change?</Label>
          <Textarea
            rows={6}
            placeholder="e.g. Timely filing is now 120 days per the new 2026 contract. Source: …"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Submitting…" : "Submit suggestion"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
