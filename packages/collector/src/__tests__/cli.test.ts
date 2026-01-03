import { describe, it, expect } from "vitest";
import { parseArgs } from "../cli.js";

describe("parseArgs", () => {
  it("should parse empty arguments", () => {
    const args = parseArgs(["node", "collector"]);

    expect(args.sourceDirs).toEqual([]);
    expect(args.verbose).toBe(false);
    expect(args.dryRun).toBe(false);
    expect(args.help).toBe(false);
  });

  it("should parse --help flag", () => {
    const args = parseArgs(["node", "collector", "--help"]);
    expect(args.help).toBe(true);
  });

  it("should parse -h flag", () => {
    const args = parseArgs(["node", "collector", "-h"]);
    expect(args.help).toBe(true);
  });

  it("should parse --verbose flag", () => {
    const args = parseArgs(["node", "collector", "--verbose"]);
    expect(args.verbose).toBe(true);
  });

  it("should parse -v flag", () => {
    const args = parseArgs(["node", "collector", "-v"]);
    expect(args.verbose).toBe(true);
  });

  it("should parse --dry-run flag", () => {
    const args = parseArgs(["node", "collector", "--dry-run"]);
    expect(args.dryRun).toBe(true);
  });

  it("should parse single --source-dir", () => {
    const args = parseArgs(["node", "collector", "--source-dir=/path/to/dir"]);
    expect(args.sourceDirs).toEqual(["/path/to/dir"]);
  });

  it("should parse single -s", () => {
    const args = parseArgs(["node", "collector", "-s", "/path/to/dir"]);
    expect(args.sourceDirs).toEqual(["/path/to/dir"]);
  });

  it("should parse multiple --source-dir options", () => {
    const args = parseArgs([
      "node",
      "collector",
      "--source-dir=/path/one",
      "--source-dir=/path/two",
    ]);
    expect(args.sourceDirs).toEqual(["/path/one", "/path/two"]);
  });

  it("should parse multiple -s options", () => {
    const args = parseArgs([
      "node",
      "collector",
      "-s",
      "/path/one",
      "-s",
      "/path/two",
    ]);
    expect(args.sourceDirs).toEqual(["/path/one", "/path/two"]);
  });

  it("should parse mixed short and long source-dir options", () => {
    const args = parseArgs([
      "node",
      "collector",
      "-s",
      "/path/one",
      "--source-dir=/path/two",
    ]);
    expect(args.sourceDirs).toEqual(["/path/one", "/path/two"]);
  });

  it("should parse combination of flags", () => {
    const args = parseArgs([
      "node",
      "collector",
      "-v",
      "--dry-run",
      "-s",
      "/path/to/dir",
    ]);

    expect(args.verbose).toBe(true);
    expect(args.dryRun).toBe(true);
    expect(args.sourceDirs).toEqual(["/path/to/dir"]);
  });
});
