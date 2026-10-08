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
  assert.ok(w.text.startsWith('WORQ\n• Location: 5401 S Wentworth Ave, Chicago, IL 60609 (Lobby)\n• FM: Dave Fleming\n• Priority (Normal, Urgent): Normal\n• WO Description: WORQ MTS request to patch hole in the wall.'), w.text);
  assert.ok(/Cut out the damaged section/.test(w.text) && /\n• NTE: \$500\n• Vendor: MTS$/.test(w.text), w.text);
  assert.ok(w.text.split('• WO Description: ')[1].split('\n')[0].split(/\s+/).length >= 10);
  const r = await handle({ mode: 'worq', description: 'clogged sink in the kitchen', ...base, vendor: 'vendor', vendorName: 'ABC Plumbing', priority: 'urgent' }, '', '');
  assert.ok(/• Priority \(Normal, Urgent\): Urgent/.test(r.text) && /• Vendor: ABC Plumbing$/.test(r.text), r.text);
  const c = await handle({ mode: 'closure', description: 'fix wall', answers: { what: 'Hole in the wall', where: 'Lobby' }, fm: 'Dave Fleming' }, '', '');
  assert.ok(!c.blocked && /hole/i.test(c.text) && /installed new drywall/.test(c.text) && /Work area: lobby/.test(c.text) && c.text.split(/\s+/).length >= 10, c.text);
  // a closing comment is just a description: manager, address, NTE, crew, access and priority are never added
  const noExtras = await handle({ mode: 'closure', description: 'clogged sink in the kitchen', fm: 'Dave Fleming', address: 'BMO Pilsen Branch, 1400 W 18th St, Chicago, IL 60608', nte: '$500', priority: 'urgent', crew: '2', access: 'lift', vendor: 'vendor', vendorName: 'ABC' }, '', '');
  assert.ok(!noExtras.blocked && !/Dave Fleming|Facility Manager|Pilsen|1400 W 18th|\$500|urgent|2 man|lift|ABC|NTE|Vendor/i.test(noExtras.text), noExtras.text);
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
  const u = await handle({ mode: 'worq', description: 'replace vault widget', ...base, answers: {} }, '', '');
  assert.ok(u.blocked && u.required.some((q) => q.id === 'more') && u.required.some((q) => q.id === 'why'));
  // 6) every drop-down choice must produce a specific, described result in BOTH outputs (no generic answers)
  const { CATALOG, compose } = await import('./public/catalog.js');
  const wordsOf = (x) => x.trim().split(/\s+/).length;
  let combos = 0;
  for (const [cat, items] of Object.entries(CATALOG)) {
    for (const [item, probs] of Object.entries(items)) {
      for (const prob of probs) {
        combos += 1;
        const desc = compose(item, prob, 'Lobby');
        const wq = await handle({ mode: 'worq', description: desc, ...base }, '', '');
        assert.ok(!wq.blocked, `WORQ blocked for menu choice: ${cat} > ${item} > ${prob} ("${desc}")`);
        assert.ok(wordsOf(wq.text.split('• WO Description: ')[1].split('\n')[0]) >= 15, `WORQ too short: ${desc}`);
        const cl = await handle({ mode: 'closure', description: desc, fm: 'Dave Fleming' }, '', '');
        assert.ok(!cl.blocked, `closing blocked for menu choice: ${cat} > ${item} > ${prob}`);
        assert.ok(wordsOf(cl.text) >= 20 && !/Diagnosed the issue with/.test(cl.text), `closing too generic: ${desc} -> ${cl.text}`);
      }
    }
  }
  // every location in the menu must be understood by the server, so choosing it never triggers a "where is it?" question
  const { LOCATIONS } = await import('./public/catalog.js');
  for (const loc of LOCATIONS) {
    const r = await handle({ mode: 'worq', description: compose('Sink', 'Clogged', loc), ...base }, '', '');
    assert.ok(!r.blocked, `location "${loc}" from the menu was not recognized: ${JSON.stringify(r.required)}`);
  }
  // BMO branch list (official FDIC data) is present and complete enough to use
  const sitesFile = JSON.parse(require('fs').readFileSync('./public/sites.json', 'utf8'));
  assert.ok(sitesFile.sites.length >= 900, 'branch list looks too small');
  assert.ok(sitesFile.sites.every((x) => x.a && x.c && /^[A-Z]{2}$/.test(x.s) && /^\d{5}$/.test(x.z) && x.y && x.x), 'a branch record is missing an address or coordinates');
  assert.ok(sitesFile.sites.some((x) => /1400 W 18th St/.test(x.a) && x.c === 'Chicago'), 'known Chicago branch missing');
  const sited = await handle({ mode: 'worq', description: 'clogged sink in the lobby', ...base, address: 'BMO Pilsen Branch, 1400 W 18th St, Chicago, IL 60608' }, '', '');
  assert.ok(sited.text.includes('• Location: BMO Pilsen Branch, 1400 W 18th St, Chicago, IL 60608 (Lobby)'), sited.text);
  // 6b) the real case from a technician's phone: a STOP SIGN in a branch parking lot must never come out as a lit business sign
  const photoCase = { mode: 'worq', description: 'repair sign', ...base, address: 'BMO Washington Heights Branch, 1620 W 95th St, Chicago, IL 60643', answers: { where: 'Parking lot' }, notes: 'Safety concern' };
  const vague = await handle(photoCase, '', '');
  assert.ok(vague.blocked && vague.required.some((q) => q.id === 'what' && q.options.some((o) => /stop sign/i.test(o))), 'a vague "repair sign" must ask what is wrong');
  const fixed = await handle({ ...photoCase, answers: { where: 'Parking lot', what: 'Stop sign leaning or knocked down' } }, '', '');
  assert.ok(!fixed.blocked && /stop sign/i.test(fixed.request), fixed.request);
  assert.ok(!/lighting|customers|lift|ladder|2 man|investigate and repair sign\b/i.test(fixed.text), `stop sign text still assumes a lit business sign: ${fixed.text}`);
  assert.ok(/post|sign face|drivers/i.test(fixed.text), fixed.text);
  const bldg = await handle({ ...photoCase, description: 'building sign not lit', answers: { where: 'Exterior' } }, '', '');
  assert.ok(!bldg.blocked && /lighting|customers/i.test(bldg.text), 'a lit building sign should still describe lighting');
  // the stop sign with a rip / sharp edge that can cut someone (the technician's own words must be kept and the hazard flagged)
  const ripWords = 'stop sign has a clear rip in it which can harm somebody cut them';
  const rip = await handle({ mode: 'worq', description: ripWords, ...base, answers: { where: 'Parking lot' } }, '', '');
  assert.ok(!rip.blocked && rip.hazard === true, 'a torn stop sign is a safety hazard');
  assert.ok(/replace torn stop sign/i.test(rip.request) && /sharp edge/i.test(rip.text) && /cut or injure/i.test(rip.text), rip.text);
  assert.ok(rip.text.includes('Reported by the technician: Stop sign has a clear rip in it which can harm somebody cut them.'), 'the technician\'s own words must be kept');
  assert.ok(!/lighting|customers|lift|ladder|2 man/i.test(rip.text), rip.text);
  const ripDone = await handle({ mode: 'closure', description: ripWords, answers: { where: 'Parking lot' } }, '', '');
  assert.ok(/Replaced the torn stop sign/.test(ripDone.text) && /kept people away/.test(ripDone.text) && /Issue noted: Stop sign has a clear rip/.test(ripDone.text), ripDone.text);
  // every closing comment reads in the past tense all the way through (no "...and remove..." left in the present)
  const { SCENARIOS: ALL } = require('./scenarios');
  for (const sc of ALL.filter((x) => x.steps)) assert.ok(!/\b(inspected|cleaned|checked|replaced)[a-z,]* (and|or) (inspect|clean|check|replace|remove|install|adjust|test|confirm|restore|notify)\b (the|a|any|all)\b/.test(sc.steps), `tense slip in ${sc.id}: ${sc.steps}`);
  // items that could mean several different jobs must ask what is wrong, never guess
  for (const d of ['repair sign', 'repair parking lot', 'repair gutter', 'repair water heater', 'repair camera', 'fix door closer', 'repair wall pack']) {
    const r = await handle({ mode: 'worq', description: d, ...base, answers: { where: 'Exterior' } }, '', '');
    assert.ok(r.blocked && r.required.some((q) => q.id === 'what'), `"${d}" should ask what is wrong instead of guessing`);
  }
  assert.ok(/damaged|re-hang|sagging|secure/i.test((await handle({ mode: 'worq', description: 'gutter damaged', ...base, answers: { where: 'Exterior' } }, '', '')).text), 'a damaged gutter must not be written up as a clog');
  // every problem type that matches on the item alone has to be a deliberate choice (a service task or an obvious single job)
  const { SCENARIOS } = require('./scenarios');
  const OK_ON_ITEM_ALONE = new Set(['toilet-seat-x', 'low-pressure', 'sewer', 'frozen-pipe', 'backflow', 'power-loss', 'backup-power', 'fire-alarm', 'extension-cord', 'condensate', 'frozen-coil', 'refrigerant', 'chiller', 'cold-space', 'air-quality', 'paint-job', 'caulk', 'grout', 'graffiti', 'rekey', 'roof-drain', 'striping', 'landscape', 'snow-ice', 'power-wash', 'trash', 'pest', 'odor', 'water-extract', 'extinguisher', 'emergency-equip', 'egress', 'shingles', 'mold', 'excess-heat-x']);
  const unexpected = SCENARIOS.filter((x) => !x.sym && !OK_ON_ITEM_ALONE.has(x.id)).map((x) => x.id);
  assert.deepStrictEqual(unexpected, [], `these match on the item alone and may be guessing the problem: ${unexpected.join(', ')}`);
  // 7) messy phrases the way technicians really type them
  const { matchScenario } = require('./scenarios');
  const cases = {
    'clogged shower drain': 'shower-clog', 'toilet running': 'toilet-run', 'urinal not flushing': 'flush-valve', 'leaking under sink': 'sink-leak',
    'p trap leaking': 'ptrap-leak', 'no hot water': 'hotwater', 'water heater leaking': 'water-heater-leak', 'frozen pipe': 'frozen-pipe', 'sewer backup': 'sewer',
    'sump pump not working': 'sump', 'low water pressure': 'low-pressure', 'exit sign out': 'emergency-light', 'gfci tripped': 'gfci', 'breaker keeps tripping': 'breaker',
    'lost power in vault': 'power-loss', 'ballast humming': 'ballast', 'generator needs service': 'backup-power', 'fire alarm trouble': 'fire-alarm',
    'dirty filters': 'filter-change', 'belt squealing': 'belt', 'condensate line clogged': 'condensate', 'thermostat dead': 'thermostat', 'boiler not heating': 'boiler',
    'duct leaking air': 'duct', 'rtu making noise': 'rtu-noise', 'it room ac not working': 'mini-split', 'paint the lobby wall': 'paint-job', 'peeling paint': 'paint-peel',
    'crack in drywall': 'wall-crack', 'water stained wall': 'wall-water', 'loose baseboard': 'baseboard', 'caulk around sink failed': 'caulk', 'cracked grout': 'grout',
    'stained carpet': 'carpet-clean', 'torn carpet': 'carpet-repair', 'graffiti on wall': 'graffiti', 'sagging ceiling grid': 'ceiling-grid', 'cracked brick': 'masonry',
    'door closer not working': 'door-closer', 'panic bar stuck': 'panic-bar', 'ada door button not working': 'auto-door', 'rekey the back door': 'rekey',
    'overhead door not working': 'overhead-door', 'cracked storefront glass': 'glass', 'card reader not working': 'access-control', 'camera not working': 'camera',
    'roof drain clogged': 'roof-drain', 'flashing damaged': 'flashing', 'light pole leaning': 'light-pole', 'parking stripes faded': 'striping',
    'cracked asphalt': 'asphalt-crack', 'damaged bollard': 'curb-bollard', 'storm drain clogged': 'catch-basin', 'trees overgrown': 'landscape', 'icy walkway': 'snow-ice',
    'mice in the break room': 'pest', 'sprinkler head leaking': 'sprinkler', 'fire extinguisher inspection': 'extinguisher', 'counter top peeling': 'countertop',
    'broken chair': 'furniture-fix', 'standing water in lobby': 'water-extract', 'stop sign leaning': 'traffic-sign', 'faded handicap parking sign': 'traffic-sign', 'building sign not lit': 'sign', 'gutter hanging loose': 'gutter-damage', 'water heater leaking': 'water-heater-leak',
  };
  for (const [phrase, id] of Object.entries(cases)) {
    const m = matchScenario(phrase);
    assert.ok(m && m.scenario.id === id, `"${phrase}" should be ${id}, got ${m ? m.scenario.id : 'nothing'}`);
  }
  console.log(`ok (${combos} menu choices x 2 outputs, ${Object.keys(cases).length} typed phrases)`);
})().catch((e) => { console.error(e); process.exit(1); });
