# Homepage Refocus: Furniture Showroom & Catalog

Refine `src/routes/index.tsx` (and root metadata) to remove all "Inspiration" and "Design Consultation" framing, reorder the page, and rewrite CTAs around product inquiries.

## 1. Remove
- Entire `#inspiration` section (lines ~450–503) including the "Room inspiration / Editorial spaces" heading, mood cards, and the `inspirationGallery` constant + its unused image imports.
- "Inspiration" link in the top nav and footer "Browse" list.
- "Consultations" nav link → rename to "Contact".
- All copy mentioning *interior designers, design consultations, designer services, design experts, design concierge, design atelier, senior designer, mood board, styling*. Remove the `Award` icon list items tied to designer perks.
- Hero subcopy line "styled by our in-house design concierge".
- Root + route meta descriptions referencing "concierge design consultations".

## 2. Reorder sections (after Hero)
```text
#categories  → Featured Collections
#why         → Why Choose Us  (Material-led, Quality assurance, Responsibly sourced, Delivery & warranty)
#featured    → Featured Products
#trust       → Customer Testimonials  (trust metrics + success stories, rewritten as furniture purchase stories)
#about       → About Us
#contact     → Contact / WhatsApp CTA  (replaces #consult block)
footer
```
Currently the order is Categories → Featured → Why → Inspiration → Trust → Consult → About → Footer. The "Why Choose Us" block moves up to sit between Categories and Featured.

## 3. Rewrite consultation block → Contact / Enquiry
Replace the `#consult` section with `#contact`:
- Headline: "Enquire about any piece — we'll respond within 24 hours."
- Subcopy focused on quotes, availability, delivery timelines, white-glove logistics, 10-year warranty.
- Bullet list switches to: *Request a Quote · Check Availability · Material & Finish Details · White-glove Delivery & Warranty*.
- Buttons:
  - Primary (wood): **Enquire on WhatsApp** → `wa.me/...?text=...interested in your furniture...`
  - Secondary (outlineWarm): **Request a Quote** → `mailto:sales@averyandco.in`
- Direct-lines card keeps phone, email, showroom — relabel "By appointment" to "Visit our showroom".

## 4. CTA copy updates
- Hero secondary button "Book a consultation" → **Enquire on WhatsApp** (links to `#contact`).
- Featured-products card footer adds a small **Get Product Details** CTA replacing the bare arrow.
- Floating WhatsApp FAB message stays product-focused (already is).
- "Why Choose Us" card titled "Concierge service" → **White-glove delivery** with copy about scheduling, installation, and aftercare.
- Add a 4th Why-Choose-Us card: **10-year warranty** (covered structure, free repairs, lifetime servicing).

## 5. Trust section rewrite
- Section kicker "Trusted by discerning homes" → "Customer testimonials".
- Headline → "Loved by homeowners across India."
- Success-story copy lightly rewritten to remove "concierge / mood board / our design team" — emphasize product selection, build quality, on-time delivery, installation. No fabricated quotes (per memory rule — keep as narrative case studies, not pretend reviews).

## 6. Metadata
- `src/routes/__root.tsx` description: drop "concierge" wording → "Avery & Co. — premium furniture in walnut, beige, and linen. Bespoke craftsmanship, white-glove delivery, 10-year warranty."
- `src/routes/index.tsx` route `head()` meta + og: same furniture-led rewrite (no "consultation").

## Files touched
- `src/routes/index.tsx` (primary)
- `src/routes/__root.tsx` (meta description only)

No new assets, no dependency changes, no backend work.
