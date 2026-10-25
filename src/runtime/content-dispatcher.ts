import type { RuntimeEnvironment } from "./contracts.ts";
import type { ContextEffectGate } from "./context-effect-gate.ts";

const dispatchers = new WeakMap<
  Document,
  ReturnType<typeof createDispatcher>
>();
// 파일 선택 전달부는 문서에 하나만 둔다. 복귀 때 교체하는 것은 전달 대상 세션뿐이다.
export function contentDispatcher(
  environment: RuntimeEnvironment,
  gate: ContextEffectGate,
) {
  const doc = environment.document;
  let dispatcher = dispatchers.get(doc);
  if (!dispatcher) {
    dispatcher = createDispatcher(doc, gate.documentGate ?? gate);
    dispatchers.set(doc, dispatcher);
  }
  return dispatcher.begin(gate) ? dispatcher : undefined;
}
function createDispatcher(doc: Document, documentGate: ContextEffectGate) {
  let current: ContextEffectGate | undefined;
  let change: EventListener | undefined;
  const forward: EventListener = (event) => {
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
    begin(gate: ContextEffectGate) {
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
    setChange(callback: EventListener) {
      change = callback;
    },
  };
}
