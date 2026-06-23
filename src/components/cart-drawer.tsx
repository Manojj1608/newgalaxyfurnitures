import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatPrice } from "@/lib/shopify";
import { useCartStore } from "@/stores/cart-store";

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } =
    useCartStore();

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price.amount) * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (isOpen) {
      syncCart();
    }
  }, [isOpen, syncCart]);

  const handleCheckout = () => {
    const checkoutUrl = getCheckoutUrl();
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
      setIsOpen(false);
    }
  };

  const totalPriceLabel =
    items[0] != null
      ? formatPrice({ amount: totalAmount.toFixed(0), currencyCode: items[0].price.currencyCode })
      : "₹0";

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outlineWarm" size="icon" aria-label="Open shopping cart" className="relative">
          <ShoppingBag />
          {totalItems > 0 ? (
            <Badge className="absolute -right-2 -top-2 h-6 min-w-6 rounded-full px-1.5 text-[11px]">
              {totalItems}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full border-border/70 bg-background/95 px-5 sm:max-w-xl">
        <SheetHeader className="border-b border-border/70 pb-5 text-left">
          <SheetTitle className="font-display text-4xl font-medium">Your cart</SheetTitle>
          <SheetDescription>
            {totalItems > 0
              ? `${totalItems} item${totalItems === 1 ? "" : "s"} selected for checkout.`
              : "Your edit is empty for now."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full min-h-0 flex-col pb-10 pt-6">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-[calc(var(--radius-2xl))] border border-dashed border-border bg-secondary/35 p-8 text-center">
              <div className="space-y-3">
                <p className="font-display text-3xl text-foreground">No pieces added yet</p>
                <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                  Browse the featured products section and add your first piece to begin a real
                  Shopify checkout.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.variantId}
                    className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 rounded-[calc(var(--radius-xl))] border border-border/70 bg-card p-3 shadow-sm"
                  >
                    <div className="overflow-hidden rounded-[calc(var(--radius-lg))] bg-secondary/40">
                      {item.product.images[0] ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.images[0].altText ?? item.product.title}
                          className="h-24 w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-24 place-items-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{item.product.title}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {item.selectedOptions.length > 0
                              ? item.selectedOptions.map((option) => option.value).join(" • ")
                              : item.variantTitle !== "Default Title"
                                ? item.variantTitle
                                : "Standard finish"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="rounded-full border border-border/80 p-2 text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground"
                          aria-label={`Remove ${item.product.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{formatPrice(item.price)}</p>
                        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            aria-label={`Decrease quantity for ${item.product.title}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                            aria-label={`Increase quantity for ${item.product.title}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-4 border-t border-border/70 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                    Estimated total
                  </span>
                  <span className="font-display text-3xl text-foreground">{totalPriceLabel}</span>
                </div>
                <Button
                  variant="wood"
                  size="lg"
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={items.length === 0 || isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Checkout with Shopify
                      <ExternalLink />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
