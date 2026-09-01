import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

/**
 * The product page's genuine 404 state.
 *
 * Defect 1.21: PR #1 separated "not found" from "failed to load" (1.27) but left
 * it uncovered, because `ProductPage` is not exported and exporting a component
 * from a route module would add a 7th `react-refresh/only-export-components`
 * warning, breaching the recorded lint baseline (2.22).
 *
 * Extracted verbatim — same markup, same copy, same CTA — so the route imports it
 * and a component test can render the real thing.
 */
export function ProductNotFound() {
  return (
    <main className="page-shell flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-4xl text-foreground">Piece not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This product may have been removed from the showroom.
      </p>
      <Button asChild variant="luxury" className="mt-8 rounded-full">
        <Link to="/">Back to collection</Link>
      </Button>
    </main>
  );
}
