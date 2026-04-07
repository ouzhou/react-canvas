import { describe, expect, it } from "vite-plus/test";
import {
  parsePersistedLabTsx,
  serializeLabTsx,
  type LabTsxPersisted,
} from "./mobile-app-lab-tsx-storage.ts";

describe("parsePersistedLabTsx", () => {
  it("returns null for null input", () => {
    expect(parsePersistedLabTsx(null)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parsePersistedLabTsx("{")).toBeNull();
  });

  it("returns null when fields missing", () => {
    expect(parsePersistedLabTsx(JSON.stringify({ draft: "a" }))).toBeNull();
  });

  it("parses valid payload", () => {
    const p: LabTsxPersisted = { draft: "d", appliedCode: "a" };
    expect(parsePersistedLabTsx(JSON.stringify(p))).toEqual(p);
  });
});

describe("serializeLabTsx", () => {
  it("round-trips", () => {
    const p: LabTsxPersisted = { draft: "x", appliedCode: "y" };
    expect(parsePersistedLabTsx(serializeLabTsx(p))).toEqual(p);
  });
});
