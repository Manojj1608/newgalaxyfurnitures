import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

import { deleteCategory, logAudit, saveCategory, uploadProductImage } from "@/lib/content-api";
import { slugify, type CategoryRow } from "@/lib/content-types";
import { useCategories, useProducts } from "@/hooks/use-content";
import { changedRows, resequence } from "@/lib/ordering";
import { QueryFailed } from "@/components/site/query-state";

type Form = {
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  thumbnail_url: string;
  banner_url: string;
  display_order: number;
  visible: boolean;
  meta_title: string;
  meta_description: string;
};

const empty: Form = {
  name: "",
  slug: "",
  description: "",
  parent_id: null,
  thumbnail_url: "",
  banner_url: "",
  display_order: 0,
  visible: true,
  meta_title: "",
  meta_description: "",
};

export function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading, isError, refetch } = useCategories(true);
  const { data: products = [] } = useProducts(true);
  const [edit, setEdit] = useState<{ open: boolean; row: CategoryRow | null }>({
    open: false,
    row: null,
  });
  const [confirm, setConfirm] = useState<CategoryRow | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["categories"] });

  async function move(row: CategoryRow, dir: -1 | 1) {
    // 1.20: the seed in 20260802160613 gave display_order = 99 to EVERY category
    // derived from products.category, so the old two-row swap wrote 99 and 99 and
    // nothing moved. Re-sequence the sibling list densely instead.
    const before = categories
      .filter((c) => c.parent_id === row.parent_id)
      .map((c) => ({ id: c.id, order: c.display_order }));
    const after = resequence(before, row.id, dir);
    const changes = changedRows(before, after);
    if (changes.length === 0) return;
    try {
      await Promise.all(changes.map((c) => saveCategory({ display_order: c.order }, c.id)));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  }

  async function toggleVisible(row: CategoryRow, visible: boolean) {
    try {
      await saveCategory({ visible }, row.id);
      await logAudit("update", "category", row.id, { visible });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function remove(row: CategoryRow) {
    try {
      await deleteCategory(row.id);
      await logAudit("delete", "category", row.id, { name: row.name });
      toast.success("Collection deleted");
      setConfirm(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const tops = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.display_order - b.display_order);

  function countFor(c: CategoryRow) {
    return products.filter((p) => p.category_id === c.id || p.category === c.name).length;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-foreground">Collections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Order, rename and hide the collections shown across the site.
          </p>
        </div>
        <Button variant="luxury" size="lg" onClick={() => setEdit({ open: true, row: null })}>
          <Plus /> New collection
        </Button>
      </div>

      {isError ? (
        <QueryFailed message="Could not load collections." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {tops.map((c) => {
            const children = categories
              .filter((k) => k.parent_id === c.id)
              .sort((a, b) => a.display_order - b.display_order);
            return (
              <div key={c.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {c.thumbnail_url ? (
                    <img
                      src={c.thumbnail_url}
                      alt=""
                      className="product-media product-media-img h-12 w-12 rounded-lg"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <Badge variant="secondary">{countFor(c)} pieces</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">/{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(c, -1)}
                      aria-label={`Move ${c.name} up`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(c, 1)}
                      aria-label={`Move ${c.name} down`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={c.visible}
                      onCheckedChange={(v) => toggleVisible(c, v)}
                      aria-label="Visible"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEdit({ open: true, row: c })}
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm(c)}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {children.length > 0 && (
                  <div className="mt-3 space-y-2 border-l border-border/60 pl-4">
                    {children.map((k) => (
                      <div key={k.id} className="flex items-center gap-3">
                        <span className="flex-1 text-sm text-foreground">{k.name}</span>
                        <Switch checked={k.visible} onCheckedChange={(v) => toggleVisible(k, v)} />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEdit({ open: true, row: k })}
                          aria-label={`Edit ${k.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirm(k)}
                          aria-label={`Delete ${k.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CategoryDialog
        open={edit.open}
        row={edit.row}
        parents={tops}
        nextOrder={tops.length}
        onClose={() => setEdit({ open: false, row: null })}
        onSaved={() => {
          setEdit({ open: false, row: null });
          refresh();
        }}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.name} will be removed. Products in it stay in the catalogue but lose this
              collection.
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

function CategoryDialog({
  open,
  row,
  parents,
  nextOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: CategoryRow | null;
  parents: CategoryRow[];
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  // 2.17: one id namespace per mounted instance, so a dialog closed and reopened
  // (or two rows rendered together) can never produce a duplicate id.
  const uid = useId();
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"thumb" | "banner" | null>(null);
  const [key, setKey] = useState("");

  const signature = `${open}-${row?.id ?? "new"}`;
  if (open && key !== signature) {
    setKey(signature);
    setForm(
      row
        ? {
            name: row.name,
            slug: row.slug,
            description: row.description ?? "",
            parent_id: row.parent_id,
            thumbnail_url: row.thumbnail_url ?? "",
            banner_url: row.banner_url ?? "",
            display_order: row.display_order,
            visible: row.visible,
            meta_title: row.meta_title ?? "",
            meta_description: row.meta_description ?? "",
          }
        : { ...empty, display_order: nextOrder },
    );
  }

  async function upload(kind: "thumb" | "banner", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    try {
      const img = await uploadProductImage(file);
      setForm((f) => ({ ...f, [kind === "thumb" ? "thumbnail_url" : "banner_url"]: img.url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const name = form.name.trim();
      if (!name) throw new Error("Name is required");
      const saved = await saveCategory(
        {
          name,
          slug: form.slug || slugify(name),
          description: form.description || null,
          parent_id: form.parent_id,
          thumbnail_url: form.thumbnail_url || null,
          banner_url: form.banner_url || null,
          display_order: Number(form.display_order) || 0,
          visible: form.visible,
          meta_title: form.meta_title || null,
          meta_description: form.meta_description || null,
        },
        row?.id,
      );
      await logAudit(row ? "update" : "create", "category", saved.id, { name: saved.name });
      toast.success(row ? "Collection updated" : "Collection created");
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
            {row ? "Edit collection" : "New collection"}
          </DialogTitle>
          <DialogDescription>
            Collections drive the homepage grid and catalogue filters.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-name`}>Name *</Label>
              <Input
                id={`${uid}-name`}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: row ? f.slug : slugify(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-slug`}>Slug</Label>
              <Input
                id={`${uid}-slug`}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-parent-collection`}>Parent collection</Label>
              <Select
                value={form.parent_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? null : v })}
              >
                <SelectTrigger id={`${uid}-parent-collection`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top level</SelectItem>
                  {parents
                    .filter((p) => p.id !== row?.id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-display-order`}>Display order</Label>
              <Input
                id={`${uid}-display-order`}
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${uid}-description`}>Description</Label>
              <Textarea
                id={`${uid}-description`}
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["thumb", "Thumbnail", form.thumbnail_url, "thumbnail_url"],
                ["banner", "Banner", form.banner_url, "banner_url"],
              ] as const
            ).map(([kind, label, url, field]) => (
              <div key={kind} className="space-y-2">
                <Label htmlFor={`${uid}-${kind}`}>{label}</Label>
                {url ? (
                  <div className="relative overflow-hidden rounded-xl border border-border/60">
                    <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, [field]: "" }))}
                      className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] uppercase tracking-wider"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 p-6 text-xs uppercase tracking-[0.24em] text-muted-foreground hover:bg-accent">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading === kind ? "Uploading…" : "Upload"}
                    <input
                      id={`${uid}-${kind}`}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        upload(kind, e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${uid}-meta-title`}>Meta title</Label>
              <Input
                id={`${uid}-meta-title`}
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${uid}-meta-description`}>Meta description</Label>
              <Input
                id={`${uid}-meta-description`}
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-border/60 p-4 text-sm">
            <Switch
              checked={form.visible}
              onCheckedChange={(v) => setForm({ ...form, visible: v })}
            />
            Visible on the website
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" disabled={saving}>
              {saving ? "Saving…" : row ? "Save changes" : "Create collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
