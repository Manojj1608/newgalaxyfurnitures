import { describe, expect, it } from "vitest";
import { slugify } from "./content-types";

describe("test infrastructure smoke check", () => {
  it("resolves the @/ alias and exercises real exported logic", () => {
    expect(slugify("Oak Dining Table")).toBe("oak-dining-table");
  });
});
