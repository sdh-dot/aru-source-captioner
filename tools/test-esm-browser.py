"""기존 독립 E2E를 재사용하되 배포 ZIP 대신 이 작업 트리의 생성물을 설치한다."""
from pathlib import Path
import argparse
import importlib.util
import json
import sys
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--harness', type=Path, required=True)
parser.add_argument('--browser', choices=['firefox', 'chromium', 'whale'], required=True)
args = parser.parse_args()
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
root = Path(__file__).resolve().parent.parent
harness = args.harness.resolve()
sys.path.insert(0, str(harness))
import common

common.prepare_cache()
results = root / 'docs/results/esm-e2e'
results.mkdir(parents=True, exist_ok=True)
common.ROOT = results
common.ARTIFACTS = results / '.artifacts'
common.ARTIFACTS.mkdir(exist_ok=True)
base_report = common.Report

class CandidateReport(base_report):
    def save(self):
        self.metadata.update({
            'baseline': 'isolated ESM worktree build; not the historical distribution or signed AMO package',
            'extensionCodeModified': True,
            'runtimePatching': False,
            'sourceRoot': str(root),
        })
        if 'poc' in self.metadata:
            self.metadata['poc']['scope'] = 'real browser + this candidate extension; controlled site DOM/native API fixtures; not authenticated SITE verification'
        for item in self.records:
            if item['test'] == 'extension.install':
                item['actions'] = ['Install the isolated candidate build into a fresh test profile; not the signed AMO/historical ZIP', 'Read the real runtime Manifest']
        super().save()

common.Report = CandidateReport

def package(browser):
    folder = root / browser
    output = results / (browser + '-candidate.zip')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(folder.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(folder).as_posix())
    return output

common.FIREFOX_ZIP = package('firefox')
common.CHROMIUM_ZIP = package('whale')
common.firefox_package = lambda: common.FIREFOX_ZIP
common.chromium_package = lambda: root / 'whale'

# 실제 Manifest로 주입된 MAIN/ISOLATED 코드를 fixture 작성기에서 검증한다.
import fixtures.site as site
import workflows
writer_url = 'https://bbs.ruliweb.com/community/board/98/modify/900000001?aru-esm-fixture=1'
original_response = site.response
def response(url):
    if url == writer_url:
        return {'status': 200, 'content_type': 'text/html; charset=utf-8', 'body': (root / 'tests/esm/fixtures/editor.html').read_text(encoding='utf-8')}
    return original_response(url)
site.response = response
check = (root / 'tests/esm/fixtures/editor-check.js').read_text(encoding='utf-8')
ready = 'window.__aruMetadataBridgeInstalled && !!document.querySelector("#editor_v2 .seditor")?.dataset.aruMetadataTarget'
original_chromium_mock = workflows.chromium_mock
def chromium_mock(page, report):
    original_chromium_mock(page, report)
    page.goto(writer_url, wait_until='domcontentloaded')
    page.wait_for_function('() => ' + ready)
    observed = page.evaluate(check)
    report.check('mock.metadata-main-codec-edit-serialize', 'MOCK', 'PASS', observed, ['Manifest-injected candidate bridge; fixture Summernote API; no server save'])
workflows.chromium_mock = chromium_mock
original_firefox_mock = workflows.firefox_mock
def firefox_mock(driver, wait, report):
    original_firefox_mock(driver, wait, report)
    driver.get(writer_url)
    wait.until(lambda driver: driver.execute_script('return ' + ready))
    observed = driver.execute_script('return ' + check)
    report.check('mock.metadata-main-codec-edit-serialize', 'MOCK', 'PASS', observed, ['Manifest-injected candidate bridge; fixture Summernote API; no server save'])
workflows.firefox_mock = firefox_mock

spec = importlib.util.spec_from_file_location('candidate_browser', harness / ('firefox' if args.browser == 'firefox' else 'chromium') / 'run.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
report = module.run() if args.browser == 'firefox' else module.run(whale=args.browser == 'whale')
code = int(any(item['status'] == 'FAIL' for item in report.records))
print(json.dumps({'candidate': str(root), 'browser': args.browser, 'exitCode': code, 'report': str(report.report_path)}))
raise SystemExit(code)
