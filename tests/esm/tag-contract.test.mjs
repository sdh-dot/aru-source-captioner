import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as codec from '../../shared/icon-metadata/tag-codec.mjs';
import { plan, Selection } from '../../shared/icon-metadata/tag-edit-model.mjs';
import { installLegacyTagApis } from '../../shared/icon-metadata/legacy-adapter.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/tag-cases.json', import.meta.url), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(new URL('./fixtures/legacy.json', import.meta.url), 'utf8')).baselines.filter(item => ['writer', 'reader'].includes(item.namespace)).map(item => {
const context = vm.createContext({});
vm.runInContext(item.source, context, { filename: item.name });
return { name: item.name, api: item.namespace === 'reader' ? context.AruIcons.AttributeTags : context.AruMetadata };
});

function outcome(run) {
  try {
    return { ok: true, value: structuredClone(run()) };
  } catch (error) {
    return { ok: false, error: { name: error.name, code: error.code, message: error.message } };
  }
}

function compareCodec(api, operation, input) {
  const oldInput = structuredClone(input);
  const newInput = structuredClone(input);
  const expected = outcome(() => api[operation](oldInput));
  const actual = outcome(() => codec[operation](newInput));
  assert.deepEqual(actual, expected, operation);
  assert.deepEqual(oldInput, input, '기존 입력 보존');
  assert.deepEqual(newInput, input, 'ESM 입력 보존');
}

function generator(values) {
  let calls = 0;
  return {
    next() {
      const index = calls++;
      return index < values.length ? values[index] : 'generated-' + index;
    },
    get calls() { return calls; }
  };
}

function comparePlan(api, input, ids = []) {
  const before = structuredClone(input);
  const oldInput = structuredClone(input);
  const newInput = structuredClone(input);
  const oldIds = generator(ids);
  const newIds = generator(ids);
  const expected = outcome(() => api.plan(...oldInput, () => oldIds.next()));
  const actual = outcome(() => plan(...newInput, () => newIds.next()));
  assert.deepEqual(actual, expected);
  assert.equal(newIds.calls, oldIds.calls, 'ID 생성 횟수');
  assert.deepEqual(oldInput, before, '기존 입력 보존');
  assert.deepEqual(newInput, before, 'ESM 입력 보존');
  return actual;
}

function makeRandom(seed) {
  return maximum => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % maximum;
  };
}

test('ESM import는 DOM·확장 API·전역 등록 없이 완료된다', () => {
  const urls = ['tag-codec', 'tag-edit-model', 'legacy-adapter'].map(name =>
    pathToFileURL(path.join(root, 'shared/icon-metadata', name + '.mjs')).href);
  const script = `
    for (const name of ['document', 'window', 'browser', 'chrome', 'localStorage', 'fetch', 'AruIcons', 'AruMetadata']) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        get() { throw Error('Unexpected global read: ' + name); },
        set() { throw Error('Unexpected global write: ' + name); }
      });
    }
    await Promise.all(${JSON.stringify(urls)}.map(url => import(url)));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('저장 태그 계약: 대소문자·전각·순서·쉼표·고정 13개 보존', () => {
  assert.equal(codec.PREFIX, 'aru-tags:v1:');
  assert.deepEqual(codec.FIXED, ['인사', '사과', '축하', '응원', '감사', '미소', '도발', '조토피아', '매도', '분노', '슬픔', '당황', '놀람']);
  assert.equal(Object.isFrozen(codec.FIXED), true);
  for (const { input, expected } of fixtures.normalize) {
    assert.deepEqual(codec.normalize(input), expected);
    const encoded = codec.encode(input);
    assert.equal(encoded, codec.PREFIX + encodeURIComponent(JSON.stringify(expected)));
    assert.deepEqual(codec.decode(encoded), expected);
  }
  for (const { input, expected } of fixtures.decode) assert.deepEqual(codec.decode(input), expected);
  for (const { input, code } of fixtures.decodeErrors) assert.throws(() => codec.decode(input), { code });
});

test('편집은 no-op 원문·ID 보정·미선택 이미지·빈 replace·이미지 순서를 보존한다', () => {
  const raw = ' 아루,미소,아루 ';
  const images = [
    { handle: 'a', id: '', rawTags: raw },
    { handle: 'b', id: 'kept', rawTags: 'aru-tags:v1:%broken' }
  ];
  const original = structuredClone(images);
  const noOp = plan(images, ['a'], ['아루'], 'add', () => 'first-id');
  assert.deepEqual(noOp, { changes: [{ handle: 'a', id: 'first-id', rawTags: raw }], selected: 1, changed: 1, ids: 1, tagChanges: 0 });
  const cleared = plan([{ handle: 'a', id: 'id', rawTags: '아루' }], ['a'], [], 'replace', () => assert.fail('ID 유지'));
  assert.equal(cleared.changes[0].rawTags, 'aru-tags:v1:%5B%5D');
  const added = plan([
    { handle: 'a', id: 'a', rawTags: '인사' },
    { handle: 'b', id: 'b', rawTags: '미소' }
  ], ['b', 'a'], ['감사'], 'add', () => assert.fail('ID 유지'));
  assert.deepEqual(added.changes.map(change => [change.handle, codec.decode(change.rawTags)]), [['a', ['인사', '감사']], ['b', ['미소', '감사']]]);
  assert.deepEqual(images, original);
});

const boundaryTags = Array.from({ length: 128 }, (_, index) =>
  String(index).padStart(3, '0') + 'x'.repeat((index === 0 ? 488 : 503) - 3));
const oversizedTags = structuredClone(boundaryTags);
oversizedTags[0] += 'x';
const codecInputs = [
  ...fixtures.normalize.map(item => item.input),
  null, undefined, {}, '아루', [null], [1], [undefined], ['\u0000'], ['\u000b'], ['\u007f'],
  ['x'.repeat(512)], ['x'.repeat(513)], ['😀'.repeat(256)], ['😀'.repeat(257)],
  Array(1000).fill('아루'), Array(1001).fill('아루'), ['\ud800'], ['\udc00'],
  boundaryTags, oversizedTags
];
const decodeInputs = [
  ...fixtures.decode.map(item => item.input), ...fixtures.decodeErrors.map(item => item.input),
  undefined, 17, {}, [], 'a'.repeat(65537),
  codec.PREFIX + '["a"]' + ' '.repeat(65536 - codec.PREFIX.length - 5),
  codec.PREFIX + '["a"]' + ' '.repeat(65537 - codec.PREFIX.length - 5)
];

for (const { name, api } of legacy) {
  test(name + ': codec 입출력·예외 name/code/message 동등성', () => {
    assert.equal(api.PREFIX, codec.PREFIX);
    assert.deepEqual(structuredClone(api.FIXED), codec.FIXED);
    for (const input of codecInputs) {
      compareCodec(api, 'normalize', input);
      compareCodec(api, 'encode', input);
    }
    for (const input of decodeInputs) compareCodec(api, 'decode', input);
    const random = makeRandom(835);
    const pool = ['아루', '미소', ' 쉼표,포함 ', 'A', 'a', 'Ａ', '😀', '줄\n바꿈', '', '  '];
    for (let iteration = 0; iteration < 200; iteration++) {
      const input = Array.from({ length: random(20) }, () => pool[random(pool.length)]);
      compareCodec(api, 'encode', input);
      compareCodec(api, 'decode', codec.encode(input));
    }
  });

  if (!api.plan) continue;
  test(name + ': plan 오류·ID 충돌·no-op·생성 횟수·입력 보존 동등성', () => {
    const image = { handle: 'a', id: 'same', rawTags: ' 아루,미소,아루 ' };
    const cases = [
      [[image], ['a'], ['아루'], 'add'],
      [[image], ['a'], ['아루'], 'remove'],
      [[image], ['a'], [], 'replace'],
      [[image], ['a'], [], 'add'],
      [[image], ['a'], [], 'remove'],
      [[image], ['a'], ['감사'], 'invalid'],
      [[{ ...image, rawTags: Array.from({ length: 1000 }, (_, i) => 'tag' + i).join(',') }], ['a'], ['extra'], 'add'],
      [[image], [], ['감사'], 'add'],
      [[image], ['a', 'a'], ['감사'], 'add'],
      [[image], ['missing'], ['감사'], 'add'],
      [[{ ...image, rawTags: 'aru-tags:v1:%broken' }], ['a'], ['감사'], 'add'],
      [[{ ...image, rawTags: 'aru-tags:v2:[]' }], ['a'], [], 'replace'],
      [[{ ...image, id: null, rawTags: null }], ['a'], [], 'replace'],
      [[{ ...image, id: '' }], ['a'], ['아루'], 'add'],
      [[image, { ...image, handle: 'b' }], ['a'], ['감사'], 'add'],
      [[image, { ...image, handle: 'b' }], ['b', 'a'], ['감사'], 'add'],
      [[{ ...image, id: '' }], ['a'], [null], 'add']
    ];
    for (const input of cases) comparePlan(api, input, ['same', 'new-id']);
    for (const invalidId of ['', null, undefined, 7, {}]) {
      const result = comparePlan(api, [[{ ...image, id: '' }], ['a'], ['아루'], 'add'], [invalidId]);
      assert.equal(result.error.code, 'ID_INVALID');
    }
    for (const collisions of [99, 100]) {
      const ids = [...Array(collisions).fill('same'), 'free'];
      const result = comparePlan(api, [[image, { ...image, handle: 'b' }], ['a'], [], 'replace'], ids);
      if (collisions === 99) assert.equal(result.ok, true);
      else assert.equal(result.error.code, 'ID_COLLISION');
    }
    const random = makeRandom(903);
    for (let iteration = 0; iteration < 300; iteration++) {
      const images = Array.from({ length: 1 + random(8) }, (_, index) => ({
        handle: 'h' + index,
        id: random(3) === 0 ? '' : 'id' + random(4),
        rawTags: random(2) ? ' 아루,미소,아루 ' : 'aru-tags:v1:%5B%22A%22%5D'
      }));
      const handles = images.filter(() => random(2)).map(item => item.handle).reverse();
      const operation = ['add', 'remove', 'replace'][random(3)];
      comparePlan(api, [images, handles, iteration % 2 ? ['아루', '감사'] : [], operation], ['id0', 'id1']);
    }
    const error = outcome(() => api.fail('CUSTOM', '기존 오류'));
    assert.deepEqual(outcome(() => codec.fail('CUSTOM', '기존 오류')), error);
    const input = [[{ ...image, id: '' }], ['a'], ['감사'], 'add'];
    assert.deepEqual(
      outcome(() => plan(...input, () => { throw Object.assign(new Error('생성기 실패'), { code: 'GENERATOR' }); })),
      outcome(() => api.plan(...input, () => { throw Object.assign(new Error('생성기 실패'), { code: 'GENERATOR' }); }))
    );
  });

  test(name + ': Selection의 anchor·삽입 순서·반환값·인스턴스 독립성', () => {
    const previous = new api.Selection();
    const current = new Selection();
    const snapshot = value => ({ values: [...value.values], anchor: value.anchor });
    const order = ['a', 'b', 'c', 'd', 'e'];
    const actions = [
      ['click', 'c', order], ['click', 'a', order, { shiftKey: true }],
      ['click', 'e', order, { metaKey: true }], ['click', 'b', order, { ctrlKey: true }],
      ['click', 'd', order, { checkbox: true }], ['retain', ['a', 'b']],
      ['all', order], ['clear'], ['click', 'b', order],
      ['click', 'e', order, { shiftKey: true, ctrlKey: true }],
      ['retain', ['d', 'e']], ['click', 'a', order, { shiftKey: true }]
    ];
    const random = makeRandom(429);
    for (let index = 0; index < 300; index++) {
      actions.push(['click', order[random(order.length)], order, {
        ctrlKey: random(2) === 0, metaKey: random(2) === 0,
        shiftKey: random(2) === 0, checkbox: random(2) === 0
      }]);
    }
    for (const [method, ...args] of actions) {
      assert.deepEqual(outcome(() => current[method](...args)), outcome(() => previous[method](...args)));
      assert.deepEqual(snapshot(current), snapshot(previous));
    }
    assert.deepEqual(snapshot(new Selection()), { values: [], anchor: null });
    assert.equal(current.values.has('isolated'), false);
    const separate = new Selection();
    separate.click('isolated', ['isolated']);
    assert.equal(current.values.has('isolated'), false);
  });
}

test('속성 65536 경계와 1000개/512 UTF-16 규칙을 유지한다', () => {
  assert.equal(codec.encode(boundaryTags).length, 65536);
  assert.deepEqual(codec.decode(codec.encode(boundaryTags)), boundaryTags);
  assert.throws(() => codec.encode(oversizedTags), { code: 'TAGS_INVALID' });
  assert.deepEqual(codec.normalize(Array(1000).fill('아루')), ['아루']);
  assert.throws(() => codec.normalize(Array(1001).fill('아루')), { code: 'TAGS_INVALID' });
  assert.equal(codec.normalize(['😀'.repeat(256)])[0].length, 512);
  assert.throws(() => codec.normalize(['😀'.repeat(257)]), { code: 'TAGS_INVALID' });
});

test('명시적 호환 어댑터는 기존 namespace/UI 참조를 보존하며 같은 exports를 연결한다', () => {
  const target = { AruIcons: { feature: {} }, AruMetadata: { Controller: class {} } };
  const icons = target.AruIcons;
  const metadata = target.AruMetadata;
  const controller = metadata.Controller;
  const result = installLegacyTagApis(target);
  assert.equal(result.AruIcons, icons);
  assert.equal(result.AruMetadata, metadata);
  assert.equal(metadata.Controller, controller);
  assert.equal(Object.isFrozen(icons.AttributeTags), true);
  assert.deepEqual(Object.keys(icons.AttributeTags), ['PREFIX', 'FIXED', 'normalize', 'decode', 'encode']);
  for (const key of ['PREFIX', 'FIXED', 'fail', 'normalize', 'decode', 'encode']) assert.equal(metadata[key], codec[key]);
  assert.equal(metadata.plan, plan);
  assert.equal(metadata.Selection, Selection);
  assert.equal(icons.AttributeTags.encode, metadata.encode);
  assert.deepEqual(metadata.decode(icons.AttributeTags.encode(['아루', '쉼표,포함'])), ['아루', '쉼표,포함']);
  installLegacyTagApis(target);
  assert.equal(target.AruMetadata, metadata);
  assert.equal(metadata.Controller, controller);
  const otherWorld = {};
  installLegacyTagApis(otherWorld);
  assert.notEqual(otherWorld.AruIcons, icons);
  assert.notEqual(otherWorld.AruMetadata, metadata);
});
