/**
 * F7 — the catalogue suggestion combobox (2.13–2.15, defects 1.13–1.15).
 *
 * Drives the REAL `Catalogue` component. No fake is needed: the component is pure
 * with respect to its props.
 *
 * Validates: Requirements 2.13, 2.14, 2.15, 3.8
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";

import { Catalogue } from "@/components/site/catalogue";
import { category, product, renderWithRouter } from "@/test/render-harness";

afterEach(cleanup);

const CAT = [category({ id: "c1", name: "Sofas", slug: "sofas" })];
const PRODUCTS = [
  product({ id: "p1", name: "Oakley Sofa", slug: "oakley-sofa" }),
  product({ id: "p2", name: "Oakwood Bench", slug: "oakwood-bench" }),
  product({ id: "p3", name: "Oak Sideboard", slug: "oak-sideboard" }),
];

async function open(query = "oak") {
  await renderWithRouter(
    <Catalogue products={PRODUCTS} categories={CAT} whatsapp="919000000000" />,
  );
  const input = screen.getByLabelText("Search products") as HTMLInputElement;
  fireEvent.change(input, { target: { value: query } });
  return input;
}

const activeIndex = (input: HTMLElement) => {
  const id = input.getAttribute("aria-activedescendant");
  return id === null ? -1 : Number(id.split("-opt-")[1]);
};

describe("2.13 — combobox semantics reflect real state", () => {
  it("marks the input, list and items with the right roles", async () => {
    const input = await open();

    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-expanded")).toBe("true");

    const list = screen.getByRole("listbox");
    expect(input.getAttribute("aria-controls")).toBe(list.id);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("reports aria-expanded=false when the query matches nothing", async () => {
    const input = await open("zzzz");

    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("keeps aria-selected on exactly the highlighted option", async () => {
    const input = await open();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    const selected = screen
      .getAllByRole("option")
      .map((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toEqual([false, true, false]);
  });
});

describe("2.14 — keyboard traversal, selection and dismissal", () => {
  it("ArrowDown wraps around from the last option to the first", async () => {
    const input = await open();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeIndex(input)).toBe(0);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeIndex(input)).toBe(2);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeIndex(input)).toBe(0);
  });

  it("ArrowUp wraps around from the first option to the last", async () => {
    const input = await open();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(activeIndex(input)).toBe(0);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(activeIndex(input)).toBe(2);
  });

  it("ArrowUp opens a closed list at the last option", async () => {
    const input = await open();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(activeIndex(input)).toBe(2);
  });

  it("Enter applies the highlighted suggestion and closes the list", async () => {
    const input = await open();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect((input as HTMLInputElement).value).toBe("Oakwood Bench");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
  });

  it("Enter with nothing highlighted leaves the query and the list alone", async () => {
    const input = await open();

    fireEvent.keyDown(input, { key: "Enter" });

    expect((input as HTMLInputElement).value).toBe("oak");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("Escape dismisses without clearing the query", async () => {
    const input = await open();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect((input as HTMLInputElement).value).toBe("oak");
  });

  it("typing again reopens the list and clears the highlight", async () => {
    const input = await open();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Escape" });

    fireEvent.change(input, { target: { value: "oakw" } });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
  });
});

describe("2.15 — the popup never covers the results", () => {
  it("closes when a suggestion is clicked, applying its name", async () => {
    const input = await open();

    // Scoped to the listbox: the product name also appears in its result card.
    const option = screen
      .getAllByRole("option")
      .find((o) => (o.textContent ?? "").startsWith("Oak Sideboard"))!;
    fireEvent.click(option.querySelector("button")!);

    expect((input as HTMLInputElement).value).toBe("Oak Sideboard");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on a pointer press outside the suggestion region", async () => {
    await open();
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("stays open for a pointer press inside the suggestion region", async () => {
    await open();
    const list = screen.getByRole("listbox");

    fireEvent.pointerDown(list);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});
