import { Logger } from "../utils/Logger";

/** Branded token so `resolve()` returns the right type without a cast. */
export interface Token<T> {
  readonly key: symbol;
  readonly description: string;
  /** Phantom field — carries `T` through the type system only. */
  readonly __type?: T;
}

export function createToken<T>(description: string): Token<T> {
  return { key: Symbol(description), description };
}

type Factory<T> = (container: ServiceContainer) => T;

interface Registration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Minimal DI container.
 *
 * Used for the pieces an integrator legitimately wants to replace — the
 * network adapter, the audio backend, the RNG — without forking the engine.
 * Everything else is constructor-injected directly for clarity.
 */
export class ServiceContainer {
  private readonly registry = new Map<symbol, Registration<unknown>>();
  private readonly log = Logger.create("di");

  register<T>(token: Token<T>, factory: Factory<T>, singleton = true): this {
    if (this.registry.has(token.key)) {
      this.log.debug(`overriding registration for ${token.description}`);
    }
    this.registry.set(token.key, { factory: factory, singleton });
    return this;
  }

  registerValue<T>(token: Token<T>, value: T): this {
    this.registry.set(token.key, {
      factory: () => value,
      singleton: true,
      instance: value,
    });
    return this;
  }

  has<T>(token: Token<T>): boolean {
    return this.registry.has(token.key);
  }

  resolve<T>(token: Token<T>): T {
    const registration = this.registry.get(token.key) as Registration<T> | undefined;
    if (!registration) {
      throw new Error(`[baccarat:di] no registration for "${token.description}"`);
    }
    if (!registration.singleton) return registration.factory(this);
    if (registration.instance === undefined) {
      registration.instance = registration.factory(this);
    }
    return registration.instance;
  }

  resolveOptional<T>(token: Token<T>): T | undefined {
    return this.has(token) ? this.resolve(token) : undefined;
  }

  /** Disposes every instantiated singleton that exposes `destroy()`. */
  destroy(): void {
    for (const registration of this.registry.values()) {
      const instance = registration.instance as { destroy?: () => void } | undefined;
      if (instance && typeof instance.destroy === "function") {
        try {
          instance.destroy();
        } catch (error) {
          this.log.error("service destroy failed", error);
        }
      }
    }
    this.registry.clear();
  }
}
