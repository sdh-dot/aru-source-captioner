import type { RuntimeEnvironment } from "../src/runtime/contracts.ts";
// DOM 메서드의 수신자는 실제 Window로 유지하고 파서만 명시적으로 주입한다.
const boundMethods = new Set<PropertyKey>([
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "getComputedStyle",
  "matchMedia",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "queueMicrotask",
  "fetch",
  "addEventListener",
  "removeEventListener",
  "atob",
  "btoa",
]);
export function createEnvironment(parser: unknown): RuntimeEnvironment {
  return new Proxy(globalThis, {
    get(target, key) {
      if (key === "exifr") {
        return parser;
      }
      const value: unknown = Reflect.get(target, key, target);
      return boundMethods.has(key) && typeof value === "function"
        ? value.bind(target)
        : value;
    },
  }) as unknown as RuntimeEnvironment;
}
