// 자동 생성: src/ruliweb-icons/registry.ts. tools/compile-typescript.mjs로 갱신한다.
// 등록 목록은 JSON 원본에서 읽고 실행 영역마다 독립된 객체를 제공한다.
import registry from "./pack-registry.json" with { type: "json" };
export function createIconsRegistry() {
    return { icons: { packRegistry: JSON.parse(JSON.stringify(registry)) } };
}
