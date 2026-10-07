'use strict';
const assert = require('assert');
const { fallback, enforce, countWords, buildPrompt } = require('./lib');

assert.strictEqual(fallback('worq', 'repair compressor', 'mts'), 'WORQ MTS request to repair compressor');
assert.strictEqual(fallback('worq', 'repair loose shingles', 'vendor'), 'WORQ third party vendor needed to repair loose shingles');
assert.ok(countWords(fallback('closure', 'replaced capacitor', 'mts')) >= 10);
assert.ok(countWords(enforce('closure', 'Fixed leak.', '', 'mts')) >= 10);
assert.ok(/^WORQ MTS request to/.test(enforce('worq', 'Please fix it', 'repair door', 'mts')));
assert.ok(buildPrompt('worq', 'x', 'vendor').includes('WORQ third party vendor needed to'));
console.log('ok');
