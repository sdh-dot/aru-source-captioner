// 자동 생성: src/runtime/module-scope.ts. tools/compile-typescript.mjs로 갱신한다.
// 늦게 설치되는 공개 의존성만 getter로 연결해 기존 초기화 순서를 보존한다.
export function createModuleScope(resolvers = {}, names = [], own = []) {
    const scope = {};
    for (const name of names) {
        if (own.includes(name)) {
            scope[name] = resolvers[name]?.();
        }
        else {
            Object.defineProperty(scope, name, {
                enumerable: true,
                get: () => resolvers[name]?.(),
            });
        }
    }
    return scope;
}
export function selectModuleExports(scope, names) {
    return Object.fromEntries(names.map((name) => [name, scope[name]]));
}
