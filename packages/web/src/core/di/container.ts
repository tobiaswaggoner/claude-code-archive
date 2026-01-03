"use client";

import { createContext, useContext } from "react";

export type Factory<T> = () => T;

/**
 * Simple DI Container for React
 * Stores factory functions that create service instances
 */
export class Container {
  private factories = new Map<symbol, Factory<unknown>>();
  private instances = new Map<symbol, unknown>();

  register<T>(token: symbol, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  resolve<T>(token: symbol): T {
    // Return cached instance if exists
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`No factory registered for token: ${token.toString()}`);
    }

    const instance = factory() as T;
    this.instances.set(token, instance);
    return instance;
  }

  /**
   * Create a child container with overrides
   * Used for testing with mocked services
   */
  createChild(overrides?: Map<symbol, Factory<unknown>>): Container {
    const child = new Container();

    // Copy parent factories
    this.factories.forEach((factory, token) => {
      child.factories.set(token, factory);
    });

    // Apply overrides
    overrides?.forEach((factory, token) => {
      child.factories.set(token, factory);
    });

    return child;
  }

  clear(): void {
    this.instances.clear();
  }
}

// Global container instance
export const container = new Container();

// React Context for DI
export const ContainerContext = createContext<Container>(container);

/**
 * Hook to resolve a service from the DI container
 */
export function useInject<T>(token: symbol): T {
  const container = useContext(ContainerContext);
  return container.resolve<T>(token);
}
