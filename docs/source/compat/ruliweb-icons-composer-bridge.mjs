// 기존 classic 실행 경로에만 공개 API를 등록한다. 알고리즘은 ESM 원본에서 가져온다.
import { createIconsComposerBridge } from '../ruliweb-icons/composer-bridge.mjs';

const result = createIconsComposerBridge({ environment: globalThis, dependencies: {} });
