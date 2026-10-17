// 사이트와 기존 공개 API의 동적 경계다. 내부 데이터 모델은 별도 타입으로 좁힌다.
export type DynamicApi = Record<string, any>;
export type ResolverMap<Contract extends object = DynamicApi> = {
  [Key in keyof Contract]: () => Contract[Key];
};
type GlobalConstructors = Pick<
  typeof globalThis,
  | "URL"
  | "Blob"
  | "File"
  | "Uint8Array"
  | "ArrayBuffer"
  | "TextEncoder"
  | "TextDecoder"
  | "DataView"
  | "MutationObserver"
  | "CustomEvent"
  | "Event"
  | "Node"
  | "Element"
  | "HTMLElement"
  | "AbortController"
  | "IntersectionObserver"
  | "ResizeObserver"
  | "DOMParser"
>;
export interface RuntimeEnvironment extends Window, GlobalConstructors {
  [name: string]: any;
  browser?: DynamicApi;
  chrome: DynamicApi;
}
export interface FactoryOptions<
  Dependencies extends object = Record<string, ResolverMap>,
> {
  environment?: RuntimeEnvironment;
  dependencies?: Dependencies;
  metrics?: {
    start(name: string): (() => void) | undefined;
    count(name: string): void;
    gauge(name: string, value: number): void;
  } | null;
}
export const defaultEnvironment = globalThis as unknown as RuntimeEnvironment;

export interface CodedError extends Error {
  code?: string;
  retryable?: boolean;
}

export interface RuntimeOptions extends FactoryOptions {
  initialIcons?: DynamicApi;
  initialMetadata?: DynamicApi;
  initialBundle?: DynamicApi;
  initial?: DynamicApi;
}

export interface BridgeClient {
  request<T = DynamicApi>(operation: string, body?: object): Promise<T>;
  destroy(): void;
}

export type DefaultValues<T> = T extends boolean
  ? boolean
  : T extends number
    ? number
    : T extends string
      ? string
      : T extends readonly (infer V)[]
        ? DefaultValues<V>[]
        : T extends object
          ? { -readonly [K in keyof T]: DefaultValues<T[K]> }
          : T;
