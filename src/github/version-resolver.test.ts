import { describe, it, expect } from "vitest";
import { normalizeVersion, resolveLatestVersion } from "./version-resolver.js";

describe("normalizeVersion", () => {
  it("strips the leading v", () => {
    expect(normalizeVersion("v1.2.0")).toBe("1.2.0");
  });

  it("handles standard semver", () => {
    expect(normalizeVersion("2.0.0")).toBe("2.0.0");
  });

  it("converts .rc4 to -rc.4 prerelease", () => {
    expect(normalizeVersion("v1.0.0.rc4")).toBe("1.0.0-rc.4");
  });

  it("converts .rc.1 to -rc.1 prerelease", () => {
    expect(normalizeVersion("v1.0.0.rc.1")).toBe("1.0.0-rc.1");
  });
});

describe("resolveLatestVersion", () => {
  it("returns the highest stable version", () => {
    const result = resolveLatestVersion([
      "v1.0.0",
      "v1.0.0.rc4",
      "v1.0.2",
      "v1.1.0",
      "v1.1.1",
      "v1.2.0",
      "v2.0.0",
    ]);
    expect(result.latest).toBe("v2.0.0");
    expect(result.normalized).toBe("2.0.0");
  });

  it("ranks rc below stable", () => {
    const result = resolveLatestVersion(["v1.0.0.rc4", "v1.0.0"]);
    expect(result.latest).toBe("v1.0.0");
  });

  it("picks the higher rc if no stable exists above it", () => {
    const result = resolveLatestVersion(["v0.9.0", "v1.0.0.rc4"]);
    expect(result.latest).toBe("v1.0.0.rc4");
  });
});
