import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  GripVertical,
  Image as ImageIcon,
  LogOut,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  PRODUCT_CATEGORIES,
  formatINR,
  slugify,
  type Product,
  type ProductImage,
} from "@/lib/products-config";
import { fetchProducts, uploadProductImage, deleteProductImage } from "@/lib/products-api";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Avery & Co." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error, reset }) => (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="luxury-card max-w-md p-8 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </div>
  ),
  notFoundComponent: () => <div>Not found</div>,
});

type EditState = { open: boolean; product: Product | null };

function emptyForm(): Omit<Product, "id" | "created_at" | "updated_at"> {
  return {
    name: "",
    slug: "",
    category: PRODUCT_CATEGORIES[0],
    price: 0,
    sale_price: null,
    description: "",
    material: "",
    dimensions: "",
    images: [],
    in_stock: true,
    featured: false,
  };
}

function AdminPage() {
  const { loading: authLoading, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [edit, setEdit] = useState<EditState>({ open: false, product: null });
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) load();
  }, [authLoading, isAdmin]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    list = [...list].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [products, query, category, sort]);

  async function toggleField(p: Product, field: "featured" | "in_stock", value: boolean) {
    const update = field === "featured" ? { featured: value } : { in_stock: value };
    const { error } = await supabase.from("products").update(update).eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [field]: value } : x)));
  }

  async function doDelete(p: Product) {
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    for (const img of p.images) await deleteProductImage(img.path).catch(() => {});
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
    toast.success("Product deleted");
    setConfirmDelete(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="luxury-card max-w-md p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Access denied</p>
          <h1 className="mt-4 font-display text-4xl text-foreground">Admins only</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            You are signed in as <span className="font-medium">{user?.email}</span> but do not have admin privileges.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outlineWarm"><Link to="/">Go home</Link></Button>
            <Button onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-4">
            <Link to="/" className="story-link inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Site
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Avery &amp; Co.</p>
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">Admin dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <section className="page-shell py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Products</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {products.length} total · {products.filter((p) => p.featured).length} featured · {products.filter((p) => !p.in_stock).length} out of stock
            </p>
          </div>
          <Button variant="luxury" size="lg" onClick={() => setEdit({ open: true, product: null })}>
            <Plus /> New product
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, category, or material"
              className="h-11 pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 sm:w-56"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as "newest" | "oldest")}>
            <SelectTrigger className="h-11 sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-background/60">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No products yet. Click <span className="font-medium">New product</span> to add your first piece.
                  </TableCell></TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.images[0] ? (
                          <img src={p.images[0].url} alt="" className="h-12 w-12 rounded-md object-cover" />
                        ) : (
                          <div className="grid h-12 w-12 place-content-center rounded-md bg-muted text-muted-foreground"><ImageIcon className="h-4 w-4" /></div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.material ?? "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium">{formatINR(Number(p.sale_price ?? p.price))}</div>
                        {p.sale_price ? <div className="text-xs text-muted-foreground line-through">{formatINR(Number(p.price))}</div> : null}
                      </TableCell>
                      <TableCell><Switch checked={p.in_stock} onCheckedChange={(v) => toggleField(p, "in_stock", v)} /></TableCell>
                      <TableCell>
                        <button onClick={() => toggleField(p, "featured", !p.featured)} className="inline-flex items-center gap-1 text-sm">
                          <Star className={`h-4 w-4 ${p.featured ? "fill-wood text-wood" : "text-muted-foreground"}`} />
                          {p.featured ? "Yes" : "No"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEdit({ open: true, product: p })}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <ProductDialog
        state={edit}
        onClose={() => setEdit({ open: false, product: null })}
        onSaved={() => { setEdit({ open: false, product: null }); load(); }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} will be removed from the website and all its images deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && doDelete(confirmDelete)}>
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function ProductDialog({
  state,
  onClose,
  onSaved,
}: {
  state: EditState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial = state.product;
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (state.open) {
      setForm(
        initial
          ? {
              name: initial.name,
              slug: initial.slug,
              category: initial.category,
              price: Number(initial.price),
              sale_price: initial.sale_price !== null ? Number(initial.sale_price) : null,
              description: initial.description ?? "",
              material: initial.material ?? "",
              dimensions: initial.dimensions ?? "",
              images: initial.images ?? [],
              in_stock: initial.in_stock,
              featured: initial.featured,
            }
          : emptyForm(),
      );
    }
  }, [state.open, initial]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: ProductImage[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadProductImage(file));
      }
      setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(idx: number) {
    const img = form.images[idx];
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    await deleteProductImage(img.path).catch(() => {});
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setForm((f) => {
      const next = [...f.images];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...f, images: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        category: form.category,
        price: Number(form.price) || 0,
        sale_price: form.sale_price === null || Number.isNaN(form.sale_price) ? null : Number(form.sale_price),
        description: form.description || null,
        material: form.material || null,
        dimensions: form.dimensions || null,
        images: form.images,
        in_stock: form.in_stock,
        featured: form.featured,
      };
      if (!payload.name) throw new Error("Name is required");
      if (initial) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Product added");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{initial ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            Add images, set pricing and stock. Changes appear on the website immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="auto-generated" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Input value={form.material ?? ""} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="Walnut, Belgian linen…" />
            </div>
            <div className="space-y-2">
              <Label>Price (INR) *</Label>
              <Input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Sale price (optional)</Label>
              <Input type="number" min="0" step="1" value={form.sale_price ?? ""} onChange={(e) => setForm({ ...form, sale_price: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Dimensions</Label>
              <Input value={form.dimensions ?? ""} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="W 220 × D 95 × H 78 cm" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Images</Label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
              </label>
            </div>
            {form.images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                No images yet. Upload one or more — the first image is the primary product image.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((img, idx) => (
                  <div
                    key={img.path}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => { if (dragIdx !== null) reorder(dragIdx, idx); setDragIdx(null); }}
                    className={`group relative overflow-hidden rounded-xl border ${idx === 0 ? "border-wood ring-2 ring-wood/30" : "border-border/60"}`}
                  >
                    <img src={img.url} alt="" className="aspect-square w-full object-cover" />
                    <div className="absolute left-1 top-1 flex items-center gap-1">
                      <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] uppercase tracking-wider"><GripVertical className="inline h-3 w-3" /> Drag</span>
                    </div>
                    {idx === 0 && (
                      <span className="absolute right-1 top-1 rounded-full bg-wood px-2 py-0.5 text-[10px] uppercase tracking-wider text-wood-foreground">Primary</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-background/85 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {idx !== 0 && (
                        <button type="button" onClick={() => reorder(idx, 0)} className="rounded px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-accent">
                          Set primary
                        </button>
                      )}
                      <button type="button" onClick={() => removeImage(idx)} className="ml-auto rounded p-1 text-destructive hover:bg-destructive/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-6 rounded-xl border border-border/60 p-4">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.in_stock} onCheckedChange={(v) => setForm({ ...form, in_stock: v })} />
              In stock
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              Mark as featured
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="luxury" disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Create product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
