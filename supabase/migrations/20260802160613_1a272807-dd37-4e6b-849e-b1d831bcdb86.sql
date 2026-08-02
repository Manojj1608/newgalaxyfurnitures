-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager','editor'));
$$;
REVOKE ALL ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager'));
$$;
REVOKE ALL ON FUNCTION private.is_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_manager(uuid) TO authenticated, service_role;

-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  banner_url text,
  thumbnail_url text,
  parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  display_order int NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  meta_title text,
  meta_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view visible categories" ON public.categories FOR SELECT TO anon, authenticated USING (visible = true OR private.is_staff(auth.uid()));
CREATE POLICY "Staff can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update categories" ON public.categories FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers can delete categories" ON public.categories FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCTS (extend) ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS product_code text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stock_quantity int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS finish text,
  ADD COLUMN IF NOT EXISTS size text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hover_image_url text,
  ADD COLUMN IF NOT EXISTS bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_sale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS keywords text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enquiry_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_info text,
  ADD COLUMN IF NOT EXISTS warranty text;

ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (status IN ('active','draft','hidden'));
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);

-- seed categories from the existing catalogue
INSERT INTO public.categories (name, slug, display_order)
VALUES
  ('Sofas & Sectionals','sofas-sectionals',1),
  ('Beds & Headboards','beds-headboards',2),
  ('Dining Tables','dining-tables',3),
  ('Accent Chairs','accent-chairs',4),
  ('Coffee & Side Tables','coffee-side-tables',5),
  ('Storage & Display','storage-display',6),
  ('Office Furniture','office-furniture',7),
  ('Outdoor Furniture','outdoor-furniture',8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.categories (name, slug, display_order)
SELECT DISTINCT p.category,
       lower(regexp_replace(regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')),
       99
FROM public.products p
WHERE p.category IS NOT NULL AND p.category <> ''
ON CONFLICT (slug) DO NOTHING;

UPDATE public.products p SET category_id = c.id FROM public.categories c WHERE p.category_id IS NULL AND c.name = p.category;

-- replace the old public read policy so drafts/hidden/deleted stay private
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Public can view published products" ON public.products FOR SELECT TO anon, authenticated
  USING ((status = 'active' AND deleted_at IS NULL) OR private.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Staff can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update products" ON public.products FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers can delete products" ON public.products FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));

-- ============ MEDIA ============
CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  url text NOT NULL,
  alt text,
  mime_type text,
  size_bytes int,
  width int,
  height int,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view media" ON public.media FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can insert media" ON public.media FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update media" ON public.media FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers can delete media" ON public.media FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));
CREATE TRIGGER media_updated_at BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SITE SETTINGS ============
CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  company_name text NOT NULL DEFAULT 'New Galaxy Furniture',
  tagline text NOT NULL DEFAULT 'Premium Furniture Since 2002',
  logo_url text,
  phone text NOT NULL DEFAULT '+91 95134 43606',
  whatsapp text NOT NULL DEFAULT '919513443606',
  email text NOT NULL DEFAULT 'hello@newgalaxyfurniture.com',
  address text NOT NULL DEFAULT 'Bengaluru, Karnataka, India',
  showroom_hours text NOT NULL DEFAULT 'Mon–Sat, 10:00 AM – 8:00 PM',
  maps_embed_url text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  pinterest_url text,
  about_text text,
  faq_text text,
  terms_text text,
  privacy_text text,
  return_policy_text text,
  footer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff can insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ============ HOMEPAGE SECTIONS ============
CREATE TABLE public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL,
  title text,
  subtitle text,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view sections" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (enabled = true OR private.is_staff(auth.uid()));
CREATE POLICY "Staff can insert sections" ON public.homepage_sections FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update sections" ON public.homepage_sections FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers can delete sections" ON public.homepage_sections FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));
CREATE TRIGGER homepage_sections_updated_at BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.homepage_sections (section_type, title, subtitle, sort_order) VALUES
  ('hero', NULL, NULL, 1),
  ('trust', 'Crafted for a lifetime', 'Two decades of furniture made to outlast trends.', 2),
  ('categories', 'Collections', 'Browse the pieces that define the space.', 3),
  ('featured', 'Featured Pieces', 'Hand-picked from the current catalogue.', 4),
  ('new_arrivals', 'New Arrivals', 'The latest additions to the showroom.', 5),
  ('bestsellers', 'Best Sellers', 'What our clients keep coming back for.', 6),
  ('catalogue', 'Explore the Catalogue', 'Search and filter the full collection.', 7),
  ('promo', NULL, NULL, 8),
  ('about', 'About New Galaxy Furniture', NULL, 9),
  ('testimonials', 'Client Stories', NULL, 10),
  ('contact', 'Visit the Showroom', 'Talk to us about any piece.', 11);

-- ============ HERO BANNERS ============
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text NOT NULL,
  subtitle text,
  eyebrow text,
  button_text text,
  button_link text,
  priority int NOT NULL DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_banners TO authenticated;
GRANT ALL ON public.hero_banners TO service_role;
ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active banners" ON public.hero_banners FOR SELECT TO anon, authenticated USING (active = true OR private.is_staff(auth.uid()));
CREATE POLICY "Staff can insert banners" ON public.hero_banners FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Staff can update banners" ON public.hero_banners FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "Managers can delete banners" ON public.hero_banners FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));
CREATE TRIGGER hero_banners_updated_at BEFORE UPDATE ON public.hero_banners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ENQUIRIES ============
CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text,
  phone text,
  email text,
  message text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  source_page text,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.enquiries ADD CONSTRAINT enquiries_status_check CHECK (status IN ('new','contacted','quoted','closed','spam'));
GRANT INSERT ON public.enquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit an enquiry" ON public.enquiries FOR INSERT TO anon, authenticated WITH CHECK (status = 'new' AND notes IS NULL);
CREATE POLICY "Managers can view enquiries" ON public.enquiries FOR SELECT TO authenticated USING (private.is_manager(auth.uid()));
CREATE POLICY "Managers can update enquiries" ON public.enquiries FOR UPDATE TO authenticated USING (private.is_manager(auth.uid())) WITH CHECK (private.is_manager(auth.uid()));
CREATE POLICY "Managers can delete enquiries" ON public.enquiries FOR DELETE TO authenticated USING (private.is_manager(auth.uid()));
CREATE TRIGGER enquiries_updated_at BEFORE UPDATE ON public.enquiries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (private.is_manager(auth.uid()));
CREATE POLICY "Staff can write audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()) AND actor_id = auth.uid());

-- ============ REALTIME ============
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.homepage_sections REPLICA IDENTITY FULL;
ALTER TABLE public.hero_banners REPLICA IDENTITY FULL;
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.homepage_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero_banners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;

-- ============ VIEW COUNTER (public, safe) ============
CREATE OR REPLACE FUNCTION public.increment_product_view(_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET view_count = view_count + 1 WHERE slug = _slug AND status = 'active' AND deleted_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.increment_product_view(text) TO anon, authenticated;