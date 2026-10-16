import type { DynamicApi, ResolverMap } from "./contracts.ts";
// 늦게 설치되는 공개 의존성만 getter로 연결해 기존 초기화 순서를 보존한다.
export function createModuleScope(
  resolvers: ResolverMap = {},
  names: string[] = [],
  own: string[] = [],
) {
  const scope: DynamicApi = {};
  for (const name of names) {
    if (own.includes(name)) {
      scope[name] = resolvers[name]?.();
    } else {
      Object.defineProperty(scope, name, {
        enumerable: true,
        get: () => resolvers[name]?.(),
      });
    }
  }
  return scope;
}
export function selectModuleExports(scope: DynamicApi, names: string[]) {
  return Object.fromEntries(names.map((name) => [name, scope[name]]));
}
