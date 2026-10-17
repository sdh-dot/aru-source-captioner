(() => {
  const document = window.document;
  function require(condition, message) { if (!condition) throw Error(message); }
  function request(op, payload) {
    const requestId = crypto.randomUUID().replaceAll('-', ''); let reply;
    const listener = event => { const value = JSON.parse(event.detail); if (value.requestId === requestId) reply = value; };
    document.addEventListener('aru-metadata-response-v1', listener);
    document.dispatchEvent(new CustomEvent('aru-metadata-request-v1', { detail: JSON.stringify({ requestId, op, ...payload }) }));
    document.removeEventListener('aru-metadata-response-v1', listener);
    require(reply, '동기 bridge 응답 누락');
    if (!reply.ok) throw Object.assign(Error(reply.error.message), { code: reply.error.code });
    return reply.result;
  }
  const root = document.querySelector('#editor_v2 .seditor'), input = root.querySelector('.note-editable');
  const second = input.querySelectorAll('img')[1], secondBefore = second.outerHTML, text = input.textContent;
  const session = request('scan', { token: root.dataset.aruMetadataTarget });
  const handles = [session.images[0].handle], raw = () => input.querySelector('img').getAttribute('data-aru-tags');
  const tags = () => JSON.parse(decodeURIComponent(raw().slice('aru-tags:v1:'.length)));
  const run = (operation, values) => request('apply', { session: session.session, handles, operation, tags: values });
  const before = input.innerHTML;
  request('preview', { session: session.session, handles, operation: 'add', tags: ['캐릭터 이름'] });
  require(input.innerHTML === before, 'preview가 본문을 변경함');
  require(run('add', ['캐릭터 이름', '아루']).serialized === true, '저장 HTML 검증 누락');
  require(JSON.stringify(tags()) === JSON.stringify(['아루', '기쁨', '캐릭터 이름']), '추가 결과 불일치');
  const saved = raw(); require(run('add', ['아루']).changed === 0 && raw() === saved, 'no-op 원문 변경');
  run('remove', ['기쁨']); require(JSON.stringify(tags()) === JSON.stringify(['아루', '캐릭터 이름']), '제거 결과 불일치');
  run('replace', ['새 태그']); require(JSON.stringify(tags()) === JSON.stringify(['새 태그']), '교체 결과 불일치');
  run('replace', []); require(JSON.stringify(tags()) === '[]', '빈 교체 결과 불일치');
  require(input.querySelector('img').getAttribute('data-aru-id') === 'first-keep', '기존 ID 변경');
  require(second.outerHTML === secondBefore && input.textContent === text, '비대상 또는 본문 변경');
  const html = input.innerHTML;
  let code;
  try { request('apply', { session: session.session, handles: ['missing-handle'], operation: 'add', tags: ['오류'] }); } catch (error) { code = error.code; }
  require(code === 'IMAGE_CHANGED' && input.innerHTML === html, '오류 코드 또는 실패 원자성 불일치');
  request('release', { session: session.session });
  return { add: true, remove: true, replace: true, emptyReplace: true, noOpRaw: true, idsPreserved: true, nonTargetsPreserved: true, serialized: true, errorCode: code, serverSubmit: false };
})()
