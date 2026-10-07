'use strict';
const assert = require('assert');
const { parseWorkOrder, templateClosure, fallback, enforce, countWords, buildPrompt } = require('./lib');

assert.strictEqual(fallback('worq', 'repair compressor', 'mts'), 'WORQ MTS request to repair compressor');
assert.strictEqual(fallback('worq', 'repair loose shingles', 'vendor'), 'WORQ third party vendor needed to repair loose shingles');
assert.ok(countWords(fallback('closure', 'replaced capacitor', 'mts')) >= 10);
assert.ok(countWords(enforce('closure', 'Fixed leak.', '', 'mts')) >= 10);
assert.ok(/^WORQ MTS request to/.test(enforce('worq', 'Please fix it', 'repair door', 'mts')));
assert.ok(buildPrompt('worq', 'x', 'vendor').includes('WORQ third party vendor needed to'));
assert.ok(buildPrompt('closure', 'x', 'mts').includes('Completed quarterly preventive maintenance'));
const ocr = `BM08340216 Contact CREWOs PO #
Details Work Description
H0039-Ceiling Heater:Preventive:Equipment; Quarterly HVAC PM - Contact the Facility Manager to schedule access to the location; await confirmation from the Facility Manager prior to arriving onsite.
Assigned to Dorsett Secondary Assignees`;
const w = parseWorkOrder(ocr);
assert.strictEqual(w.equipment, 'ceiling heater');
assert.strictEqual(w.frequency, 'quarterly');
assert.ok(w.preventive && w.contactFM);
assert.strictEqual(w.woNumber, 'BM08340216');
assert.strictEqual(templateClosure('', ocr), 'Completed quarterly preventive maintenance on the ceiling heater. Contacted Facility Manager and gained access as required. Equipment was inspected and confirmed operating within acceptable standards. Photos attached. All work order tasks completed.');
assert.ok(countWords(templateClosure('replaced capacitor', '')) >= 10);
assert.strictEqual(fallback('worq', '', 'mts', ocr), 'WORQ MTS request to repair ceiling heater');
console.log('ok');
