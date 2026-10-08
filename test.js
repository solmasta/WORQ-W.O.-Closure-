'use strict';
const assert = require('assert');
const { parseWorkOrder, templateClosure, fallback, enforce, countWords, buildPrompt } = require('./lib');

assert.strictEqual(fallback('worq', 'repair compressor', 'mts'), 'WORQ MTS request to investigate and repair compressor');
assert.strictEqual(fallback('worq', 'repair loose shingles', 'vendor'), 'WORQ third party vendor needed to repair loose shingles. This is a 2 man job. Roof access required.');
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
assert.strictEqual(templateClosure('', ocr), 'Completed quarterly preventive maintenance on the ceiling heater. Contacted Facility Manager and gained access as required. Inspected unit, cleaned housing and element, checked thermostat, fan operation and electrical connections. Equipment was inspected and confirmed operating within acceptable standards. Photos attached. All work order tasks completed.');
assert.ok(countWords(templateClosure('replaced capacitor', '')) >= 10);
assert.strictEqual(fallback('worq', '', 'mts', ocr), 'WORQ MTS request to investigate and repair ceiling heater');
const roof = templateClosure('', 'Work Description Repair loose shingles on roof Assigned to');
assert.ok(/shingles/i.test(roof) && /sealed/.test(roof));
assert.ok(/compressor/i.test(templateClosure('repair compressor', '')));
assert.ok(countWords(templateClosure('', '')) >= 10);
const { matchScenario } = require('./scenarios');
const sub = (x) => { const m = matchScenario(x); return m && `${m.scenario.imp} ${m.subject}`; };
assert.strictEqual(sub('sink clogged kitchen'), 'clear clogged kitchen sink');
assert.strictEqual(sub('unclog sink in break room'), 'clear clogged sink in the break room');
assert.strictEqual(sub('no heat in teller area'), 'repair heating system in the teller area');
assert.strictEqual(sub('loose shingles'), 'repair loose shingles');
assert.strictEqual(sub('light out in lobby'), 'replace burned-out light in the lobby');
assert.strictEqual(fallback('worq', 'sink clogged kitchen', 'mts'), 'WORQ MTS request to clear clogged kitchen sink');
assert.ok(/drain snake/.test(fallback('closure', 'sink clogged kitchen', 'mts')));
assert.notStrictEqual(fallback('closure', 'sink clogged kitchen', 'mts', '', 0), fallback('closure', 'sink clogged kitchen', 'mts', '', 1));
assert.ok(!/source of the leak/i.test(fallback('closure', 'sink clogged kitchen', 'mts')));
assert.strictEqual(fallback('worq', 'excessive heat in the IT Room', 'mts'), 'WORQ MTS request to investigate and repair issues with excessive heat in the IT Room');
assert.ok(fallback('worq', 'exterior wall pack lights not working', 'mts').startsWith('WORQ MTS request to investigate and repair exterior wall pack lights that are not working. This is a 2 man job.'));
assert.ok(/This is a 3 man job\. Needs a lift\.$/.test(fallback('worq', 'sink clogged kitchen', 'mts', '', 0, { crew: '3', notes: 'needs a lift' })));
assert.ok(/replaced 3 lamps/i.test(fallback('closure', 'light out in lobby', 'mts', '', 0, { notes: 'replaced 3 lamps' })));
assert.ok(/2 man crew/.test(fallback('closure', 'light out in lobby', 'mts', '', 0, { crew: '2' })));
console.log('ok');
