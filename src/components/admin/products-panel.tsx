import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  deleteProductImage,
  logAudit,
  purgeProduct,
  restoreProduct,
  saveProduct,
  softDeleteProduct,
  uploadProductImage,
} from "@/lib/content-api";
import {
  PRODUCT_STATUSES,
  formatINR,
  slugify,
  type CategoryRow,
  type Product,
  type ProductImage,
} from "@/lib/content-types";
import { contentKeys, useCategories, useProducts } from "@/hooks/use-content";
import { summarise, uploadImages } from "@/lib/uploads";
import { QueryFailed } from "@/components/site/query-state";

import { useTrash } from "@/hooks/use-admin-data";

type FormState = {
  name: string;
  slug: string;
  sku: string;
  product_code: string;
  category: string;
  category_id: string | null;
  subcategory_id: string | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  short_description: string;
  description: string;
  material: string;
  color: string;
  finish: string;
  size: string;
  weight: string;
  style: string;
  brand: string;
  dimensions: string;
  delivery_info: string;
  warranty: string;
  tags: string;
  images: ProductImage[];
  in_stock: boolean;
  featured: boolean;
  bestseller: boolean;
  trending: boolean;
  new_arrival: boolean;
  on_sale: boolean;
  status: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
};

function emptyForm(defaultCategory: string, defaultCategoryId: string | null): FormState {
  return {
    name: "",
    slug: "",
    sku: "",
    product_code: "",
    category: defaultCategory,
    category_id: defaultCategoryId,
    subcategory_id: null,
    price: 0,
    sale_price: null,
    stock_quantity: 0,
    low_stock_threshold: 3,
    short_description: "",
    description: "",
    material: "",
    color: "",
    finish: "",
    size: "",
    weight: "",
    style: "",
    brand: "",
    dimensions: "",
    delivery_info: "",
    warranty: "",
    tags: "",
    images: [],
    in_stock: true,
    featured: false,
    bestseller: false,
    trending: false,
    new_arrival: false,
    on_sale: false,
    status: "active",
    meta_title: "",
    meta_description: "",
    keywords: "",
  };
}

function fromProduct(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku ?? "",
    product_code: p.product_code ?? "",
    category: p.category,
    category_id: p.category_id,
    subcategory_id: p.subcategory_id,
    price: Number(p.price),
    sale_price: p.sale_price === null ? null : Number(p.sale_price),
    stock_quantity: p.stock_quantity ?? 0,
    low_stock_threshold: p.low_stock_threshold ?? 3,
    short_description: p.short_description ?? "",
    description: p.description ?? "",
    material: p.material ?? "",
    color: p.color ?? "",
    finish: p.finish ?? "",
    size: p.size ?? "",
    weight: p.weight ?? "",
    style: p.style ?? "",
    brand: p.brand ?? "",
    dimensions: p.dimensions ?? "",
    delivery_info: p.delivery_info ?? "",
    warranty: p.warranty ?? "",
    tags: (p.tags ?? []).join(", "),
    images: p.images,
    in_stock: p.in_stock,
    featured: p.featured,
    bestseller: p.bestseller,
    trending: p.trending,
    new_arrival: p.new_arrival,
    on_sale: p.on_sale,
    status: p.status,
    meta_title: p.meta_title ?? "",
    meta_description: p.meta_description ?? "",
    keywords: p.keywords ?? "",
  };
}

export function ProductsPanel() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading, isError, refetch } = useProducts(true);
  const { data: categories = [] } = useCategories(true);
  const { data: trashed = [], isError: trashError, refetch: refetchTrash } = useTrash();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "price-asc" | "price-desc">("newest");
  const [edit, setEdit] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<Product | null>(null);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchCat = category === "All" || p.category === category;
      const matchStatus = status === "All" || p.status === status;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.material ?? "").toLowerCase().includes(q);
      return matchCat && matchStatus && matchQ;
    });
    return [...list].sort((a, b) => {
      if (sort === "price-asc") return Number(a.price) - Number(b.price);
      if (sort === "price-desc") return Number(b.price) - Number(a.price);
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
  }, [products, query, category, status, sort]);

  async function patch(p: Product, values: Record<string, unknown>) {
    // 1.21: previously this showed nothing on success and did NOT revert the
    // switch on failure, so the admin could not tell whether the change
    // persisted. Apply optimistically, confirm on success, restore on failure.
    const key = contentKeys.products(true);
    const previous = queryClient.getQueryData<Product[]>(key);
    queryClient.setQueryData<Product[]>(key, (rows) =>
      (rows ?? []).map((row) => (row.id === p.id ? { ...row, ...values } : row)),
    );
    try {
      await saveProduct(values, p.id);
      await logAudit("update", "product", p.id, values);
      toast.success("Updated");
      refresh();
    } catch (e) {
      // Restore the exact previous cache so the control reflects persisted state.
      if (previous) queryClient.setQueryData(key, previous);
      else queryClient.invalidateQueries({ queryKey: key });
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function doSoftDelete(p: Product) {
    try {
      await softDeleteProduct(p.id);
      await logAudit("delete", "product", p.id, { name: p.name });
      toast.success("Moved to trash");
      setConfirmDelete(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function doRestore(p: Product) {
    try {
      await restoreProduct(p.id);
      await logAudit("restore", "product", p.id, { name: p.name });
      toast.success("Product restored");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    }
  }

  async function doPurge(p: Product) {
    try {
      for (const img of p.images) await deleteProductImage(img.path).catch(() => {});
      await purgeProduct(p.id);
      await logAudit("purge", "product", p.id, { name: p.name });
      toast.success("Deleted permanently");
      setConfirmPurge(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-foreground">Products</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} total · {products.filter((p) => p.status === "active").length} published ·{" "}
            {products.filter((p) => p.featured).length} featured · {trashed.length} in trash
          </p>
        </div>
        <Button variant="luxury" size="lg" onClick={() => setEdit({ open: true, product: null })}>
          <Plus /> New product
        </Button>
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Catalogue</TabsTrigger>
          <TabsTrigger value="trash">Trash ({trashed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, SKU, category, material"
                className="h-11 pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11 lg:w-52">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-11 lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger className="h-11 lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center">
                        <QueryFailed
                          message="Could not load products."
                          onRetry={() => void refetch()}
                        />
                      </TableCell>
                    </TableRow>
                  ) : isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No products match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {p.images[0] ? (
                            <img src={p.images[0].url} alt="" className="product-media product-media-img h-12 w-12 rounded-md" />
                          ) : (
                            <div className="grid h-12 w-12 place-content-center rounded-md bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku || p.material || "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatINR(Number(p.sale_price ?? p.price))}</div>
                          {p.sale_price ? (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatINR(Number(p.price))}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={p.in_stock}
                              onCheckedChange={(v) => patch(p, { in_stock: v })}
                              aria-label="In stock"
                            />
                            <span className="text-xs text-muted-foreground">{p.stock_quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={p.status === "active"}
                            onCheckedChange={(v) => patch(p, { status: v ? "active" : "draft" })}
                            aria-label="Published"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEdit({ open: true, product: p })}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trash">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trashError ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center">
                      <QueryFailed
                        message="Could not load the trash."
                        onRetry={() => void refetchTrash()}
                      />
                    </TableCell>
                  </TableRow>
                ) : trashed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Trash is empty.
                    </TableCell>
                  </TableRow>
                ) : (
                  trashed.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.deleted_at ? new Date(p.deleted_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => doRestore(p)}>
                          <RotateCcw className="h-4 w-4" /> Restore
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmPurge(p)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <ProductDialog
        open={edit.open}
        product={edit.product}
        categories={categories}
        onClose={() => setEdit({ open: false, product: null })}
        onSaved={() => {
          setEdit({ open: false, product: null });
          refresh();
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} will be hidden from the website. You can restore it from the Trash tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && doSoftDelete(confirmDelete)}>
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmPurge} onOpenChange={(o) => !o && setConfirmPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPurge?.name} and its images will be erased. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmPurge && doPurge(confirmPurge)}>
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDialog({
  open,
  product,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: Product | null;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const tops = categories.filter((c) => !c.parent_id);
  // 1.5: object keys queued for deletion, applied only AFTER saveProduct resolves.
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(tops[0]?.name ?? "Uncategorised", tops[0]?.id ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    // 1.5: discard any queued deletions whenever the dialog (re)opens, so a
    // cancelled edit never destroys a stored object.
    setPendingDeletions([]);
    setForm(product ? fromProduct(product) : emptyForm(tops[0]?.name ?? "Uncategorised", tops[0]?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const subs = categories.filter((c) => c.parent_id && c.parent_id === form.category_id);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // 1.3: every file attempted independently; the report states exactly what
      // succeeded and what failed, with a reason per failure.
      const result = await uploadImages(Array.from(files), uploadProductImage);
      if (result.succeeded.length > 0) {
        setForm((f) => ({ ...f, images: [...f.images, ...result.succeeded] }));
      }
      const message = summarise(result);
      if (result.failed.length === 0) toast.success(message);
      else if (result.succeeded.length === 0) toast.error(message);
      else toast.warning(message);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    // 1.5: previously this called deleteProductImage IMMEDIATELY and swallowed
    // the result with .catch(() => {}), so the stored object was destroyed even
    // if the admin then cancelled the dialog, and a failed deletion was
    // invisible. Now it only mutates form state and queues the object key.
    const img = form.images[idx];
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
    if (img?.path) setPendingDeletions((keys) => [...keys, img.path]);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setForm((f) => {
      const next = [...f.images];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      return { ...f, images: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const name = form.name.trim();
      if (!name) throw new Error("Name is required");
      const payload = {
        name,
        slug: (form.slug || slugify(name)).trim(),
        sku: form.sku || null,
        product_code: form.product_code || null,
        category: form.category,
        category_id: form.category_id,
        subcategory_id: form.subcategory_id,
        price: Number(form.price) || 0,
        sale_price:
          form.sale_price === null || Number.isNaN(form.sale_price) ? null : Number(form.sale_price),
        stock_quantity: Number(form.stock_quantity) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 0,
        short_description: form.short_description || null,
        description: form.description || null,
        material: form.material || null,
        color: form.color || null,
        finish: form.finish || null,
        size: form.size || null,
        weight: form.weight || null,
        style: form.style || null,
        brand: form.brand || null,
        dimensions: form.dimensions || null,
        delivery_info: form.delivery_info || null,
        warranty: form.warranty || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        images: form.images,
        in_stock: form.in_stock,
        featured: form.featured,
        bestseller: form.bestseller,
        trending: form.trending,
        new_arrival: form.new_arrival,
        on_sale: form.on_sale,
        status: form.status,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        keywords: form.keywords || null,
      };
      const saved = await saveProduct(payload, product?.id);
      await logAudit(product ? "update" : "create", "product", saved.id, { name: saved.name });

      // 1.5: the owning record is now persisted, so queued objects may be
      // removed. 1.6: failures are reported, never swallowed.
      const failedDeletions: string[] = [];
      for (const key of pendingDeletions) {
        try {
          await deleteProductImage(key);
        } catch {
          failedDeletions.push(key);
        }
      }
      setPendingDeletions([]);
      if (failedDeletions.length > 0) {
        toast.warning(
          `Saved, but ${failedDeletions.length} removed image(s) could not be deleted from storage.`,
        );
      } else {
        toast.success(product ? "Product updated" : "Product created");
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {product ? "Edit product" : "New product"}
          </DialogTitle>
          <DialogDescription>
            Everything here appears on the storefront instantly — catalogue, search, collections and the
            product page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: product ? f.slug : slugify(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder="auto-generated"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category_id ?? ""}
                onValueChange={(v) => {
                  const cat = categories.find((c) => c.id === v);
                  setForm((f) => ({
                    ...f,
                    category_id: v,
                    category: cat?.name ?? f.category,
                    subcategory_id: null,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a collection" />
                </SelectTrigger>
                <SelectContent>
                  {tops.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select
                value={form.subcategory_id ?? "none"}
                onValueChange={(v) => set("subcategory_id", v === "none" ? null : v)}
                disabled={subs.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={subs.length ? "Optional" : "None available"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Product code</Label>
              <Input value={form.product_code} onChange={(e) => set("product_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (INR) *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sale price</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.sale_price ?? ""}
                onChange={(e) => set("sale_price", e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => set("stock_quantity", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Low stock alert at</Label>
              <Input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={(e) => set("low_stock_threshold", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Short description</Label>
              <Input
                value={form.short_description}
                onChange={(e) => set("short_description", e.target.value)}
                placeholder="One line shown on cards"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["material", "Material"],
                ["color", "Colour"],
                ["finish", "Finish"],
                ["size", "Size"],
                ["weight", "Weight"],
                ["style", "Style"],
                ["brand", "Brand"],
                ["dimensions", "Dimensions"],
                ["warranty", "Warranty"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <Input value={form[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
            <div className="space-y-2 sm:col-span-2">
              <Label>Delivery info</Label>
              <Input value={form.delivery_info} onChange={(e) => set("delivery_info", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma separated)</Label>
              <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Images</Label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-accent">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            {form.images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-xs text-muted-foreground">
                No images yet. The first image is the primary product image.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {form.images.map((img, idx) => (
                  <div
                    key={img.path || img.url}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx !== null) reorder(dragIdx, idx);
                      setDragIdx(null);
                    }}
                    className={`group relative overflow-hidden rounded-xl border ${
                      idx === 0 ? "border-wood ring-2 ring-wood/30" : "border-border/60"
                    }`}
                  >
                    <img src={img.url} alt="" className="product-media product-media-img aspect-4/5 w-full" />
                    <span className="absolute left-1 top-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      <GripVertical className="inline h-3 w-3" /> Drag
                    </span>
                    {idx === 0 && (
                      <span className="absolute right-1 top-1 rounded-full bg-wood px-2 py-0.5 text-[10px] uppercase tracking-wider text-wood-foreground">
                        Primary
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-background/85 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => reorder(idx, 0)}
                          className="rounded px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-accent"
                        >
                          Set primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="ml-auto rounded p-1 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(
              [
                ["in_stock", "In stock"],
                ["featured", "Featured"],
                ["bestseller", "Bestseller"],
                ["trending", "Trending"],
                ["new_arrival", "New arrival"],
                ["on_sale", "On sale"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm">
                <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} />
                {label}
              </label>
            ))}
          </div>

          <div className="grid gap-4 rounded-xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">SEO</p>
            <div className="space-y-2">
              <Label>Meta title</Label>
              <Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meta description</Label>
              <Textarea rows={2} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" disabled={saving}>
              {saving ? "Saving…" : product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
