import assert from 'node:assert/strict';
import test from 'node:test';
import { isDeferredRelocationError } from '../lib/curated-import-errors.mjs';

test('accepts duplicate-id errors only for explicitly deferred content', () => {
    const error = 'Could not import node: Node deferred-id already exists - NodeIdExistsException';

    assert.equal(isDeferredRelocationError(error, ['deferred-id']), true);
    assert.equal(isDeferredRelocationError(error, ['different-id']), false);
    assert.equal(isDeferredRelocationError('Could not import node: invalid data', ['deferred-id']), false);
});