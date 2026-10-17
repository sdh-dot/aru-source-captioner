// 같은 ISOLATED World의 별도 번들 사이에서 공개 인스턴스만 재사용한다.
// 기능 의존성은 이 경계를 통해 명시적으로 넘기며 MAIN과 상태를 공유하지 않는다.
const key = Symbol.for("aru.wxt.isolated-runtime.v1");
interface WorldState {
  icons: Record<string, unknown>;
  metadata: Record<string, unknown>;
  bundle: Record<string, unknown>;
}
export function isolatedState(): WorldState {
  const target = globalThis as typeof globalThis & { [key]?: WorldState };
  return (target[key] ??= { icons: {}, metadata: {}, bundle: {} });
}
