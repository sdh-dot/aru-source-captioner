// 이전 로드 순서에서 늦게 준비되던 공개 의존성만 지연 조회한다. 내부 상태나 전역 객체를 공유하지 않는다.
export function createModuleScope(resolvers = {}, names = [], own = []) {
  const scope = {};
  for (const name of names) {
    if (own.includes(name)) scope[name] = resolvers[name]?.();
    else Object.defineProperty(scope, name, { enumerable: true, get: () => resolvers[name]?.() });
  }
  return scope;
}
export function selectModuleExports(scope, names) { return Object.fromEntries(names.map(name => [name, scope[name]])); }
