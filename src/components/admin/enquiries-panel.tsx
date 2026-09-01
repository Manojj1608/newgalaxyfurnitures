import { useId, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { logAudit, updateEnquiry } from "@/lib/content-api";
import { ENQUIRY_STATUSES, type EnquiryRow } from "@/lib/content-types";
import { useEnquiries } from "@/hooks/use-admin-data";
import { QueryFailed } from "@/components/site/query-state";

import { contentKeys } from "@/hooks/use-content";

export function EnquiriesPanel() {
  const queryClient = useQueryClient();
  const { data: enquiries = [], isLoading, isError, refetch } = useEnquiries();
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<EnquiryRow | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: contentKeys.enquiries() });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enquiries.filter((e) => {
      const matchStatus = status === "All" || e.status === status;
      const matchQ =
        !q ||
        (e.customer_name ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.product_name ?? "").toLowerCase().includes(q);
      return matchStatus && matchQ;
    });
  }, [enquiries, status, query]);

  async function setEnquiryStatus(row: EnquiryRow, next: string) {
    try {
      await updateEnquiry(row.id, { status: next });
      await logAudit("update", "enquiry", row.id, { status: next });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-foreground">Enquiries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {enquiries.length} total · {enquiries.filter((e) => e.status === "new").length} new
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone or product"
          className="h-11"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-11 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All statuses</SelectItem>
            {ENQUIRY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <QueryFailed message="Could not load enquiries." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-10 text-center text-sm text-muted-foreground">
          No enquiries yet.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {e.customer_name || "Anonymous"}
                    </span>
                    <Badge variant={e.status === "new" ? "default" : "secondary"}>{e.status}</Badge>
                    <Badge variant="secondary">{e.channel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                    {e.product_name ? ` · ${e.product_name}` : ""}
                  </p>
                  {e.message && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.message}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {e.phone && (
                      <a href={`tel:${e.phone}`} className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {e.phone}
                      </a>
                    )}
                    {e.phone && (
                      <a
                        href={`https://wa.me/${e.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                    {e.email && (
                      <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {e.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={e.status} onValueChange={(v) => setEnquiryStatus(e, v)}>
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENQUIRY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outlineWarm" onClick={() => setOpen(e)}>
                    Notes
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Enquiry notes</DialogTitle>
            <DialogDescription>{open?.customer_name || "Anonymous"}</DialogDescription>
          </DialogHeader>
          {open && (
            <NotesForm
              row={open}
              onSaved={() => {
                setOpen(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotesForm({ row, onSaved }: { row: EnquiryRow; onSaved: () => void }) {
  // 2.17: one id namespace per mounted instance, so a dialog closed and reopened
  // (or two rows rendered together) can never produce a duplicate id.
  const uid = useId();
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateEnquiry(row.id, { notes: notes || null });
      await logAudit("update", "enquiry", row.id, { notes: true });
      toast.success("Notes saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {row.message && (
        <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {row.message}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${uid}-internal-notes`}>Internal notes</Label>
        <Textarea
          id={`${uid}-internal-notes`}
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" variant="luxury" disabled={saving}>
          {saving ? "Saving…" : "Save notes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
