import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createModuleScope, selectModuleExports } from "../../src/runtime/module-scope.ts";

test("Runtime은 클래스 식별성과 선행 값·늦은 의존성의 조회 시점을 보존한다", () => {
  class First {}
  class Later {}
  let current = First;
  const calls: string[] = [];
  const resolvers = {
    own: () => { calls.push("own"); return current; },
    late: () => { calls.push("late"); return current; },
  };
  const names = Object.freeze(["own", "late", "missing"]);
  const scope = createModuleScope(resolvers, names, Object.freeze(["own"]));
  assert.deepEqual(calls, ["own"]);
  assert.deepEqual(Object.keys(scope), [...names]);
  current = Later;
  assert.equal(scope.own, First);
  assert.equal(scope.late, Later);
  assert.equal(scope.missing, undefined);
  const exported = selectModuleExports(scope, ["own", "late"]);
  current = First;
  assert.equal(exported.own, First);
  assert.equal(exported.late, Later);
  assert.equal(scope.late, First);
  const separate = createModuleScope(resolvers, names, ["own"]);
  separate.own = Later;
  assert.equal(scope.own, First);
  assert.equal(Object.getOwnPropertyDescriptor(scope, "late")?.set, undefined);
});

test("실제 TypeScript 계약은 resolver 오타·값 불일치·선택하지 않은 공개 API를 거절한다", () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const configPath = path.join(root, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const filename = path.join(root, "tests/typescript/virtual-contract-check.ts");
  const fixture = `
import { selectModuleExports } from "../../src/runtime/module-scope.ts";
import type { ResolverMap } from "../../src/runtime/contracts.ts";
import { createIconsPicker } from "../../src/ruliweb-icons/picker.ts";
const valid: ResolverMap<{ count: number }> = { count: () => 1 };
// @ts-expect-error resolver 결과는 계약과 같아야 한다.
const invalid: ResolverMap<{ count: number }> = { count: () => "1" };
const selected = selectModuleExports({ count: 1, hidden: true }, ["count"] as const);
selected.count.toFixed();
// @ts-expect-error 선택하지 않은 내부 속성은 공개하지 않는다.
selected.hidden;
// @ts-expect-error 존재하지 않는 export 이름은 거절한다.
selectModuleExports({ count: 1 }, ["coutn"]);
createIconsPicker({ dependencies: { icons: { SearchIndex: () => undefined } } });
// @ts-expect-error 잘못된 Picker 의존성 이름은 거절한다.
createIconsPicker({ dependencies: { icons: { SearchIndxe: () => undefined } } });
void valid; void invalid;
`;
  const host = ts.createCompilerHost(parsed.options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language, onError, fresh) => path.resolve(name) === filename
    ? ts.createSourceFile(name, fixture, language, true)
    : original(name, language, onError, fresh);
  const program = ts.createProgram([...parsed.fileNames, filename], { ...parsed.options, noEmit: true }, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(d => ({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, "\n") })), []);
});
