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
import { expectRows } from "./mutations";
import { reportLovableError } from "./lovable-error-reporting";
import { ALLOWED_IMAGE_MIME, buildObjectKey, validateUploadFile } from "./uploads";

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
  // 1.18: the error was previously discarded, so product-view records could be
  // lost with no signal anywhere.
  const { error } = await supabase.from("product_views").insert({ product_id: productId });
  if (error) {
    reportLovableError(error, { fn: "logProductView", productId });
    throw new Error(error.message);
  }
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
  // 1.22: without .select() this could not report affected rows, so an
  // RLS-excluded row still produced "Moved to trash".
  const result = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  expectRows(result, "product");
}

export async function restoreProduct(id: string): Promise<void> {
  const result = await supabase
    .from("products")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id");
  expectRows(result, "product");
}

export async function purgeProduct(id: string): Promise<void> {
  const result = await supabase.from("products").delete().eq("id", id).select("id");
  expectRows(result, "product");
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
  const result = await supabase.from("categories").delete().eq("id", id).select("id");
  expectRows(result, "collection");
}

/* ---------------- site settings ---------------- */

export async function fetchSettings(): Promise<SiteSettings | null> {
  const { data, error } = await supabase.from("site_settings").select("*").maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function saveSettings(values: Record<string, unknown>): Promise<void> {
  const result = await supabase
    .from("site_settings")
    .update(values as never)
    .eq("id", true)
    .select("id");
  expectRows(result, "settings");
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
  const result = await supabase
    .from("homepage_sections")
    .update(values as never)
    .eq("id", id)
    .select("id");
  expectRows(result, "section");
}

export async function reorderSections(ordered: { id: string; sort_order: number }[]) {
  // 1.19: Promise.all results were discarded, so a failed update reverted the
  // order on the next refetch with no error shown. Inspect EVERY result for both
  // a reported error and a zero-row outcome.
  const results = await Promise.allSettled(
    ordered.map((s) =>
      supabase
        .from("homepage_sections")
        .update({ sort_order: s.sort_order })
        .eq("id", s.id)
        .select("id"),
    ),
  );

  const failures: string[] = [];
  results.forEach((outcome, i) => {
    const id = ordered[i]?.id ?? "unknown";
    if (outcome.status === "rejected") {
      failures.push(id);
      return;
    }
    try {
      expectRows(outcome.value, "section");
    } catch {
      failures.push(id);
    }
  });

  if (failures.length > 0) {
    const error = new Error(
      `${failures.length} of ${ordered.length} sections could not be reordered — the new order was not applied.`,
    );
    reportLovableError(error, { fn: "reorderSections", failed: failures });
    throw error;
  }
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
    ? supabase
        .from("hero_banners")
        .update(values as never)
        .eq("id", id)
        .select("id")
    : supabase
        .from("hero_banners")
        .insert(values as never)
        .select("id");
  expectRows(await query, "banner");
}

export async function deleteBanner(id: string): Promise<void> {
  const result = await supabase.from("hero_banners").delete().eq("id", id).select("id");
  expectRows(result, "banner");
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
  // 1.18: a lost enquiry is lost business; the error must never be discarded.
  const { error } = await supabase.from("enquiries").insert({ ...values, status: "new" });
  if (error) {
    reportLovableError(error, { fn: "createEnquiry", product_id: values.product_id });
    throw new Error(error.message);
  }
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
  const result = await supabase
    .from("enquiries")
    .update(values as never)
    .eq("id", id)
    .select("id");
  expectRows(result, "enquiry");
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
  // 1.4: validate BEFORE any network call, so a rejected file leaves every
  // existing image untouched and the admin gets an actionable message.
  const validation = validateUploadFile(file);
  if (!validation.ok) throw new Error(validation.message);

  // Compression runs only after validation passes.
  const blob = await compressImage(file);
  const mime = blob.type || file.type;

  // 1.9: the key extension comes from the validated MIME of the bytes actually
  // uploaded, never from the filename.
  const contentType = mime in ALLOWED_IMAGE_MIME ? mime : file.type;
  const path = buildObjectKey(contentType);

  const { error } = await supabase.storage.from("product-images").upload(path, blob, {
    cacheControl: "31536000",
    upsert: false,
    contentType,
  });
  if (error) throw error;

  // 1.8: the bucket is public, so a durable public URL is derived from the key
  // (which remains the durable reference). Already-stored signed URLs are never
  // rewritten and keep resolving.
  const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(path);
  const url = publicData?.publicUrl;
  if (!url) throw new Error("Failed to resolve the image URL");

  const { data: userData } = await supabase.auth.getUser();
  const { error: mediaError } = await supabase.from("media").insert({
    path,
    url,
    mime_type: contentType,
    size_bytes: blob.size,
    alt: file.name.replace(/\.[^.]+$/, ""),
    uploaded_by: userData.user?.id ?? null,
  });
  if (mediaError) {
    // 1.18: previously discarded, leaving an object with no media record.
    reportLovableError(mediaError, { fn: "uploadProductImage", path });
    throw new Error(mediaError.message);
  }

  return { url, path };
}

export async function deleteProductImage(path: string): Promise<void> {
  if (!path) return;

  // 1.6: the .remove() result was never inspected and the media row was deleted
  // regardless, leaving an orphaned storage object with no record — reported to
  // the admin as a successful delete. Inspect it, and on failure leave the row
  // in place so the object always remains discoverable.
  const { error: storageError } = await supabase.storage.from("product-images").remove([path]);
  if (storageError) {
    const notFound = /not.?found/i.test(storageError.message ?? "");
    if (!notFound) {
      // A "not found" result means already-deleted, so the call stays idempotent.
      reportLovableError(storageError, { fn: "deleteProductImage", path });
      throw new Error(storageError.message);
    }
  }

  // 1.18: this result was previously discarded too.
  const { error: mediaError } = await supabase.from("media").delete().eq("path", path);
  if (mediaError) {
    // The object is gone but its record survives. Record the mismatch for
    // reconciliation and surface it — no new table, no background job.
    reportLovableError(mediaError, { fn: "deleteProductImage", path, orphan: true });
    await supabase
      .from("audit_logs")
      .insert({
        action: "orphan",
        entity: "media",
        entity_id: null,
        details: { path, reason: mediaError.message } as never,
      })
      .then(
        () => undefined,
        () => undefined,
      );
    throw new Error(mediaError.message);
  }
}

/* ---------------- audit ---------------- */

export async function logAudit(action: string, entity: string, entityId?: string, details?: unknown) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: data.user.id,
    actor_email: data.user.email ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: (details ?? {}) as never,
  });
  if (error) {
    // 1.18: audit entries could be lost silently.
    reportLovableError(error, { fn: "logAudit", action, entity, entityId });
    throw new Error(error.message);
  }
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
