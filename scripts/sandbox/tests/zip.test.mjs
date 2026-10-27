import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeZipArchive } from '../lib/zip.mjs';

test('writes zip64 end records when the archive has more than 65535 entries', (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'zip-writer-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const fileDirectory = join(directory, 'export', 'files');
    mkdirSync(fileDirectory, { recursive: true });
    const fileCount = 65_540;
    for (let index = 0; index < fileCount; index += 1) {
        writeFileSync(join(fileDirectory, `${index}`), `${index}`);
    }
    const archivePath = join(directory, 'export.zip');
    writeZipArchive({ sourceRoot: directory, name: 'export', archivePath });

    const result = JSON.parse(
        execFileSync(
            'python3',
            [
                '-c',
                'import json,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1])\nprint(json.dumps([len(z.infolist()),z.testzip(),z.read("export/files/65539").decode()]))',
                archivePath,
            ],
            { encoding: 'utf8' }
        )
    );
    // Two directory entries plus the files.
    assert.deepEqual(result, [fileCount + 2, null, '65539']);
});
