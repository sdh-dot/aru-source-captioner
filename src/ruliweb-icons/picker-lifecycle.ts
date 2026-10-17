// 종료 상태를 먼저 확정해 정리 중 발생한 이벤트와 늦게 완료된 비동기 작업의 화면 갱신을 막는다.
export class PickerLifecycle {
  #isClosed = false;
  #dispose: (() => void) | null;
  constructor(dispose: () => void) {
    this.#dispose = dispose;
  }
  get isClosed(): boolean {
    return this.#isClosed;
  }
  destroy(): void {
    if (this.#isClosed) {
      return;
    }
    this.#isClosed = true;
    const dispose = this.#dispose;
    this.#dispose = null;
    dispose?.();
  }
}
