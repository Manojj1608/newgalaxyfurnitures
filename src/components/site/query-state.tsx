/**
 * The presentational error card used wherever a query can fail.
 *
 * The pure state selector lives in `@/lib/query-state` so this file exports only
 * components. See that module for the defect analysis (1.23–1.27).
 */
import { Button } from "@/components/ui/button";

/**
 * Built from the existing `luxury-card` + `text-destructive` + `Button`
 * primitives already used by the admin route's errorComponent — no new design
 * language, no new markup vocabulary (3.14).
 */
export function QueryFailed({
  message = "Something went wrong loading this content.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="luxury-card p-8 text-center" role="alert">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
