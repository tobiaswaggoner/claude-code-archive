import { describe, it, expect } from "vitest";
import { normalizeUpstreamUrl, randomHex, parsePagination } from "../lib/utils.js";

describe("normalizeUpstreamUrl", () => {
  it("normalizes HTTPS URLs", () => {
    expect(normalizeUpstreamUrl("https://github.com/user/repo.git")).toBe(
      "github.com/user/repo"
    );
    expect(normalizeUpstreamUrl("https://github.com/user/repo")).toBe(
      "github.com/user/repo"
    );
  });

  it("normalizes SSH URLs", () => {
    expect(normalizeUpstreamUrl("git@github.com:user/repo.git")).toBe(
      "github.com/user/repo"
    );
    expect(normalizeUpstreamUrl("git@github.com:user/repo")).toBe(
      "github.com/user/repo"
    );
  });

  it("normalizes HTTP URLs", () => {
    expect(normalizeUpstreamUrl("http://github.com/user/repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("handles GitLab URLs", () => {
    expect(normalizeUpstreamUrl("https://gitlab.com/org/project.git")).toBe(
      "gitlab.com/org/project"
    );
    expect(normalizeUpstreamUrl("git@gitlab.com:org/project.git")).toBe(
      "gitlab.com/org/project"
    );
  });

  it("handles self-hosted URLs", () => {
    expect(normalizeUpstreamUrl("https://git.company.com/team/repo.git")).toBe(
      "git.company.com/team/repo"
    );
    expect(normalizeUpstreamUrl("git@git.company.com:team/repo.git")).toBe(
      "git.company.com/team/repo"
    );
  });

  it("converts to lowercase for case-insensitive matching", () => {
    expect(normalizeUpstreamUrl("https://GitHub.Com/User/Repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("handles nested paths", () => {
    expect(
      normalizeUpstreamUrl("https://github.com/org/project/subproject.git")
    ).toBe("github.com/org/project/subproject");
  });
});

describe("randomHex", () => {
  it("generates hex string of specified length", () => {
    const hex = randomHex(8);
    expect(hex).toHaveLength(8);
    expect(hex).toMatch(/^[0-9a-f]+$/);
  });

  it("generates different values on each call", () => {
    const hex1 = randomHex(16);
    const hex2 = randomHex(16);
    expect(hex1).not.toBe(hex2);
  });

  it("handles zero length", () => {
    expect(randomHex(0)).toBe("");
  });
});

describe("parsePagination", () => {
  it("uses defaults for undefined values", () => {
    expect(parsePagination()).toEqual({ limit: 50, offset: 0 });
    expect(parsePagination(undefined, undefined)).toEqual({ limit: 50, offset: 0 });
  });

  it("parses string values", () => {
    expect(parsePagination("10", "20")).toEqual({ limit: 10, offset: 20 });
  });

  it("parses number values", () => {
    expect(parsePagination(10, 20)).toEqual({ limit: 10, offset: 20 });
  });

  it("clamps limit to valid range", () => {
    // 0 is falsy so falls back to default (50)
    expect(parsePagination(0, 0)).toEqual({ limit: 50, offset: 0 });
    // Negative is truthy but gets clamped to min (1)
    expect(parsePagination(-5, 0)).toEqual({ limit: 1, offset: 0 });
    // Too high gets clamped to max
    expect(parsePagination(2000, 0)).toEqual({ limit: 1000, offset: 0 });
  });

  it("clamps offset to non-negative", () => {
    expect(parsePagination(50, -10)).toEqual({ limit: 50, offset: 0 });
  });

  it("handles NaN values", () => {
    expect(parsePagination("abc", "def")).toEqual({ limit: 50, offset: 0 });
  });
});
