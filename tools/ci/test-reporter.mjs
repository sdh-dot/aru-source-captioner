// 원래 테스트/종료 코드를 바꾸지 않고 비교에 필요한 identity·summary만 내보낸다.
export default async function* report(events) {
  for await (const event of events) {
    if (event.type === 'test:pass' || event.type === 'test:fail') {
      const { name, file, nesting } = event.data;
      yield '@@ARU_TEST@@' + JSON.stringify({ type: event.type, name, file, nesting }) + '\n';
    } else if (event.type === 'test:summary' && !event.data.file) {
      yield '@@ARU_TEST@@' + JSON.stringify({ type: event.type, counts: event.data.counts }) + '\n';
    }
  }
}
