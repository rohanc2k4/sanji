// Test-only helper. A Proxy that behaves like a 2D context: any method call is
// a no-op that records its name into `__calls`; property writes are stored and
// readable. Lets art tests assert "ran without throwing" and "called fill".
export interface SpyCtx extends CanvasRenderingContext2D {
  __calls: Set<string>;
}

export function makeSpyCtx(): SpyCtx {
  const store: Record<string, unknown> = { __calls: new Set<string>() };
  return new Proxy(store, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return (..._args: unknown[]) => {
        (target.__calls as Set<string>).add(prop);
        return undefined;
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  }) as unknown as SpyCtx;
}
