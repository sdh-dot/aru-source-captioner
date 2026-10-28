import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const referenceCommit = '50a64edae5a73fe6269367545b178656fbfdf5ee';
export const approvedPatches = { vite: ['8.1.5', '8.1.6'], 'fast-uri': ['3.1.8', '3.1.9'], undici: ['7.30.0', '7.30.1'] };
export const dependencyFiles = ['package.json', 'package-lock.json'];
export const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export const gitBlob = bytes => crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const load = (directory, file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));

export function assertDependencyProfiles(directories, profile) {
  if (profile.schemaVersion !== 1 || !profile.id || profile.referenceCommit !== referenceCommit || !same(profile.patches, approvedPatches)) throw Error('DEPENDENCY_PROFILE_INVALID');
  for (const directory of directories) {
    if (hashFile(path.join(directory, 'package.json')) !== profile.packageJSONSHA256 || hashFile(path.join(directory, 'package-lock.json')) !== profile.lockfileSHA256) throw Error('BASELINE_DEPENDENCY_DRIFT');
  }
  return { id: profile.id, packageJSONSHA256: profile.packageJSONSHA256, lockfileSHA256: profile.lockfileSHA256 };
}

export function assertBaselineContract(baseline, profile, directory) {
  if (baseline.referenceCommit !== referenceCommit || baseline.lockfileSHA256 !== profile.referenceLockfileSHA256) throw Error('BASELINE_CONTRACT_DRIFT');
  return assertDependencyProfiles([directory], profile);
}

export function assertApprovedDependencyDelta(originalPackage, originalLock, approvedPackage, approvedLock) {
  const expectedPackage = structuredClone(originalPackage), expectedLock = structuredClone(originalLock);
  if (originalPackage.devDependencies.vite !== approvedPatches.vite[0]) throw Error('REFERENCE_DEPENDENCY_DRIFT');
  expectedPackage.devDependencies.vite = approvedPatches.vite[1];
  expectedLock.packages[''].devDependencies.vite = approvedPatches.vite[1];
  for (const [name, [before, after]] of Object.entries(approvedPatches)) {
    const key = 'node_modules/' + name, original = expectedLock.packages[key], approved = approvedLock.packages[key];
    if (original?.version !== before || approved?.version !== after || approved.resolved !== `https://registry.npmjs.org/${name}/-/${name}-${after}.tgz` || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(approved.integrity)) throw Error('UNAPPROVED_DEPENDENCY_CHANGE');
    Object.assign(original, { version: approved.version, resolved: approved.resolved, integrity: approved.integrity });
  }
  if (!same(expectedPackage, approvedPackage) || !same(expectedLock, approvedLock)) throw Error('UNAPPROVED_DEPENDENCY_CHANGE');
}

export function parseReferenceInventory(text) {
  const result = text.split('\0').filter(Boolean).map(record => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(record);
    if (!match || match[3].includes('\\') || match[3].startsWith('/') || match[3].split('/').includes('..')) throw Error('REFERENCE_INVENTORY_INVALID');
    return { path: match[3], blob: match[2] };
  });
  if (!result.length || new Set(result.map(item => item.path)).size !== result.length) throw Error('REFERENCE_INVENTORY_MISSING');
  return result;
}

export function assertSourceInventory(directory, inventory, { profiled = false, executed = false } = {}) {
  const expected = new Map(inventory.map(item => [item.path, item.blob]));
  if (!expected.size) throw Error('REFERENCE_INVENTORY_MISSING');
  for (const [relative, blob] of expected) {
    if (profiled && dependencyFiles.includes(relative)) continue;
    const file = path.join(directory, relative);
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile() || gitBlob(fs.readFileSync(file)) !== blob) throw Error('BASELINE_SOURCE_DRIFT: ' + relative);
  }
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name), relative = path.relative(directory, file).replaceAll('\\', '/');
      if (executed && (relative === 'node_modules' || relative === 'docs/results')) continue;
      if (entry.isDirectory()) walk(file);
      else if (!entry.isFile() || !expected.has(relative)) throw Error('BASELINE_SOURCE_EXTRA: ' + relative);
    }
  }
  walk(directory);
  return { files: expected.size, productSourceUnchanged: true };
}

export function installedProfile(directory, profile) {
  assertDependencyProfiles([directory], profile);
  const lock = load(directory, 'package-lock.json'), modules = path.join(directory, 'node_modules'), installed = load(modules, '.package-lock.json');
  const verified = [], omittedOptional = [];
  for (const [relative, entry] of Object.entries(lock.packages)) {
    if (!relative) continue;
    const file = path.join(directory, relative, 'package.json');
    if (!fs.existsSync(file)) {
      if (!entry.optional) throw Error('INSTALLED_DEPENDENCY_MISSING: ' + relative);
      omittedOptional.push(relative); continue;
    }
    const actual = JSON.parse(fs.readFileSync(file, 'utf8')), saved = installed.packages[relative];
    if (actual.version !== entry.version || saved?.version !== entry.version || saved?.integrity !== entry.integrity) throw Error('INSTALLED_DEPENDENCY_DRIFT: ' + relative);
    verified.push({ path: relative, version: actual.version, integrity: entry.integrity });
  }
  return { directory: fs.realpathSync(modules), hiddenLockSHA256: hashFile(path.join(modules, '.package-lock.json')), verified, omittedOptional };
}

export function assertSharedInstallation(directories, installed) {
  for (const directory of directories) {
    if (fs.realpathSync(path.join(directory, 'node_modules')) !== installed.directory) throw Error('INSTALLED_PROFILE_NOT_SHARED');
  }
}

export function assertHistoricalEvidence(directory, profile, baseline, runId) {
  const read = file => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
  const integrity = read('historical-integrity.json');
  if (!runId || integrity.runId !== runId || integrity.profile?.id !== profile.id || integrity.profile?.lockfileSHA256 !== profile.lockfileSHA256 || integrity.profile?.packageJSONSHA256 !== profile.packageJSONSHA256 || integrity.referenceCommit !== referenceCommit || integrity.referenceTree !== profile.referenceTree || integrity.referenceOriginalLockSHA256 !== baseline.lockfileSHA256 || integrity.sourceVerifiedBefore !== true || integrity.sourceVerifiedAfter !== true || integrity.sharedInstalledProfile !== true || !integrity.installed?.verified?.length) throw Error('HISTORICAL_INTEGRITY_EVIDENCE_MISSING');
  for (const name of ['reference', 'candidate']) {
    if (!fs.statSync(path.join(directory, 'historical-' + name + '.log')).size) throw Error('HISTORICAL_EXECUTION_EVIDENCE_MISSING');
  }
  if (!Object.keys(read('historical-installed-tree.json').dependencies || {}).length) throw Error('HISTORICAL_INSTALLED_TREE_MISSING');
  return { reference: read('historical-reference.json'), candidate: read('historical-candidate.json') };
}
