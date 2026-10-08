'use strict';
// Quick follow-up questions the app asks when an answer would make the request or comment more accurate.
// Choice answers map to sentences: `worq` goes into the WORQ request, `done` into the closing comment,
// `steps` replaces the default "what was done" sentence, `incomplete` means the work is not fully finished.

const SKIP = '__skip';
const o = (label, extra = {}) => ({ label, ...extra });

const WHERE = ['Kitchen', 'Break room', 'Restroom', 'Lobby', 'Teller line', 'Vault', 'Office', 'Hallway', 'IT Room', 'Storage room', 'Mechanical room', 'Roof', 'Exterior', 'Parking lot'];
// Common problems by item, offered when a request is too vague (e.g. just "fix wall").
const NOUN_SYMPTOMS = [
  [/wall|drywall|sheetrock/i, ['Hole in the wall', 'Crack in the wall', 'Water damage or stain on the wall', 'Scuffed or marked wall', 'Peeling paint on the wall', 'Damaged corner or baseboard']],
  [/ceiling/i, ['Water-stained ceiling tile', 'Missing ceiling tile', 'Damaged ceiling tile', 'Peeling paint on the ceiling']],
  [/door/i, ["Door sticking or won't latch", 'Door damaged or broken', 'Door lock or handle broken', 'Door closer not working']],
  [/lock|key/i, ['Lock broken', 'Lock jammed', 'Key not working']],
  [/window|glass/i, ['Broken window', 'Cracked glass', 'Window will not open or close', 'Window leaking']],
  [/light|lamp|fixture/i, ['Light not working', 'Light flickering', 'Light burned out']],
  [/floor|tile|carpet/i, ['Cracked floor tile', 'Loose floor tile', 'Stained carpet', 'Damaged flooring']],
  [/sink|drain/i, ['Sink clogged', 'Sink leaking', 'Drain slow']],
  [/toilet|urinal/i, ['Toilet clogged', 'Toilet running', 'Toilet leaking']],
  [/roof|shingle/i, ['Roof leaking', 'Loose shingles', 'Missing shingles']],
  [/heat|hvac|\bac\b|air/i, ['Not heating', 'Not cooling', 'Excessive heat in the space']],
  [/paint/i, ['Peeling paint', 'Scuffed paint', 'Stained paint']],
];
const GENERIC_SYMPTOMS = ['Broken or damaged', 'Not working', 'Leaking', 'Loose', 'Clogged'];
const symptomsFor = (text) => (NOUN_SYMPTOMS.find(([re]) => re.test(text || '')) || [null, GENERIC_SYMPTOMS])[1];

const WHY_OPTIONS = ['Safety hazard', 'Equipment is down or not working', 'Customer or employee impact', 'Risk of water damage', 'Appearance / unprofessional', 'Preventive or compliance'];

const WHERE_Q = {
  id: 'where', mode: 'both', required: true, q: 'Where in the building is it? Pick one or type it.', type: 'both',
  fmt: (v) => ({ done: `Work area: ${v.replace(/[.\s]+$/, '')}.` }),
  options: WHERE.map((w) => o(w, { done: `Work area: ${/^[A-Z]{2}/.test(w) ? w : w.toLowerCase()}.` })),
};
const whatQ = (text) => ({
  id: 'what', mode: 'both', required: true, q: "That's too general. What exactly is wrong? Pick one or describe it.", type: 'both',
  options: symptomsFor(text).map((l) => o(l)),
  fmt: () => ({}),
});
const HOW_Q = {
  id: 'how', mode: 'closure', required: true, q: 'What did you do to fix it? Describe the work.', type: 'text',
  fmt: (v) => ({ done: `Work performed: ${v.replace(/[.\s]+$/, '')}.` }),
};
const WHY_Q = {
  id: 'why', mode: 'both', required: true, q: 'Why does this need to be done?', type: 'both',
  options: WHY_OPTIONS.map((l) => o(l, { worq: `Reason: ${l.toLowerCase()}.`, done: `Reason for the work: ${l.toLowerCase()}.` })),
  fmt: (v) => ({ worq: `Reason: ${v.replace(/[.\s]+$/, '')}.`, done: `Reason for the work: ${v.replace(/[.\s]+$/, '')}.` }),
};
const MORE_Q = {
  id: 'more', mode: 'both', required: true, q: 'Add a little more description (what, where and how). It needs at least 10 words in total.', type: 'text',
  fmt: (v) => ({ worq: `Details: ${v.replace(/[.\s]+$/, '')}.`, done: `Additional detail: ${v.replace(/[.\s]+$/, '')}.` }),
};
const PARTS_Q = {
  id: 'parts', mode: 'closure', q: 'Any parts or materials used? (optional)', type: 'text',
  fmt: (v) => ({ done: `Materials used: ${v.replace(/[.\s]+$/, '')}.` }),
};
const FOLLOW_Q = {
  id: 'followup', mode: 'closure', q: 'Is any follow-up needed?', type: 'choice',
  options: [o('No follow-up needed'), o('Follow-up needed', { done: 'Follow-up work is recommended to fully resolve the issue.', incomplete: true }), o('Parts on order', { done: 'Additional parts are on order to complete the work.', incomplete: true })],
};

const count = (q) => ({ id: 'count', mode: 'worq', q, type: 'choice', options: [o('1'), o('2-3', { worq: 'Approximately 2-3 are affected.' }), o('4 or more', { worq: 'Four or more are affected.' })] });
const size = (q, opts) => ({ id: 'size', mode: 'worq', q, type: 'choice', options: opts.map(([l, w]) => o(l, w ? { worq: w } : {})) });
const secure = (what) => ({ id: 'secure', mode: 'worq', q: `Can the ${what} still be secured?`, type: 'choice',
  options: [o('Yes'), o('No, it cannot be secured', { worq: `The ${what} cannot currently be secured, so this needs prompt attention.` })] });

const BY_SCENARIO = {
  'sink-clog': [
    { id: 'fixtures', mode: 'worq', q: 'How many sinks or drains are backed up?', type: 'choice', options: [o('Just one'), o('More than one', { worq: 'More than one fixture is backed up.' })] },
    { id: 'method', mode: 'closure', q: 'How was the blockage cleared?', type: 'choice', options: [
      o('Drain snake'),
      o('Plunger', { steps: 'Cleared the blockage with a plunger, flushed the line with hot water, and verified proper drainage with no leaks at the trap or connections.' }),
      o('Drain machine / hydro jet', { steps: 'Cleared the blockage with a drain machine, flushed the line, and verified proper drainage with no leaks at the trap or connections.' }),
      o('Could not clear it', { steps: 'Attempted to clear the blockage but was unable to fully restore drainage.', done: 'A plumber is recommended for further work.', incomplete: true }),
    ] },
  ],
  'toilet-clog': [
    { id: 'fixtures', mode: 'worq', q: 'How many toilets or urinals are affected?', type: 'choice', options: [o('Just one'), o('More than one', { worq: 'More than one fixture is affected.' })] },
    { id: 'method', mode: 'closure', q: 'How was it cleared?', type: 'choice', options: [
      o('Plunger and closet auger'),
      o('Plunger only', { steps: 'Cleared the blockage with a plunger, flushed repeatedly to confirm full flow, and checked the base and supply line for leaks.' }),
      o('Could not clear it', { steps: 'Attempted to clear the blockage but was unable to fully restore flow.', done: 'A plumber is recommended for further work.', incomplete: true }),
    ] },
  ],
  'toilet-run': [{ id: 'part', mode: 'closure', q: 'What was repaired?', type: 'choice', options: [
    o('Flapper and fill valve'),
    o('Flapper only', { steps: 'Inspected the tank and replaced the worn flapper, then confirmed the toilet flushes fully and shuts off properly.' }),
    o('Fill valve only', { steps: 'Inspected the tank and replaced the worn fill valve, then confirmed the toilet fills, flushes fully and shuts off properly.' }),
    o('Adjustment only', { steps: 'Inspected the tank and adjusted the float and chain, then confirmed the toilet flushes fully and shuts off properly.' }),
  ] }],
  'faucet-leak': [{ id: 'part', mode: 'closure', q: 'What fixed the leak?', type: 'choice', options: [
    o('Washer or cartridge'),
    o('Tightened connections', { steps: 'Shut off the water supply, tightened the loose connections, and ran the water to confirm the leak is stopped.' }),
    o('Replaced the faucet', { steps: 'Shut off the water supply, removed the leaking faucet, installed a new one, and ran the water to confirm there are no leaks.' }),
  ] }],
  'pipe-leak': [{ id: 'shutoff', mode: 'worq', q: 'Is the water shut off to the leak?', type: 'choice', options: [o('Yes, shut off', { worq: 'Water has been shut off at the leak.' }), o('No, still leaking', { worq: 'Water is still leaking and needs prompt attention.' })] }],
  'roof-leak': [{ id: 'active', mode: 'worq', q: 'Is water actively coming in?', type: 'choice', options: [o('Yes, actively leaking', { worq: 'Water is actively leaking in.' }), o('No, stain or past leak only', { worq: 'No active leak at this time, staining only.' })] }],
  'tile-water': [{ id: 'active', mode: 'worq', q: 'Is the leak above the tile still active?', type: 'choice', options: [o('Yes, still active', { worq: 'The source of the water is still active.' }), o('No, it is dry now', { worq: 'The area is dry now.' })] }],
  shingles: [size('About how large is the damaged area?', [['A few shingles'], ['A large section', 'A large section is affected.']])],
  light: [count('How many fixtures are affected?'), { id: 'part', mode: 'closure', q: 'What was replaced?', type: 'choice', options: [
    o('Lamp or bulb', { steps: 'Replaced the failed lamp and confirmed the fixture operates properly.' }),
    o('Driver or ballast', { steps: 'Replaced the failed driver or ballast, checked the wiring connections, and confirmed the fixture operates properly.' }),
    o('Entire fixture', { steps: 'Removed the failed fixture, installed a new one, checked the wiring connections, and confirmed it operates properly.' }),
  ] }],
  wallpack: [count('How many fixtures are not working?'), { id: 'part', mode: 'closure', q: 'What was replaced?', type: 'choice', options: [
    o('Lamps'), o('Photocell', { steps: 'Replaced the failed photocell and confirmed the lights come on at dusk and operate properly.' }),
    o('Driver or ballast', { steps: 'Replaced the failed driver or ballast, checked the wiring connections, and confirmed the lights operate properly.' }),
    o('Entire fixture', { steps: 'Replaced the failed fixture, checked the wiring connections, and confirmed it operates properly.' }),
  ] }],
  outlet: [
    { id: 'hazard', mode: 'worq', q: 'Any sparking, burning smell or hot cover plate?', type: 'choice', options: [o('No'), o('Yes, safety concern', { worq: 'Sparking or a burning smell was reported, so this is a safety concern.' })] },
    { id: 'part', mode: 'closure', q: 'What was done?', type: 'choice', options: [
      o('Replaced the outlet'),
      o('Reset the breaker or GFCI', { steps: 'Tested the circuit, reset the tripped breaker or GFCI, and confirmed power is restored and operating safely.' }),
      o('Replaced the switch', { steps: 'Shut off power, replaced the faulty switch, restored power and confirmed correct operation.' }),
    ] },
  ],
  lock: [secure('lock'), { id: 'part', mode: 'closure', q: 'What was done?', type: 'choice', options: [
    o('Cleaned and lubricated'),
    o('Replaced the cylinder', { steps: 'Removed the faulty lock cylinder, installed a new one, and tested with the key several times for smooth operation.' }),
    o('Rekeyed', { steps: 'Rekeyed the lock, tested the new key several times, and confirmed smooth operation.' }),
  ] }],
  door: [secure('door')],
  heat: [{ id: 'state', mode: 'worq', q: 'Is it completely off or just not keeping up?', type: 'choice', options: [o('Completely off', { worq: 'The unit is completely down.' }), o('Running but not keeping up', { worq: 'The unit is running but not keeping up.' })] },
    { id: 'cause', mode: 'closure', q: 'What was the cause?', type: 'choice', options: [o('Thermostat', { done: 'The cause was a faulty thermostat.' }), o('Failed motor or capacitor', { done: 'The cause was a failed motor or capacitor.' }), o('Dirty filter', { done: 'The cause was a dirty filter restricting airflow.' }), o('Tripped breaker', { done: 'The cause was a tripped breaker.' })] }],
  cooling: [{ id: 'state', mode: 'worq', q: 'Is it completely off or just not keeping up?', type: 'choice', options: [o('Completely off', { worq: 'The unit is completely down.' }), o('Running but not keeping up', { worq: 'The unit is running but not keeping up.' })] },
    { id: 'cause', mode: 'closure', q: 'What was the cause?', type: 'choice', options: [o('Thermostat', { done: 'The cause was a faulty thermostat.' }), o('Failed motor or capacitor', { done: 'The cause was a failed motor or capacitor.' }), o('Dirty filter', { done: 'The cause was a dirty filter restricting airflow.' }), o('Low refrigerant', { done: 'The cause was low refrigerant.' })] }],
  'excess-heat': [
    { id: 'temp', mode: 'worq', q: 'Approximate room temperature in °F, if known?', type: 'text', fmt: (v) => ({ worq: `The room is reading about ${v.replace(/[^\d.]/g, '')}°F.` }) },
    { id: 'critical', mode: 'worq', q: 'Is critical equipment in the room?', type: 'choice', options: [o('Yes', { worq: 'Critical equipment is in the space.' }), o('No')] },
    { id: 'fix', mode: 'closure', q: 'What corrected it?', type: 'text', fmt: (v) => ({ done: `The issue was corrected by ${v.replace(/^by\s+/i, '').replace(/[.\s]+$/, '')}.` }) },
  ],
  hole: [size('About how big is it?', [['Smaller than a fist'], ['Larger than a fist', 'The damaged area is larger than a fist.'], ['Over a foot', 'The damaged area is over a foot across.']])],
  pothole: [size('About how big is it?', [['Small'], ['Medium', 'The damaged area is medium sized.'], ['Large', 'The damaged area is large and a hazard to vehicles.']])],
  'paint-peel': [size('About how large is the area?', [['Small spot'], ['One wall', 'The affected area is roughly one wall.'], ['Multiple walls', 'Multiple walls are affected.']])],
  floor: [{ id: 'hazard', mode: 'worq', q: 'Is it a trip hazard?', type: 'choice', options: [o('No'), o('Yes', { worq: 'It is a trip hazard.' })] }],
  window: [{ id: 'hazard', mode: 'worq', q: 'Is the glass broken through?', type: 'choice', options: [o('No'), o('Yes, broken through', { worq: 'The glass is broken through, which is a safety hazard.' })] }],
};

function list(mode, ctx) {
  const q = [];
  if (!ctx.scenario && !ctx.preventive) {
    if (!ctx.verbSpecific && !ctx.whatAnswered) q.push(whatQ(ctx.text));   // e.g. just "fix wall": ask what is actually wrong
    else {
      if (mode === 'closure' && !ctx.verbSpecific && ctx.userWords < 10) q.push(HOW_Q);
      if (mode === 'worq' && ctx.userWords < 10) q.push(MORE_Q);
      q.push(WHY_Q);
    }
  }
  const needArea = !ctx.hasLocation && !(mode === 'closure' && ctx.hasAddress);
  if (needArea) q.push(WHERE_Q);
  q.push(...(BY_SCENARIO[ctx.sid] || []));
  if (mode === 'closure') q.push(PARTS_Q, FOLLOW_Q);
  return q.filter((x) => x.mode === 'both' || x.mode === mode);
}

// Questions that have not been answered yet. `required` ones must be answered before any text is produced.
function pending(mode, ctx, answers = {}) {
  const open = list(mode, ctx).filter((q) => !(q.id in answers));
  const pub = (q) => ({ id: q.id, q: q.q, type: q.type, required: !!q.required, options: (q.options || []).map((x) => x.label) });
  return { required: open.filter((q) => q.required).slice(0, 3).map(pub), optional: open.filter((q) => !q.required).slice(0, 3).map(pub) };
}

// Turn the answers into sentences for the WORQ / closing comment.
function apply(mode, ctx, answers = {}) {
  const out = { worq: [], done: [], steps: '', incomplete: false };
  for (const q of list(mode, ctx)) {
    const v = answers[q.id];
    if (v == null || v === '' || v === SKIP) continue;
    if (q.type === 'text' || ((q.type === 'both') && !(q.options || []).some((x) => x.label === v))) {
      const r = q.fmt(String(v));
      if (r.worq) out.worq.push(r.worq);
      if (r.done) out.done.push(r.done);
    } else {
      const opt = (q.options || []).find((x) => x.label === v);
      if (!opt) continue;
      if (opt.worq) out.worq.push(opt.worq);
      if (opt.done) out.done.push(opt.done);
      if (opt.steps) out.steps = opt.steps;
      if (opt.incomplete) out.incomplete = true;
    }
  }
  return out;
}

module.exports = { pending, apply, SKIP, symptomsFor };
