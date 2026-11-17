#!/usr/bin/env bash
set -euo pipefail
report_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$report_dir"
ulimit -c 0
browser=""
for candidate in google-chrome-stable chromium google-chrome chromium-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    browser="$(command -v "$candidate")"
    break
  fi
done
if [[ -z "$browser" ]]; then
  printf 'Chrome or Chromium is required.\n' >&2
  exit 1
fi
for dependency in python3 pdfinfo pdffonts; do
  command -v "$dependency" >/dev/null || { printf 'Missing tool: %s\n' "$dependency" >&2; exit 1; }
done

# Keep all temporary browser state and output inside submission/.
scratch="$(mktemp -d "$report_dir/.p-XXXXXX")"
trap 'rm -rf -- "$scratch"' EXIT
mkdir -p "$scratch/cache" "$scratch/config" "$scratch/t"
report_uri="$(python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).as_uri())' "$report_dir/report.html")"

# The page awaits its embedded web fonts, image loading and layout checks.
# Chrome's virtual-time budget allows those tasks to settle before printing.
if ! XDG_CACHE_HOME="$scratch/cache" XDG_CONFIG_HOME="$scratch/config" TMPDIR="$scratch/t" \
  "$browser" --headless --disable-gpu --disable-dev-shm-usage \
  --no-pdf-header-footer --print-to-pdf="$scratch/report.pdf" \
  --user-data-dir="$scratch/profile" --no-first-run --no-default-browser-check \
  --disable-background-networking --disable-extensions --disable-sync \
  --disable-crash-reporter --disable-breakpad --noerrdialogs \
  --font-render-hinting=none --run-all-compositor-stages-before-draw \
  --virtual-time-budget=10000 --timeout=60000 --dump-dom "$report_uri" \
  >"$scratch/rendered.html" 2>"$scratch/chrome.log"; then
  cat "$scratch/chrome.log" >&2
  exit 1
fi

python3 - "$scratch/rendered.html" "$report_dir" <<'PY'
import json, sys
from html.parser import HTMLParser
from pathlib import Path
class Report(HTMLParser):
    def __init__(self):
        super().__init__(); self.body={}; self.counts={}; self.capture=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='body': self.body=a
        if 'data-count' in a: self.capture=a['data-count']
    def handle_data(self, data):
        if self.capture:
            self.counts[self.capture]=int(data.strip()); self.capture=None
p=Report(); p.feed(Path(sys.argv[1]).read_text())
if p.body.get('data-report-state')!='ready':
    raise SystemExit('Report is not ready: '+str(p.body))
root=Path(sys.argv[2]).parent
objects=json.loads((root/'app/public/objects/index.json').read_text())
rigs=[json.loads((root/'app/public/objects'/o['id']/'rig.json').read_text()) for o in objects]
actual={'objects':len(objects), 'parts':sum(len(r['parts']) for r in rigs), 'joints':sum(j['type']!='fixed' for r in rigs for j in r['joints'])}
if p.counts != actual:
    raise SystemExit(f'Update the report counts before printing: HTML {p.counts}, files {actual}')
rows=[{'id':o['id'], 'name':o['name'], 'file':f"app/public/objects/{o['id']}/rig.json",
       'parts':len(r['parts']), 'moving_joints':sum(j['type']!='fixed' for j in r['joints']),
       'merged_part_entries':sum(part.get('with') is not None for part in r['parts'])}
      for o,r in zip(objects,rigs)]
ledger={'method':'Objects = index entries. Split parts = lengths of parts arrays, including bases and merged entries. Moving joints = non-fixed joints.',
        'totals':{'objects':actual['objects'], 'split_parts':actual['parts'], 'moving_joints':actual['joints'],
                  'merged_part_entries':sum(row['merged_part_entries'] for row in rows)}, 'objects':rows}
(Path(sys.argv[2])/'source-counts.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('Layout:', p.body['data-report-checks'])
print('Verified source counts:', json.dumps(actual))
PY
pdfinfo "$scratch/report.pdf" >"$scratch/pdfinfo.txt"
pdffonts "$scratch/report.pdf" >"$scratch/pdffonts.txt"
python3 - "$scratch" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); info=(p/'pdfinfo.txt').read_text()
if not re.search(r'Pages:\s+9\b',info): raise SystemExit('Expected exactly 9 PDF pages')
size=re.search(r'Page size:\s+([\d.]+) x ([\d.]+) pts',info)
# Chrome rounds CSS paper dimensions to its internal print units.
if not size or any(abs(float(value)-target)>0.2 for value,target in zip(size.groups(),(1200,675))):
    raise SystemExit('Unexpected page size')
lines=(p/'pdffonts.txt').read_text().splitlines()[2:]
families=set()
for line in lines:
    fields=line.split(); name=fields[0].split('+')[-1]
    if name not in ('Geist-Regular','GeistMono-Regular','LeagueGothic-Regular'): raise SystemExit('Unexpected or fallback font: '+name)
    if fields[-5]!='yes': raise SystemExit('Font is not embedded: '+name)
    families.add(name)
if len(families)!=3: raise SystemExit('Expected all three report typefaces in the PDF')
print('PDF: 9 pages, 1600 x 900 CSS pixels, all three typefaces embedded, no fallback fonts.')
PY
mv -- "$scratch/report.pdf" "$report_dir/Hinge Hunt + Hinge Hunt.pdf"
printf 'Created %s\n' "$report_dir/Hinge Hunt + Hinge Hunt.pdf"
