/**
 * Unit tests for the F6 motion-preference hook (2.11).
 *
 * `matchMedia` is stubbed because jsdom does not model OS preferences; the
 * subject under test is the real hook's subscription lifecycle and returned value.
 *
 * Validates: Requirements 2.11
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Listener = () => void;

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>();
  const mql = {
    get matches() {
      return current;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_: string, cb: Listener) => void listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: Listener) => void listeners.delete(cb)),
  };
  let current = matches;
  const queries: string[] = [];
  vi.stubGlobal("matchMedia", (q: string) => {
    queries.push(q);
    return mql;
  });
  return {
    mql,
    queries,
    set: (v: boolean) => {
      current = v;
      for (const cb of listeners) cb();
    },
  };
}

function Probe() {
  return <span data-testid="v">{String(usePrefersReducedMotion())}</span>;
}

describe("usePrefersReducedMotion", () => {
  it("reports the current preference and queries prefers-reduced-motion: reduce", () => {
    const h = stubMatchMedia(true);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("v").textContent).toBe("true");
    expect(h.queries).toContain("(prefers-reduced-motion: reduce)");
  });

  it("reports false when the visitor has expressed no preference", () => {
    stubMatchMedia(false);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("v").textContent).toBe("false");
  });

  it("subscribes on mount and unsubscribes on unmount", () => {
    const h = stubMatchMedia(false);
    const view = render(<Probe />);
    expect(h.mql.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(h.mql.removeEventListener).not.toHaveBeenCalled();

    view.unmount();
    expect(h.mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("updates when the preference changes while mounted", () => {
    const h = stubMatchMedia(false);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("v").textContent).toBe("false");

    act(() => h.set(true));
    expect(getByTestId("v").textContent).toBe("true");
  });

  it("is SSR-safe: returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("v").textContent).toBe("false");
  });
});
