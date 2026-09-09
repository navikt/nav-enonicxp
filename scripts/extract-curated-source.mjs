#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractCuratedSource } from './lib/curated-source-extractor.mjs';

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 2) {
    if (!args[index]?.startsWith('--') || !args[index + 1]) {
        throw new Error(`Invalid argument: ${args[index] || ''}`);
    }
    options[args[index].slice(2)] = args[index + 1];
}

const auth = process.env.CURATED_SOURCE_AUTH || process.env.ENONIC_AUTH;
if (!options.manifest || !options['service-url'] || !options['export-dir'] || !auth) {
    throw new Error(
        'Usage: CURATED_SOURCE_AUTH=user:password node scripts/extract-curated-source.mjs --manifest FILE --service-url URL --export-dir DIRECTORY'
    );
}

const manifest = JSON.parse(readFileSync(options.manifest, 'utf8'));
const result = await extractCuratedSource({
    manifest,
    sourceServiceUrl: options['service-url'],
    auth,
    exportDirectory: resolve(options['export-dir']),
    binaryConcurrency: options.concurrency ? Number(options.concurrency) : 4,
});
console.log(`Extracted ${result.nodeCount} nodes and ${result.binaryCount} binary occurrences`);