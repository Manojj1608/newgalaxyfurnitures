import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  deleteBanner,
  logAudit,
  reorderSections,
  saveBanner,
  saveSection,
  uploadProductImage,
} from "@/lib/content-api";
import { SECTION_LABELS, type HeroBanner, type HomepageSection } from "@/lib/content-types";
import { useBanners, useSections } from "@/hooks/use-content";
import { changedRows, resequence } from "@/lib/ordering";
import { QueryFailed } from "@/components/site/query-state";

/**
 * Module-private (not exported, so it adds no react-refresh warning). Names a
 * section the same way the visible row label does, so 2.16's accessible names
 * state action + target using the wording the admin already sees.
 */
function sectionLabel(s: HomepageSection): string {
  return SECTION_LABELS[s.section_type] ?? s.section_type;
}

export function HomepagePanel() {
  return (
    <Tabs defaultValue="sections" className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-foreground">Homepage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reorder or switch off sections, and manage the hero slideshow.
        </p>
      </div>
      <TabsList>
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="banners">Hero banners</TabsTrigger>
      </TabsList>
      <TabsContent value="sections">
        <SectionsList />
      </TabsContent>
      <TabsContent value="banners">
        <BannersList />
      </TabsContent>
    </Tabs>
  );
}

function SectionsList() {
  const queryClient = useQueryClient();
  const { data: sections = [], isLoading, isError, refetch } = useSections(true);
  const [edit, setEdit] = useState<HomepageSection | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["sections"] });
  const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  async function toggle(s: HomepageSection, enabled: boolean) {
    try {
      await saveSection({ enabled }, s.id);
      await logAudit("update", "homepage_section", s.id, { enabled });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    try {
      await reorderSections(next.map((s, i) => ({ id: s.id, sort_order: i })));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  }

  if (isError)
    return (
      <QueryFailed message="Could not load homepage sections." onRetry={() => void refetch()} />
    );
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-3">
      {ordered.map((s, i) => (
        <div
          key={s.id}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4"
        >
          <span className="w-8 text-center text-sm text-muted-foreground">{i + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                {SECTION_LABELS[s.section_type] ?? s.section_type}
              </span>
              {!s.enabled && <Badge variant="secondary">Hidden</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{s.title || "No heading"}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => move(i, -1)}
            disabled={i === 0}
            aria-label={`Move ${sectionLabel(s)} up`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => move(i, 1)}
            disabled={i === ordered.length - 1}
            aria-label={`Move ${sectionLabel(s)} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s, v)} aria-label="Enabled" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEdit(s)}
            aria-label={`Edit ${sectionLabel(s)}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Section copy</DialogTitle>
            <DialogDescription>
              {edit ? (SECTION_LABELS[edit.section_type] ?? edit.section_type) : ""}
            </DialogDescription>
          </DialogHeader>
          {edit && (
            <SectionForm
              section={edit}
              onSaved={() => {
                setEdit(null);
                refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionForm({ section, onSaved }: { section: HomepageSection; onSaved: () => void }) {
  // 2.17: one id namespace per mounted instance, so a dialog closed and reopened
  // (or two rows rendered together) can never produce a duplicate id.
  const uid = useId();
  const [title, setTitle] = useState(section.title ?? "");
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSection({ title: title || null, subtitle: subtitle || null }, section.id);
      await logAudit("update", "homepage_section", section.id, { title });
      toast.success("Section updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${uid}-heading`}>Heading</Label>
        <Input id={`${uid}-heading`} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${uid}-sub-heading`}>Sub-heading</Label>
        <Input
          id={`${uid}-sub-heading`}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="submit" variant="luxury" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

type BannerForm = {
  image_url: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  button_text: string;
  button_link: string;
  priority: number;
  active: boolean;
};

const emptyBanner: BannerForm = {
  image_url: "",
  title: "",
  subtitle: "",
  eyebrow: "",
  button_text: "",
  button_link: "",
  priority: 0,
  active: true,
};

function BannersList() {
  const queryClient = useQueryClient();
  const {
    data: banners = [],
    isLoading,
    isError: bannersError,
    refetch: refetchBanners,
  } = useBanners(true);
  const [edit, setEdit] = useState<{ open: boolean; row: HeroBanner | null }>({
    open: false,
    row: null,
  });
  const [confirm, setConfirm] = useState<HeroBanner | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["banners"] });
  const ordered = [...banners].sort((a, b) => a.priority - b.priority);

  async function toggle(b: HeroBanner, active: boolean) {
    try {
      await saveBanner({ active }, b.id);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    // 1.20: swapping two `priority` values is a no-op whenever siblings share a
    // value. Re-sequence the whole list densely instead, and write only the rows
    // whose value actually changed — each of which now reports affected rows.
    const target = ordered[index];
    if (!target) return;
    const before = ordered.map((b) => ({ id: b.id, order: b.priority }));
    const after = resequence(before, target.id, dir);
    const changes = changedRows(before, after);
    if (changes.length === 0) return;
    try {
      await Promise.all(changes.map((row) => saveBanner({ priority: row.order }, row.id)));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  }

  async function remove(b: HeroBanner) {
    try {
      await deleteBanner(b.id);
      await logAudit("delete", "hero_banner", b.id, { title: b.title });
      toast.success("Banner deleted");
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="luxury" onClick={() => setEdit({ open: true, row: null })}>
          <Plus /> New banner
        </Button>
      </div>
      {bannersError ? (
        <QueryFailed message="Could not load hero banners." onRetry={() => void refetchBanners()} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          No hero banners yet.
        </p>
      ) : (
        <div className="space-y-3">
          {ordered.map((b, i) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/60 p-4"
            >
              <img src={b.image_url} alt="" className="h-14 w-24 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{b.title}</span>
                  {!b.active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{b.subtitle}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move banner ${b.title} up`}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                aria-label={`Move banner ${b.title} down`}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Switch
                checked={b.active}
                onCheckedChange={(v) => toggle(b, v)}
                aria-label="Active"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEdit({ open: true, row: b })}
                aria-label={`Edit banner ${b.title}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirm(b)}
                aria-label={`Delete banner ${b.title}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <BannerDialog
        open={edit.open}
        row={edit.row}
        nextPriority={ordered.length}
        onClose={() => setEdit({ open: false, row: null })}
        onSaved={() => {
          setEdit({ open: false, row: null });
          refresh();
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.title} will be removed from the hero slideshow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && remove(confirm)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BannerDialog({
  open,
  row,
  nextPriority,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: HeroBanner | null;
  nextPriority: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  // 2.17: one id namespace per mounted instance, so a dialog closed and reopened
  // (or two rows rendered together) can never produce a duplicate id.
  const uid = useId();
  const [form, setForm] = useState<BannerForm>(emptyBanner);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [key, setKey] = useState("");

  const signature = `${open}-${row?.id ?? "new"}`;
  if (open && key !== signature) {
    setKey(signature);
    setForm(
      row
        ? {
            image_url: row.image_url,
            title: row.title,
            subtitle: row.subtitle ?? "",
            eyebrow: row.eyebrow ?? "",
            button_text: row.button_text ?? "",
            button_link: row.button_link ?? "",
            priority: row.priority,
            active: row.active,
          }
        : { ...emptyBanner, priority: nextPriority },
    );
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const img = await uploadProductImage(file);
      setForm((f) => ({ ...f, image_url: img.url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.image_url) throw new Error("An image is required");
      if (!form.title.trim()) throw new Error("A title is required");
      await saveBanner(
        {
          image_url: form.image_url,
          title: form.title.trim(),
          subtitle: form.subtitle || null,
          eyebrow: form.eyebrow || null,
          button_text: form.button_text || null,
          button_link: form.button_link || null,
          priority: Number(form.priority) || 0,
          active: form.active,
        },
        row?.id,
      );
      await logAudit(row ? "update" : "create", "hero_banner", row?.id, { title: form.title });
      toast.success(row ? "Banner updated" : "Banner created");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {row ? "Edit banner" : "New banner"}
          </DialogTitle>
          <DialogDescription>
            Hero slides rotate in priority order on the homepage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`${uid}-image`}>Image *</Label>
            {form.image_url ? (
              <div className="relative overflow-hidden rounded-xl border border-border/60">
                <img src={form.image_url} alt="" className="aspect-[21/9] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wider"
                >
                  Replace
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 p-8 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload image"}
                <input
                  id={`${uid}-image`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-eyebrow`}>Eyebrow</Label>
              <Input
                id={`${uid}-eyebrow`}
                value={form.eyebrow}
                onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-title`}>Title *</Label>
              <Input
                id={`${uid}-title`}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${uid}-subtitle`}>Subtitle</Label>
              <Input
                id={`${uid}-subtitle`}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-button-text`}>Button text</Label>
              <Input
                id={`${uid}-button-text`}
                value={form.button_text}
                onChange={(e) => setForm({ ...form, button_text: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-button-link`}>Button link</Label>
              <Input
                id={`${uid}-button-link`}
                value={form.button_link}
                onChange={(e) => setForm({ ...form, button_link: e.target.value })}
                placeholder="#catalogue"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-priority`}>Priority</Label>
              <Input
                id={`${uid}-priority`}
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-4 text-sm">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" disabled={saving}>
              {saving ? "Saving…" : row ? "Save changes" : "Create banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
