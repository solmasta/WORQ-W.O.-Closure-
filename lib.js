'use strict';
const { matchScenario, hasLocation, locationWord } = require('./scenarios');
const Q = require('./questions');

const MIN_WORDS = 10;

const countWords = (s) => (s.trim().match(/\S+/g) || []).length;

const EXAMPLE = 'Completed quarterly preventive maintenance on the ceiling heater. Contacted Facility Manager and gained access as required. Equipment was inspected and confirmed operating within acceptable standards. Photos attached to the inspection. All work order tasks completed.';

const SYSTEM = `You write short maintenance work order text for a facilities team.
Use any attached screenshots and the user's short description. You may assume the standard, logical repair steps for the request (e.g. a heater PM means inspected, cleaned and tested the unit; loose shingles means re-secured and sealed them), but never invent specifics such as part numbers, measurements, readings, costs or names.
If a screenshot shows a work order (e.g. its Work Description, equipment, or required steps such as "contact the Facility Manager to schedule access"), reflect those tasks in the comment, and infer the logical work that fits the request.
If no description is given and a photo is attached, the photo is a close-up of the problem: identify the most likely problem or repair from the picture and base the text on it.
Output ONLY the requested text, with no quotes, labels or commentary.`;

const ocrBlock = (t) => (t && t.trim() ? `\nText read from the work order screenshot (may contain OCR errors):\n${t.trim().slice(0, 3000)}` : '');

function buildPrompt(mode, description, vendor, ocrText = '', variant = 0, opts = {}) {
  const crewLine = Number(opts.crew) ? `\nCrew size: ${Number(opts.crew)} man job.` : '';
  const accessLine = opts.access && ACCESS_TEXT[opts.access] ? `\nAccess/equipment: ${ACCESS_TEXT[opts.access].worq}` : '';
  const prioLine = PRIORITY_TEXT[opts.priority] ? `\nPriority: ${PRIORITY_TEXT[opts.priority]}` : '';
  const fmLineP = opts.fm ? `\nFacility Manager: ${opts.fm} (mention them by name${opts.access === 'fm' ? '; access must be scheduled through them' : ''}).` : '';
  const facts = opts.answers ? Q.apply(mode, contextFor(description, ocrText, opts.answers, opts.address), opts.answers) : null;
  const factLines = facts && (facts.worq.length + facts.done.length) ? `\nConfirmed facts from the technician (include them): ${[...facts.worq, ...facts.done].join(' ')}${facts.steps ? ' Work performed: ' + facts.steps : ''}${facts.incomplete ? ' The work is NOT fully complete, so do not say all tasks were completed.' : ''}` : '';
  const addrLine = opts.address ? `\nSite address: ${opts.address}` : '';
  const notesLine = opts.notes && opts.notes.trim() ? `\nExtra details from the technician (include them): ${opts.notes.trim()}` : '';
  if (mode === 'worq') {
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    return `Write ONE line that will be the start of an email requesting a work order.
It must begin exactly with "WORQ ${who} " followed by what to investigate and repair, naming the equipment, the symptom and the location. Use 1-3 short sentences. Add the crew size and any access or equipment need (lift, ladder, roof access) when it logically applies.
Match the style of these real examples:
"WORQ MTS request to investigate and repair exterior wall pack lights that are not working. This is a 2 man job."
"WORQ MTS request to investigate and repair issues with excessive heat in the IT Room"
"WORQ third party vendor needed to repair loose shingles"
Issue details: ${description || '(see screenshot)'}${crewLine}${accessLine}${fmLineP}${prioLine}${addrLine}${factLines}${notesLine}${ocrBlock(ocrText)}`;
  }
  return `Write a work order closure comment describing the repair that was completed so the work order can be closed.
Rules: past tense, plain professional language, ${MIN_WORDS} words or more. Use 4-6 detailed sentences: what was investigated and found, the work performed, testing and the result. Include realistic, specific technician detail for this kind of problem (e.g. a clogged sink: used a drain snake, flushed the line, checked the trap for leaks; a running toilet: replaced the flapper and fill valve): what work was completed, any access/contact steps required, what was inspected or repaired, the result, and that all tasks are complete.
${variant ? `This is regeneration #${variant}: use noticeably different wording and sentence structure than a standard version.\n` : ''}Match the style of this example (a quarterly preventive maintenance on a ceiling heater):
"${EXAMPLE}"
Repair details: ${description || '(see screenshot)'}${crewLine}${accessLine}${fmLineP}${prioLine}${addrLine}${factLines}${notesLine}${ocrBlock(ocrText)}`;
}

// Pull the useful bits out of OCR text from a work order screenshot.
function parseWorkOrder(text = '') {
  const t = text.replace(/\r/g, '');
  const m = /Work\s*Description\s*([\s\S]*?)(?:Assigned\s*to|Secondary|Priority|Status|$)/i.exec(t);
  const desc = (m ? m[1] : '').replace(/\s+/g, ' ').trim();
  const equip = /\b[A-Z]\d{3,5}\s*[-–]\s*([A-Za-z][A-Za-z /&]+?)\s*:/.exec(desc);
  const freq = /\b(weekly|monthly|quarterly|semi-?annual|annual|yearly)\b/i.exec(desc);
  return {
    desc,
    equipment: equip ? equip[1].trim().toLowerCase() : '',
    frequency: freq ? freq[1].toLowerCase() : '',
    preventive: /preventive|\bPM\b/i.test(desc),
    contactFM: /facility manager/i.test(desc),
    woNumber: (/\b[A-Z]{2}\d{8}\b/.exec(t) || [''])[0],
  };
}

// Standard, logical work for common requests, so the user doesn't have to spell it out.
// pm: steps for preventive maintenance; fix: steps for a repair request.
const KNOWLEDGE = [
  { re: /ceiling heater|unit heater|\bheater\b|\bheat\b/i, label: 'heater',
    pm: 'Inspected unit, cleaned housing and element, checked thermostat, fan operation and electrical connections.',
    fix: 'Diagnosed heater fault, repaired the failed component and checked thermostat and electrical connections.' },
  { re: /hvac|rtu|rooftop|air handler|furnace|\bac\b|a\/c|air condition|split system|condenser/i, label: 'HVAC unit',
    pm: 'Inspected unit, checked and replaced air filters as needed, cleaned coils, checked belts, drain and electrical connections.',
    fix: 'Diagnosed HVAC fault, repaired the failed component and checked refrigerant, airflow and electrical connections.' },
  { re: /compressor/i, label: 'compressor',
    pm: 'Inspected compressor, checked oil level, belts, electrical connections and pressure readings.',
    fix: 'Diagnosed compressor issue, repaired the faulty component and checked pressures and electrical connections.' },
  { re: /shingle|roof/i, label: 'roof',
    pm: 'Inspected roof surface, flashing and drains and cleared debris.',
    fix: 'Re-secured loose shingles, sealed affected area and inspected surrounding roof for further damage.' },
  { re: /leak|plumb|faucet|toilet|sink|drain|pipe|water/i, label: 'plumbing',
    pm: 'Inspected fixtures, piping and drains and checked for leaks.',
    fix: 'Located the source of the leak, repaired it and checked surrounding area for further leaks.' },
  { re: /light|lamp|bulb|ballast|fixture|led|exit sign/i, label: 'lighting',
    pm: 'Inspected fixtures and emergency lighting, tested operation and replaced failed lamps.',
    fix: 'Replaced the faulty lamp or driver and confirmed the fixture is working.' },
  { re: /(desk|drawer|cabinet|locker|file|cash|safe).*(lock|key)|(lock|key).*(desk|drawer|cabinet|locker|file|cash|safe)/i, label: 'lock',
    pm: 'Inspected lock and keys and confirmed proper operation.',
    fix: 'Checked the internal lock mechanism, made the needed adjustments, tested the key operation and confirmed it locks and unlocks properly.' },
  { re: /door|lock|latch|hinge|closer|hardware/i, label: 'door',
    pm: 'Inspected door, hinges, closer and hardware, adjusted and lubricated as needed.',
    fix: 'Adjusted and repaired the door hardware, lubricated moving parts and confirmed the door closes and latches properly.' },
  { re: /ceiling tile|drywall|wall|paint|floor|tile/i, label: 'finishes',
    pm: 'Inspected surfaces for damage and wear.',
    fix: 'Repaired the damaged area and cleaned up the work area.' },
  { re: /fire|extinguisher|alarm|sprinkler|smoke/i, label: 'life safety equipment',
    pm: 'Inspected and tested equipment per requirements and checked tags and condition.',
    fix: 'Repaired the affected life safety component and tested for proper operation.' },
  { re: /electric|outlet|breaker|panel|switch|power/i, label: 'electrical',
    pm: 'Inspected electrical components and connections and checked for damage or overheating.',
    fix: 'Diagnosed the electrical fault, repaired it and confirmed power is restored and operating safely.' },
];

// Action verbs: what was done, in past tense, with logical steps that fit that kind of action.
const VERBS = [
  { re: /^(paint|repaint|touch[- ]?up)\b/i, past: 'painted', steps: (o) => `Prepped surface and applied paint to ${o} for an even finish.` },
  { re: /^(replace|swap|change)\b/i, past: 'replaced', steps: (o) => `Removed the old ${o.replace(/^the /, '').replace(/^(damaged|broken|old|bad|cracked|stained|missing|worn|faulty)\s+/i, '')}, installed a new one and tested for proper operation.` },
  { re: /^(install|mount|hang|hung|assemble|put up|add)\b/i, past: 'installed', steps: (o) => `Installed ${o}, secured it in place and checked that it is level and working properly.` },
  { re: /^(clean|wash|sweep|wipe|pressure wash|power wash|sanitize|disinfect)\b/i, past: 'cleaned', steps: (o) => `Cleaned ${o} thoroughly, removed debris and left the area neat.` },
  { re: /^(adjust|align|level|calibrate)\b/i, past: 'adjusted', steps: (o) => `Adjusted ${o} to the correct position and confirmed smooth operation.` },
  { re: /^(tighten|secure|anchor|re-?secure|fasten)\b/i, past: 'secured', steps: (o) => `Tightened and secured ${o} and confirmed it is stable.` },
  { re: /^(patch|fill|spackle|caulk|seal|re-?seal|waterproof)\b/i, past: 'sealed', steps: (o) => `Prepped the area, patched and sealed ${o} and cleaned up.` },
  { re: /^(unclog|clear|snake|rod|unblock)\b/i, past: 'cleared', lead: (w) => (/^unclog/i.test(w) ? 'unclogged' : 'cleared'), steps: (o) => `Cleared the blockage at ${o} and confirmed proper flow.` },
  { re: /^(lubricate|lube|grease|oil)\b/i, past: 'lubricated', steps: (o) => `Lubricated ${o} and confirmed smooth operation.` },
  { re: /^(inspect|check|test|evaluate|assess|investigate|look at|survey)\b/i, past: 'inspected', steps: (o) => `Inspected ${o}, checked condition and operation and noted no further issues.` },
  { re: /^(remove|dispose|haul|take down|demo)\b/i, past: 'removed', steps: (o) => `Removed ${o}, disposed of materials properly and cleaned the area.` },
  { re: /^(reset|restart|reprogram|rekey|re-?key|program)\b/i, past: 'reset', steps: (o) => `Reset ${o} and confirmed it is functioning as intended.` },
  { re: /^(trim|cut|mow|prune)\b/i, past: 'trimmed', steps: (o) => `Trimmed ${o}, cleared the debris and left the area clean.` },
  { re: /^(move|relocate|reposition)\b/i, past: 'moved', steps: (o) => `Moved ${o} to the requested location and secured it.` },
  { re: /^(fix|repair|restore|troubleshoot|diagnose|service|correct)\b/i, past: 'repaired', steps: (o) => `Diagnosed the issue with ${o}, completed the repair and tested for proper operation.` },
];

const withThe = (o) => (/^(the|a|an|all|our|their|his|her|its|\d+|each|both)\b/i.test(o) ? o : `the ${o}`);

// Find the actual task in the request: e.g. "fix the desk lock" -> {verb, object}.
function extractTask(description, ocrText) {
  const w = parseWorkOrder(ocrText);
  const typed = (description || '').trim().replace(/[.\s]+$/, '');
  const candidates = [typed, ...w.desc.split(/;| - |\.\s+/).map((x) => x.trim())].filter(Boolean);
  for (const c of candidates) {
    const text = c.replace(/^(please|pls|need to|needs to|need|to|request to|request|wo|worq)\s+/i, '').replace(/^[\w -]*?:\s*/, (m) => (/\b(paint|fix|repair|replace)/i.test(m) ? m : ''));
    const [w0, ...rest] = text.split(/\s+/);
    const stems = [w0, w0.replace(/(ing|ed)$/i, ''), w0.replace(/(ing|ed)$/i, 'e'), w0.replace(/([a-z])\1(ing|ed)$/i, '$1')];
    const stem = stems.find((x) => VERBS.some((v) => v.re.test(x)));
    const verbText = stem ? [stem, ...rest].join(' ') : text;
    const verb = VERBS.find((v) => v.re.test(verbText));
    if (verb) {
      const object = verbText.replace(verb.re, '').replace(/^\s*(the\s+)?/i, '').replace(/^(up|down|out)\s+/i, '').trim();
      if (object) return { verb, object: withThe(object), text: verbText, first: text.split(/\s+/)[0] };
    }
  }
  return { verb: null, object: '', text: typed };
}

// Plain request text from the screenshot, e.g. "Loose shingles on roof" (without codes/categories).
function requestSegment(desc) {
  const segs = desc.split(/;| - /).map((x) => x.replace(/^[A-Z]\d{3,5}\s*[-–][^:]*(:[^:;]*)*:?\s*/, '').trim()).filter(Boolean);
  return (segs[segs.length - 1] || '').replace(/[.\s]+$/, '').slice(0, 90);
}

const sentence = (x) => { const t = (x || '').trim().replace(/\s+/g, ' '); return t ? t.charAt(0).toUpperCase() + t.slice(1).replace(/[.\s]*$/, '.') : ''; };
const ACCESS_TEXT = {
  ladder: { worq: 'Ladder required.', done: 'Used a ladder to access the work area.' },
  lift: { worq: 'Lift required.', done: 'Used a lift to access the work area.' },
  roof: { worq: 'Roof access required.', done: 'Accessed the roof safely to complete the work.' },
  afterhours: { worq: 'Work must be done after hours.', done: 'Work was performed after hours.' },
  lockout: { worq: 'Lockout/tagout required.', done: 'Followed lockout/tagout procedures before starting work.' },
  fm: { worq: 'Contact the Facility Manager to schedule access.', done: 'Contacted Facility Manager and gained access as required.' },
};
// Facility manager wording. With a name chosen: "Contact Facility Manager X to schedule access." / "Facility Manager: X."
const fmWorq = (opts, accessText) => {
  const fm = (opts.fm || '').trim();
  if (!fm) return accessText || '';
  if (opts.access === 'fm') return `Contact Facility Manager ${fm} to schedule access.`;
  return [accessText, `Facility Manager: ${fm}.`].filter(Boolean).join(' ');
};
const PRIORITY_TEXT = { urgent: 'This is an urgent request.', rush: 'This is an urgent request.' };
const crewWord = (n) => ({ 1: '1 man', 2: '2 man', 3: '3 man', 4: '4 man' }[n] || '');

// The WORQ request: "WORQ MTS request to investigate and repair <problem> <condition>. <crew / access / notes>"
function worqRequest(sm, vendor, opts = {}) {
  const sc = sm.scenario;
  const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
  const hasAdj = /^(burned-out|dead|broken)\b/.test(sm.core);
  const cond = sc.cond && sm.broken && !hasAdj ? (sm.plural ? ' that are not working' : ' that is not working') : '';
  const verb = cond && sc.imp === 'replace' ? 'repair' : sc.imp;
  const where = sm.suffix ? ` ${sm.suffix}` : '';
  const core = sc.issues ? `investigate and repair issues with ${sm.subject}` : `${sc.invest ? 'investigate and ' : ''}${verb} ${sm.core}${cond}${where}`;
  const crew = Number(opts.crew) || sc.crew || 0;
  const access = opts.access && ACCESS_TEXT[opts.access] ? ACCESS_TEXT[opts.access].worq : sc.access;
  const extra = [opts.address ? `Address: ${opts.address}.` : '', crew > 1 || opts.crew ? `This is a ${crewWord(crew)} job.` : '', fmWorq(opts, access), ...((opts.ap && opts.ap.worq) || []), PRIORITY_TEXT[opts.priority], sentence(opts.notes)].filter(Boolean);
  return `WORQ ${who} ${core}${extra.length ? '. ' + extra.join(' ') : ''}`;
}

const VERIFY = [
  'Cleaned up the work area and left it safe for normal use.',
  'Left the area clean and safe, with all debris removed.',
  'Removed all debris and returned the area to normal use.',
];
const TAIL = [
  'Photos attached. All work order tasks completed.',
  'Photos uploaded to the work order. All tasks completed.',
  'Photos attached for reference. All required work order tasks completed.',
];

function templateClosure(description, ocrText, variant = 0, opts = {}) {
  const w = parseWorkOrder(ocrText);
  const pick = (arr) => arr[Math.abs(variant) % arr.length];
  const d = (description || '').trim().replace(/[.\s]+$/, '');
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const fm = (opts.fm || '').trim();
  const fmLine = fm ? `Contacted Facility Manager ${fm} and gained access as required.` : w.contactFM ? 'Contacted Facility Manager and gained access as required.' : '';
  const accessDone = opts.access && ACCESS_TEXT[opts.access] && !(opts.access === 'fm' && fmLine) ? ACCESS_TEXT[opts.access].done : '';
  const ap = opts.ap || { done: [], steps: '', incomplete: false };
  const extras = () => [accessDone, opts.address ? `Work was performed at ${opts.address}.` : '', ...ap.done, sentence(opts.notes), Number(opts.crew) ? `Work was completed by a ${crewWord(Number(opts.crew))} crew.` : ''].filter(Boolean);
  const scen = w.preventive ? null : matchScenario(d || requestSegment(w.desc));
  if (scen) {
    const { scenario: sc, subject } = scen;
    const parts = [ap.incomplete ? `Investigated the ${subject}.` : sc.issues ? `Investigated and repaired the issues with ${subject}.` : `${cap(sc.past)} the ${subject}.`];
    if (sc.found) parts.push(sc.found);
    if (fmLine) parts.push(fmLine);
    if (accessDone) parts.push(accessDone);
    parts.push(ap.steps || sc.steps, ...extras().filter((x) => x !== accessDone), pick(VERIFY), ap.incomplete ? 'Photos attached.' : pick(TAIL));
    return parts.join(' ');
  }
  const task = w.preventive ? { verb: null } : extractTask(d, ocrText);
  const rule = KNOWLEDGE.find((k) => k.re.test(`${w.equipment} ${task.object || d}`)) || (!task.verb && KNOWLEDGE.find((k) => k.re.test(w.desc)));
  const thing = w.equipment || (rule ? rule.label : '');
  const on = thing ? ` on the ${thing}` : '';
  const parts = [];
  if (w.preventive) {
    parts.push(`Completed ${w.frequency ? w.frequency + ' ' : ''}preventive maintenance${on}.`);
    if (fmLine) parts.push(fmLine);
    if (rule) parts.push(rule.pm);
    if (d) parts.push(`${cap(d)}.`);
    parts.push(...extras(), 'Equipment was inspected and confirmed operating within acceptable standards.');
  } else if (task.verb) {
    parts.push(`${cap(task.verb.lead ? task.verb.lead(task.first) : task.verb.past)} ${task.object}.`);
    if (fmLine) parts.push(fmLine);
    const repairLike = task.verb.past === 'repaired';
    parts.push(repairLike && rule ? rule.fix : task.verb.steps(task.object), ...extras());
    parts.push(pick(VERIFY));
  } else {
    const seg = !d && !w.equipment ? requestSegment(w.desc) : '';
    parts.push(d ? `${cap(d)}.` : seg ? `Completed repair of ${seg.charAt(0).toLowerCase() + seg.slice(1)}.` : `Completed repair${on || ' as requested in the work order'}.`);
    if (fmLine) parts.push(fmLine);
    if (rule) parts.push(rule.fix);
    parts.push(...extras(), pick(VERIFY));
  }
  parts.push(ap.incomplete ? 'Photos attached.' : pick(TAIL));
  return parts.join(' ');
}

// The description to use: the tech's text, refined by their answer to "what exactly is wrong?"
const PREP_END = /\b(in|at|by|near|on|inside|outside)\s+(?:the\s+)?[\w'/ -]+$/i;
function effectiveDesc(description, answers = {}) {
  const base = (description || '').trim();
  const w = answers.what && answers.what !== Q.SKIP ? String(answers.what).trim() : '';
  if (!w || base.toLowerCase().includes(w.toLowerCase())) return base;   // nothing to add, or already applied
  if (matchScenario(w)) { const loc = PREP_END.exec(base); return loc && !hasLocation(w) ? `${w} ${loc[0]}` : w; }
  return `${base} ${w}`.trim();
}

// What the app understood about the request (decides which questions are needed).
function contextFor(description, ocrText, answers = {}, address = '', orig = description) {
  const w = parseWorkOrder(ocrText);
  const text = (description || '').trim() || requestSegment(w.desc);
  const sm = matchScenario(text);
  const task = extractTask(description, ocrText);
  const verbSpecific = !!(task.verb && task.verb.past !== 'repaired');
  const extra = ['how', 'more', 'why'].map((k) => (answers[k] && answers[k] !== Q.SKIP ? String(answers[k]) : '')).join(' ');
  return {
    sid: sm ? sm.scenario.id : '', scenario: !!sm, verbSpecific, preventive: !!w.preventive,
    whatAnswered: !!(answers.what && answers.what !== Q.SKIP),
    hasLocation: !!(w.preventive || hasLocation(text)),
    hasAddress: !!(address || '').trim(),
    userWords: countWords(text) + countWords(extra), text: (orig || text),
  };
}
function questionsFor(mode, body) {
  const answers = body.answers || {};
  return Q.pending(mode, contextFor(effectiveDesc(body.description, answers), body.ocrText, answers, body.address, body.description), answers);
}

// Used when no API key is configured, or the API call fails.
function fallback(mode, description, vendor, ocrText = '', variant = 0, opts = {}) {
  opts = { ...opts, ap: Q.apply(mode, contextFor(description, ocrText, opts.answers || {}, opts.address), opts.answers || {}) };
  const w = parseWorkOrder(ocrText);
  const sm = mode === 'worq' ? matchScenario((description || '').trim() || requestSegment(w.desc)) : null;
  const t = mode === 'worq' ? extractTask(description, ocrText) : null;
  const d = (t && t.verb && t.text.charAt(0).toLowerCase() + t.text.slice(1)) || (description || '').trim().replace(/[.\s]+$/, '') || (t && t.verb ? t.text.charAt(0).toLowerCase() + t.text.slice(1) : '') || (mode === 'worq' && w.equipment ? 'repair ' + w.equipment : '') || (mode === 'worq' && requestSegment(w.desc) ? 'repair ' + requestSegment(w.desc).toLowerCase() : '');
  if (mode === 'worq' && sm) return worqRequest(sm, vendor, opts);
  if (mode === 'worq') {
    const imperative = sm ? `${sm.scenario.imp} ${sm.subject}` : t && t.verb ? d.replace(/^hung\b/i, 'hang') : d && !/^repair\b/i.test(d) ? `repair ${d}` : d;
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    const base = imperative || 'repair issue noted in attached photo';
    const crew = Number(opts.crew);
    const extra = [opts.address ? `Address: ${opts.address}.` : '', crew ? `This is a ${crewWord(crew)} job.` : '', fmWorq(opts, opts.access && ACCESS_TEXT[opts.access] ? ACCESS_TEXT[opts.access].worq : ''), ...((opts.ap && opts.ap.worq) || []), PRIORITY_TEXT[opts.priority], sentence(opts.notes)].filter(Boolean);
    return `WORQ ${who} ${/^repair\b/.test(base) ? 'investigate and ' + base : base}${extra.length ? '. ' + extra.join(' ') : ''}`;
  }
  return templateClosure(description, ocrText, variant, opts);
}

// Guarantee the closure rule even if the model is terse.
function enforce(mode, text, description, vendor, ocrText) {
  const t = text.trim().replace(/^["']|["']$/g, '');
  if (mode === 'closure' && countWords(t) < MIN_WORDS) {
    return `${t.replace(/[.\s]+$/, '')}. Tested and verified operating properly, work order complete.`;
  }
  if (mode === 'worq' && !/^WORQ\b/.test(t)) return fallback(mode, description, vendor, ocrText);
  return t;
}

async function generate({ mode, description, vendor, images = [], ocrText = '', variant = 0, crew = '', notes = '', access = '', priority = '', fm = '', answers = {}, address = '' }, apiKey, model) {
  if (!apiKey) return { text: fallback(mode, description, vendor, ocrText, variant, { crew, notes, access, priority, fm, answers, address }), source: 'template' };
  const content = images.slice(0, 5).map((src) => {
    const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(src);
    return m && { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
  }).filter(Boolean);
  content.push({ type: 'text', text: buildPrompt(mode, description, vendor, ocrText, variant, { crew, notes, access, priority, fm, answers, address }) });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 300, system: SYSTEM, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text: enforce(mode, text, description, vendor, ocrText), source: 'ai' };
}

const cap1 = (x) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
const wordsIn = (x) => countWords(x || '');

// The complete WORQ email: request line, description, and the details block.
function composeWorq(b, ai = null) {
  const answers = b.answers || {};
  const eff = effectiveDesc(b.description, answers);
  const w = parseWorkOrder(b.ocrText);
  const text = eff.trim() || requestSegment(w.desc);
  const sm = matchScenario(text);
  const ap = Q.apply('worq', contextFor(eff, b.ocrText, answers, b.address, b.description), answers);
  const who = b.vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
  const nCrew = Number(b.crew) || 0;
  let core, crew = nCrew, accessTxt = b.access && ACCESS_TEXT[b.access] ? ACCESS_TEXT[b.access].worq : '', area = '', descr;
  if (sm) {
    const sc = sm.scenario;
    const hasAdj = /^(burned-out|dead|broken)\b/.test(sm.core);
    const cond = sc.cond && sm.broken && !hasAdj ? (sm.plural ? ' that are not working' : ' that is not working') : '';
    const verb = cond && sc.imp === 'replace' ? 'repair' : sc.imp;
    core = sc.issues ? `investigate and repair issues with ${sm.subject}` : `${sc.invest ? 'investigate and ' : ''}${verb} ${sm.core}${cond}${sm.suffix ? ' ' + sm.suffix : ''}`;
    crew = nCrew || sc.crew || 0;
    accessTxt = accessTxt || sc.access || '';
    area = answers.where && answers.where !== Q.SKIP ? answers.where : locationWord(text) || sm.place || '';
    descr = [sc.scope, sc.why, ...ap.worq].join(' ');
  } else {
    const t = extractTask(eff, b.ocrText);
    const imperative = t.verb ? t.text.charAt(0).toLowerCase() + t.text.slice(1).replace(/^hung\b/i, 'hang') : `investigate and repair ${text.charAt(0).toLowerCase() + text.slice(1)}`;
    core = imperative.replace(/[.\s]+$/, '');
    area = answers.where && answers.where !== Q.SKIP ? answers.where : '';
    descr = [sentence(eff), ...ap.worq].join(' ');
  }
  area = cap1((area || '').trim());
  let request = `WORQ ${who} ${core}.${crew > 1 || nCrew ? ` This is a ${crewWord(crew)} job.` : ''}`;
  if (ai && /^WORQ\b/.test(ai.request || '')) request = ai.request.trim();
  if (ai && wordsIn(ai.description) >= 10) descr = ai.description.trim();
  // Layout the technicians send:  WORQ / Location / FM / Priority (Normal, Urgent) / WO Description / NTE / Vendor
  const location = [b.address, area ? `(${area})` : ''].filter(Boolean).join(' ');
  const vendor = b.vendor === 'vendor' ? ((b.vendorName || '').trim() || 'Third party vendor (to be assigned)') : 'MTS';
  const woDescription = [request, descr, accessTxt, sentence(b.notes)].filter(Boolean).join(' ');
  const title = cap1(core).slice(0, 80);
  const street = (b.address || '').split(',')[0];
  const subject = `WORQ${street ? ' – ' + street : ''} – ${title}`;
  const body = ['WORQ', `• Location: ${location}`, `• FM: ${b.fm || ''}`, `• Priority (Normal, Urgent): ${b.priority === 'urgent' || b.priority === 'rush' ? 'Urgent' : 'Normal'}`,
    `• WO Description: ${woDescription}`, `• NTE: ${b.nte || ''}`, `• Vendor: ${vendor}`].join('\n');
  return { request, description: descr, subject, body };
}

// Entry point for the API: checks what is missing, then builds the WORQ email or closing comment.
async function handle(body, apiKey, model) {
  const mode = body.mode === 'worq' ? 'worq' : 'closure';
  // A closing comment is only a description of what was addressed and repaired: no manager, address, NTE, priority, crew or access.
  if (mode === 'closure') body = { ...body, fm: '', address: '', nte: '', priority: '', crew: '', access: '', vendorName: '', vendor: 'mts' };
  const answers = body.answers || {};
  const qs = questionsFor(mode, body);
  const missing = [];
  if (mode === 'worq') {
    if (!(body.fm || '').trim()) missing.push('fm');
    if (!(body.address || '').trim()) missing.push('address');
    if (!(body.nte || '').trim()) missing.push('nte');
  }
  if (qs.required.length || missing.length) return { blocked: true, missing, required: qs.required, questions: [], text: '' };
  const eff = effectiveDesc(body.description, answers);
  const b = { ...body, description: eff, answers };
  if (mode === 'worq') {
    let ai = null, source = 'template';
    if (apiKey) {
      try {
        const r = await generate({ ...b, mode: 'worq' }, apiKey, model);
        const lines = r.text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
        ai = { request: lines[0], description: lines.slice(1).join(' ').replace(/^Description:\s*/i, '') }; source = 'ai';
      } catch (e) { console.error(e.message); }
    }
    const e = composeWorq({ ...body, answers }, ai);
    return { text: e.body, request: e.request, subject: e.subject, source, questions: qs.optional };
  }
  let res;
  try { res = await generate(b, apiKey, model); } catch (e) { console.error(e.message); res = { text: fallback('closure', eff, b.vendor, b.ocrText, b.variant, b), source: 'template' }; }
  return { text: res.text, source: res.source, questions: qs.optional };
}

module.exports = { handle, composeWorq, effectiveDesc, questionsFor, contextFor, worqRequest, extractTask, parseWorkOrder, templateClosure, generate, fallback, enforce, countWords, buildPrompt, MIN_WORDS };
