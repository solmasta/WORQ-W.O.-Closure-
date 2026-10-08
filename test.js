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
assert.strictEqual(fallback('worq', 'sink clogged kitchen', 'mts', '', 0, { fm: 'Dave Fleming' }), 'WORQ MTS request to clear clogged kitchen sink. Facility Manager: Dave Fleming.');
assert.ok(fallback('worq', 'sink clogged kitchen', 'mts', '', 0, { fm: 'Dave Fleming', access: 'fm' }).endsWith('Contact Facility Manager Dave Fleming to schedule access.'));
assert.ok(fallback('closure', 'sink clogged kitchen', 'mts', '', 0, { fm: 'Brianna Brungardt' }).includes('Contacted Facility Manager Brianna Brungardt and gained access as required.'));
assert.ok(!/Contacted Facility Manager and/.test(fallback('closure', 'sink clogged kitchen', 'mts', '', 0, { fm: 'Alan Macejak', access: 'fm' })));
assert.ok(!/Facility Manager/.test(fallback('closure', 'sink clogged kitchen', 'mts')));
const { questionsFor, handle, composeWorq } = require('./lib');
const all = (r) => [...r.required, ...r.optional].map((q) => q.id);
assert.ok(all(questionsFor('worq', { description: 'clogged sink' })).includes('where'));
assert.ok(!all(questionsFor('worq', { description: 'clogged sink in the kitchen' })).includes('where'));
assert.ok(all(questionsFor('closure', { description: 'clogged sink in the kitchen' })).includes('method'));
assert.ok(!all(questionsFor('closure', { description: 'clogged sink in the kitchen', answers: { method: '__skip' } })).includes('method'));
assert.ok(/plunger/i.test(fallback('closure', 'clogged sink in the kitchen', 'mts', '', 0, { answers: { method: 'Plunger' } })));
assert.ok(!/All work order tasks completed/.test(fallback('closure', 'clogged sink in the kitchen', 'mts', '', 0, { answers: { followup: 'Parts on order' } })));
assert.ok(fallback('worq', 'light out in lobby', 'mts', '', 0, { answers: { count: '2-3' } }).includes('Approximately 2-3 are affected.'));

(async () => {
  const base = { vendor: 'mts', fm: 'Dave Fleming', address: '5401 S Wentworth Ave, Chicago, IL 60609', nte: '$500' };
  // 1) generic requests are blocked and the tech is asked what is actually wrong
  for (const mode of ['worq', 'closure']) {
    for (const d of ['fix wall', 'repair door', 'fix light', 'fix desk']) {
      const r = await handle({ mode, description: d, ...base }, '', '');
      assert.ok(r.blocked && r.required.some((q) => q.id === 'what'), `${mode}: "${d}" should be blocked`);
      assert.strictEqual(r.text, '');
    }
  }
  // 2) answering "what" produces a specific, described request (10+ words in the description)
  const w = await handle({ mode: 'worq', description: 'fix wall', answers: { what: 'Hole in the wall', where: 'Lobby' }, ...base }, '', '');
  assert.ok(!w.blocked && /patch hole in the wall/.test(w.request), w.request);
  // the exact layout the technicians must send
  assert.ok(w.text.startsWith('WORQ\n• Location: 5401 S Wentworth Ave, Chicago, IL 60609 (Lobby)\n• FM: Dave Fleming\n• Priority (Rush, Normal): Normal\n• WO Description: WORQ MTS request to patch hole in the wall.'), w.text);
  assert.ok(/Cut out the damaged section/.test(w.text) && /\n• NTE: \$500\n• Vendor: MTS$/.test(w.text), w.text);
  assert.ok(w.text.split('• WO Description: ')[1].split('\n')[0].split(/\s+/).length >= 10);
  const r = await handle({ mode: 'worq', description: 'clogged sink in the kitchen', ...base, vendor: 'vendor', vendorName: 'ABC Plumbing', priority: 'rush' }, '', '');
  assert.ok(/• Priority \(Rush, Normal\): Rush/.test(r.text) && /• Vendor: ABC Plumbing$/.test(r.text), r.text);
  const c = await handle({ mode: 'closure', description: 'fix wall', answers: { what: 'Hole in the wall', where: 'Lobby' }, fm: 'Dave Fleming' }, '', '');
  assert.ok(!c.blocked && /hole/i.test(c.text) && /installed new drywall/.test(c.text) && /Work area: lobby/.test(c.text) && /Dave Fleming/.test(c.text) && c.text.split(/\s+/).length >= 10, c.text);
  // 3) WORQ requires facility manager, address and NTE
  const m = await handle({ mode: 'worq', description: 'clogged sink in the kitchen', vendor: 'mts' }, '', '');
  assert.deepStrictEqual(m.missing, ['fm', 'address', 'nte']);
  // 4) their real examples
  const e1 = composeWorq({ ...base, description: 'exterior wall pack lights not working' });
  assert.ok(e1.request.startsWith('WORQ MTS request to investigate and repair exterior wall pack lights that are not working. This is a 2 man job.'));
  const e2 = composeWorq({ ...base, description: 'excessive heat in the IT Room' });
  assert.ok(e2.request.startsWith('WORQ MTS request to investigate and repair issues with excessive heat in the IT Room.'));
  assert.ok(e1.body.split('\n').slice(0, 1)[0] === 'WORQ' && e1.body.split('\n').length === 7);
  // 5) an unrecognized item needs why + more detail before anything is produced
  const u = await handle({ mode: 'worq', description: 'replace vault gasket', ...base, answers: {} }, '', '');
  assert.ok(u.blocked && u.required.some((q) => q.id === 'more') && u.required.some((q) => q.id === 'why'));
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
