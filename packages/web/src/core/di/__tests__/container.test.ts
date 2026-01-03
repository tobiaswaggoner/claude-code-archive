import { describe, it, expect, beforeEach } from "vitest";
import { Container } from "../container";

describe("Container", () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  it("should register and resolve a service", () => {
    const token = Symbol("TestService");
    const mockService = { name: "test" };

    container.register(token, () => mockService);
    const resolved = container.resolve(token);

    expect(resolved).toBe(mockService);
  });

  it("should return the same instance on multiple resolves (singleton)", () => {
    const token = Symbol("TestService");
    let callCount = 0;

    container.register(token, () => {
      callCount++;
      return { id: callCount };
    });

    const first = container.resolve(token);
    const second = container.resolve(token);

    expect(first).toBe(second);
    expect(callCount).toBe(1);
  });

  it("should throw error for unregistered token", () => {
    const token = Symbol("UnknownService");

    expect(() => container.resolve(token)).toThrow(
      "No factory registered for token"
    );
  });

  it("should create a child container with parent factories", () => {
    const parentToken = Symbol("ParentService");
    const parentService = { name: "parent" };

    container.register(parentToken, () => parentService);

    const child = container.createChild();
    const resolved = child.resolve(parentToken);

    expect(resolved).toBe(parentService);
  });

  it("should allow overriding services in child container", () => {
    const token = Symbol("TestService");
    const parentService = { name: "parent" };
    const childService = { name: "child" };

    container.register(token, () => parentService);

    const overrides = new Map<symbol, () => unknown>();
    overrides.set(token, () => childService);

    const child = container.createChild(overrides);
    const resolved = child.resolve(token);

    expect(resolved).toBe(childService);
  });

  it("should clear cached instances", () => {
    const token = Symbol("TestService");
    let callCount = 0;

    container.register(token, () => {
      callCount++;
      return { id: callCount };
    });

    const first = container.resolve<{ id: number }>(token);
    expect(first.id).toBe(1);

    container.clear();

    const second = container.resolve<{ id: number }>(token);
    expect(second.id).toBe(2);
  });
});
