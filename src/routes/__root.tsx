import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { useCartSync } from "@/hooks/use-cart-sync";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="luxury-card max-w-lg p-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-foreground">Page not found</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The page you were looking for is no longer curated here.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="luxury-card max-w-lg p-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Unexpected issue</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-foreground">
          This page didn&apos;t load
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Something interrupted the experience. You can refresh the route or head back to the
          collection.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Avery & Co. | Luxury Furniture" },
      {
        name: "description",
        content:
          "Avery & Co. — premium luxury furniture in walnut, beige, and linen. Bespoke craftsmanship, white-glove delivery, and a 10-year structural warranty.",
      },
      { property: "og:title", content: "Avery & Co. | Luxury Furniture" },
      {
        property: "og:description",
        content:
          "Shop premium sofas, beds, dining tables, and casegoods — hand-built and delivered white-glove across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useCartSync();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
