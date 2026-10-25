// 자동 생성: src/runtime/content-dispatcher.ts. tools/compile-typescript.mjs로 갱신한다.
const dispatchers = new WeakMap();
// 파일 선택 전달부는 문서에 하나만 둔다. 복귀 때 교체하는 것은 전달 대상 세션뿐이다.
export function contentDispatcher(environment, gate) {
    const doc = environment.document;
    let dispatcher = dispatchers.get(doc);
    if (!dispatcher) {
        dispatcher = createDispatcher(doc, gate.documentGate ?? gate);
        dispatchers.set(doc, dispatcher);
    }
    return dispatcher.begin(gate) ? dispatcher : undefined;
}
function createDispatcher(doc, documentGate) {
    let current;
    let change;
    const forward = (event) => {
        if (current?.allows()) {
            change?.(event);
        }
    };
    doc.addEventListener("change", forward, true);
    documentGate.onStop(() => {
        doc.removeEventListener("change", forward, true);
        change = undefined;
    });
    return {
        begin(gate) {
            if (current === gate || (current?.allows() ?? false) || !gate.allows()) {
                return false;
            }
            current = gate;
            gate.onStop(() => {
                if (current === gate) {
                    change = undefined;
                }
            });
            return true;
        },
        setChange(callback) {
            change = callback;
        },
    };
}
