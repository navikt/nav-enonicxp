import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

test('the archived importer can start using only its packaged modules', (t) => {
    const packer = readFileSync(new URL('../create-curated-export.mjs', import.meta.url), 'utf8');
    const modules = [
        ...packer.slice(packer.indexOf("'tar',")).matchAll(/'(scripts\/[^']+\.mjs)'/g),
    ].map((match) => match[1]);
    assert.ok(modules.length > 0);
    const directory = mkdtempSync(join(tmpdir(), 'curated-archive-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    for (const module of modules) {
        const destination = join(directory, module);
        mkdirSync(dirname(destination), { recursive: true });
        copyFileSync(resolve(module), destination);
    }
    const result = spawnSync(process.execPath, ['scripts/import-curated-export.mjs'], {
        cwd: directory,
        encoding: 'utf8',
        env: {},
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Usage: node scripts\/import-curated-export.mjs/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
});
