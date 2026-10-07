'use strict';

const MIN_WORDS = 10;

const countWords = (s) => (s.trim().match(/\S+/g) || []).length;

const EXAMPLE = 'Completed quarterly preventive maintenance on the ceiling heater. Contacted Facility Manager and gained access as required. Equipment was inspected and confirmed operating within acceptable standards. Photos attached to the inspection. All work order tasks completed.';

const SYSTEM = `You write short maintenance work order text for a facilities team.
Use any attached screenshots and the user's short description. You may assume the standard, logical repair steps for the request (e.g. a heater PM means inspected, cleaned and tested the unit; loose shingles means re-secured and sealed them), but never invent specifics such as part numbers, measurements, readings, costs or names.
If a screenshot shows a work order (e.g. its Work Description, equipment, or required steps such as "contact the Facility Manager to schedule access"), reflect those tasks in the comment, and infer the logical work that fits the request.
Output ONLY the requested text, with no quotes, labels or commentary.`;

const ocrBlock = (t) => (t && t.trim() ? `\nText read from the work order screenshot (may contain OCR errors):\n${t.trim().slice(0, 3000)}` : '');

function buildPrompt(mode, description, vendor, ocrText = '') {
  if (mode === 'worq') {
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    return `Write ONE line that will be the start of an email requesting a work order.
It must begin exactly with "WORQ ${who} " followed by a brief plain description of the repair needed (lowercase verb, e.g. "repair compressor", "repair loose shingles").
Maximum 15 words. No period at the end.
Issue details: ${description || '(see screenshot)'}${ocrBlock(ocrText)}`;
  }
  return `Write a work order closure comment describing the repair that was completed so the work order can be closed.
Rules: past tense, plain professional language, ${MIN_WORDS} words or more. Use 3-5 short sentences: what work was completed, any access/contact steps required, what was inspected or repaired, the result, and that all tasks are complete.
Match the style of this example (a quarterly preventive maintenance on a ceiling heater):
"${EXAMPLE}"
Repair details: ${description || '(see screenshot)'}${ocrBlock(ocrText)}`;
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
  { re: /^(paint|repaint|touch[- ]?up)\b/i, past: 'painted', steps: (o) => `Prepped surface, applied paint to ${o} for an even finish and cleaned up the work area.` },
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

function templateClosure(description, ocrText) {
  const w = parseWorkOrder(ocrText);
  const d = (description || '').trim().replace(/[.\s]+$/, '');
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const task = w.preventive ? { verb: null } : extractTask(d, ocrText);
  const rule = KNOWLEDGE.find((k) => k.re.test(`${w.equipment} ${task.object || d}`)) || (!task.verb && KNOWLEDGE.find((k) => k.re.test(w.desc)));
  const thing = w.equipment || (rule ? rule.label : '');
  const on = thing ? ` on the ${thing}` : '';
  const parts = [];
  if (w.preventive) {
    parts.push(`Completed ${w.frequency ? w.frequency + ' ' : ''}preventive maintenance${on}.`);
    if (w.contactFM) parts.push('Contacted Facility Manager and gained access as required.');
    if (rule) parts.push(rule.pm);
    if (d) parts.push(`${cap(d)}.`);
    parts.push('Equipment was inspected and confirmed operating within acceptable standards.');
  } else if (task.verb) {
    parts.push(`${cap(task.verb.lead ? task.verb.lead(task.first) : task.verb.past)} ${task.object}.`);
    if (w.contactFM) parts.push('Contacted Facility Manager and gained access as required.');
    const repairLike = task.verb.past === 'repaired';
    parts.push(repairLike && rule ? rule.fix : task.verb.steps(task.object));
    parts.push('Work was verified complete and the area is clean and safe.');
  } else {
    const seg = !d && !w.equipment ? requestSegment(w.desc) : '';
    parts.push(d ? `${cap(d)}.` : seg ? `Completed repair of ${seg.charAt(0).toLowerCase() + seg.slice(1)}.` : `Completed repair${on || ' as requested in the work order'}.`);
    if (w.contactFM) parts.push('Contacted Facility Manager and gained access as required.');
    if (rule) parts.push(rule.fix);
    parts.push('Work was verified complete and the area is clean and safe.');
  }
  parts.push('Photos attached.', 'All work order tasks completed.');
  return parts.join(' ');
}

// Used when no API key is configured, or the API call fails.
function fallback(mode, description, vendor, ocrText = '') {
  const w = parseWorkOrder(ocrText);
  const t = mode === 'worq' ? extractTask(description, ocrText) : null;
  const d = (description || '').trim().replace(/[.\s]+$/, '') || (t && t.verb ? t.text.charAt(0).toLowerCase() + t.text.slice(1) : '') || (mode === 'worq' && w.equipment ? 'repair ' + w.equipment : '') || (mode === 'worq' && requestSegment(w.desc) ? 'repair ' + requestSegment(w.desc).toLowerCase() : '');
  if (mode === 'worq') {
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    return `WORQ ${who} ${d || 'repair issue noted in attached photo'}`;
  }
  return templateClosure(description, ocrText);
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

async function generate({ mode, description, vendor, images = [], ocrText = '' }, apiKey, model) {
  if (!apiKey) return { text: fallback(mode, description, vendor, ocrText), source: 'template' };
  const content = images.slice(0, 5).map((src) => {
    const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(src);
    return m && { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
  }).filter(Boolean);
  content.push({ type: 'text', text: buildPrompt(mode, description, vendor, ocrText) });

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

module.exports = { extractTask, parseWorkOrder, templateClosure, generate, fallback, enforce, countWords, buildPrompt, MIN_WORDS };
