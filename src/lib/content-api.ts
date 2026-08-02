import { supabase } from "@/integrations/supabase/client";
import type {
  CategoryRow,
  EnquiryRow,
  HeroBanner,
  HomepageSection,
  MediaRow,
  Product,
  ProductImage,
  ProductRow,
  SiteSettings,
} from "./content-types";
import { toProduct } from "./content-types";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // ~10 years

/* ---------------- products ---------------- */

export async function fetchProducts(opts?: { includeUnpublished?: boolean }): Promise<Product[]> {
  let query = supabase.from("products").select("*").is("deleted_at", null);
  if (!opts?.includeUnpublished) query = query.eq("status", "active");
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toProduct(row as ProductRow));
}

export async function fetchDeletedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toProduct(row as ProductRow));
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as ProductRow) : null;
}

export async function logProductView(productId: string): Promise<void> {
  await supabase.from("product_views").insert({ product_id: productId });
}

export async function saveProduct(
  values: Record<string, unknown>,
  id?: string,
): Promise<Product> {
  const query = id
    ? supabase.from("products").update(values as never).eq("id", id).select("*").single()
    : supabase.from("products").insert(values as never).select("*").single();
  const { data, error } = await query;
  if (error) throw error;
  return toProduct(data as ProductRow);
}

export async function softDeleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
}

export async function purgeProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- categories ---------------- */

export async function fetchCategories(opts?: { includeHidden?: boolean }): Promise<CategoryRow[]> {
  let query = supabase.from("categories").select("*");
  if (!opts?.includeHidden) query = query.eq("visible", true);
  const { data, error } = await query
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveCategory(
  values: Record<string, unknown>,
  id?: string,
): Promise<CategoryRow> {
  const query = id
    ? supabase.from("categories").update(values as never).eq("id", id).select("*").single()
    : supabase.from("categories").insert(values as never).select("*").single();
  const { data, error } = await query;
  if (error) throw error;
  return data as CategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- site settings ---------------- */

export async function fetchSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveSettings(values: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from("site_settings")
    .update(values as never)
    .eq("id", true);
  if (error) throw error;
}

/* ---------------- homepage sections ---------------- */

export async function fetchSections(opts?: {
  includeDisabled?: boolean;
}): Promise<HomepageSection[]> {
  let query = supabase.from("homepage_sections").select("*");
  if (!opts?.includeDisabled) query = query.eq("enabled", true);
  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveSection(
  values: Record<string, unknown>,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("homepage_sections")
    .update(values as never)
    .eq("id", id);
  if (error) throw error;
}

export async function reorderSections(ordered: { id: string; sort_order: number }[]) {
  await Promise.all(
    ordered.map((s) =>
      supabase.from("homepage_sections").update({ sort_order: s.sort_order }).eq("id", s.id),
    ),
  );
}

/* ---------------- hero banners ---------------- */

export async function fetchBanners(opts?: { includeInactive?: boolean }): Promise<HeroBanner[]> {
  let query = supabase.from("hero_banners").select("*");
  if (!opts?.includeInactive) query = query.eq("active", true);
  const { data, error } = await query.order("priority", { ascending: true });
  if (error) throw error;
  const now = Date.now();
  const rows = data ?? [];
  if (opts?.includeInactive) return rows;
  return rows.filter(
    (b) =>
      (!b.start_date || new Date(b.start_date).getTime() <= now) &&
      (!b.end_date || new Date(b.end_date).getTime() >= now),
  );
}

export async function saveBanner(
  values: Record<string, unknown>,
  id?: string,
): Promise<void> {
  const query = id
    ? supabase.from("hero_banners").update(values as never).eq("id", id)
    : supabase.from("hero_banners").insert(values as never);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- enquiries ---------------- */

export async function createEnquiry(values: {
  customer_name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  source_page?: string | null;
  channel?: string;
}): Promise<void> {
  await supabase.from("enquiries").insert({ ...values, status: "new" });
}

export async function fetchEnquiries(): Promise<EnquiryRow[]> {
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateEnquiry(id: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from("enquiries")
    .update(values as never)
    .eq("id", id);
  if (error) throw error;
}

/* ---------------- media ---------------- */

export async function fetchMedia(): Promise<MediaRow[]> {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function compressImage(file: File): Promise<Blob> {
  if (typeof document === "undefined" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function uploadProductImage(file: File): Promise<ProductImage> {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : (file.name.split(".").pop() ?? "jpg");
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("product-images").upload(path, blob, {
    cacheControl: "31536000",
    upsert: false,
    contentType: blob.type || file.type,
  });
  if (error) throw error;
  const { data, error: urlErr } = await supabase.storage
    .from("product-images")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (urlErr || !data) throw urlErr ?? new Error("Failed to sign URL");

  const { data: userData } = await supabase.auth.getUser();
  await supabase.from("media").insert({
    path,
    url: data.signedUrl,
    mime_type: blob.type || file.type,
    size_bytes: blob.size,
    alt: file.name.replace(/\.[^.]+$/, ""),
    uploaded_by: userData.user?.id ?? null,
  });

  return { url: data.signedUrl, path };
}

export async function deleteProductImage(path: string): Promise<void> {
  if (!path) return;
  await supabase.storage.from("product-images").remove([path]);
  await supabase.from("media").delete().eq("path", path);
}

/* ---------------- audit ---------------- */

export async function logAudit(action: string, entity: string, entityId?: string, details?: unknown) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    actor_email: data.user.email ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: (details ?? {}) as never,
  });
}

export async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
