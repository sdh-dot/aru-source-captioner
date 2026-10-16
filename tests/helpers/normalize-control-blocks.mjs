// 중괄호 스타일만 비교에서 제외한다. 선언의 유효 범위·조건식·실행 순서는 정규화하지 않는다.
const safeStatements = new Set(['ReturnStatement','ThrowStatement','BreakStatement','ContinueStatement','ExpressionStatement','IfStatement','ForStatement','ForOfStatement','ForInStatement','WhileStatement','DoWhileStatement','TryStatement']);
export function normalizeControlBlocks(value) {
 if (!value || typeof value !== 'object') return value;
 if (Array.isArray(value)) return value.map(normalizeControlBlocks);
 const node = Object.fromEntries(Object.entries(value).filter(([key])=>!['start','end','raw'].includes(key)).map(([key,child])=>[key,normalizeControlBlocks(child)]));
 const keys = node.type === 'IfStatement' ? ['consequent','alternate'] : ['ForStatement','ForOfStatement','ForInStatement','WhileStatement','DoWhileStatement','WithStatement'].includes(node.type) ? ['body'] : [];
 for (const key of keys) if (node[key]?.type === 'BlockStatement' && node[key].body.length === 1 && safeStatements.has(node[key].body[0].type)) node[key] = node[key].body[0];
 return node;
}
