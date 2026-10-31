#!/usr/bin/env python3
"""Publish a file to github.com/slgoodwin33/Otto via the contents API.
Usage: GITHUB_TOKEN=... publish.py <local file> <repo path> "<commit message>" [--dry-run]
Refuses to publish when the remote file changed since the build started (pass --expect-sha)."""
import base64, json, os, sys, urllib.request
REPO = 'slgoodwin33/Otto'
def api(method, url, body=None, token=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body else None,
        headers={'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', **({'Authorization': f'Bearer {token}'} if token else {})})
    with urllib.request.urlopen(req) as r: return json.load(r)
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; dry = '--dry-run' in sys.argv
    exp = next((a.split('=',1)[1] for a in sys.argv if a.startswith('--expect-sha=')), None)
    local, path, msg = args
    token = os.environ.get('GITHUB_TOKEN')
    cur = api('GET', f'https://api.github.com/repos/{REPO}/contents/{path}?ref=main', token=token)
    if exp and not cur['sha'].startswith(exp): sys.exit(f'Remote {path} changed since this build started ({cur["sha"][:10]} ≠ {exp}); not overwriting.')
    content = open(local,'rb').read()
    if base64.b64decode(cur['content']) == content: print('No change; nothing to publish.'); return
    if dry or not token: print(f'[dry run] would commit {len(content):,} bytes to {path} over {cur["sha"][:10]}: "{msg}"'); return
    out = api('PUT', f'https://api.github.com/repos/{REPO}/contents/{path}', {'message': msg, 'content': base64.b64encode(content).decode(), 'sha': cur['sha'], 'branch':'main'}, token)
    print('Published:', out['commit']['sha'][:10], out['commit']['html_url'])
if __name__ == '__main__': main()
