// 같은 ISOLATED 실행 영역의 기존 진단 API만 재사용한다.
import { createPerformanceMetrics } from '../performance/metrics.mjs';
export function getLegacyPerformanceMetrics(environment = globalThis) {
  return environment.AruPerformance ||= createPerformanceMetrics({ environment });
}
