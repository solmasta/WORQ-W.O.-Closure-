'use strict';

const MIN_WORDS = 10;

const countWords = (s) => (s.trim().match(/\S+/g) || []).length;

const EXAMPLE = 'Completed quarterly preventive maintenance on the ceiling heater. Contacted Facility Manager and gained access as required. Equipment was inspected and confirmed operating within acceptable standards. Photos attached to the inspection. All work order tasks completed.';

const SYSTEM = `You write short maintenance work order text for a facilities team.
Use any attached screenshots and the user's short description. Never invent specifics (part numbers, readings, names) that are not given or visible.
If a screenshot shows a work order (e.g. its Work Description, equipment, or required steps such as "contact the Facility Manager to schedule access"), reflect those tasks in the comment, but only claim what the description or screenshot supports.
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

function templateClosure(description, ocrText) {
  const w = parseWorkOrder(ocrText);
  const d = (description || '').trim().replace(/[.\s]+$/, '');
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const on = w.equipment ? ` on the ${w.equipment}` : '';
  const parts = [];
  if (w.preventive) parts.push(`Completed ${w.frequency ? w.frequency + ' ' : ''}preventive maintenance${on}.`);
  else if (d) parts.push(`${cap(d)}.`);
  else parts.push(`Completed repair${on || ' as noted in the work order'}.`);
  if (w.contactFM) parts.push('Contacted Facility Manager and gained access as required.');
  if (w.preventive && d) parts.push(`${cap(d)}.`);
  parts.push(w.preventive
    ? 'Equipment was inspected and confirmed operating within acceptable standards.'
    : 'Tested and verified operating properly.');
  parts.push('Photos attached.', 'All work order tasks completed.');
  return parts.join(' ');
}

// Used when no API key is configured, or the API call fails.
function fallback(mode, description, vendor, ocrText = '') {
  const w = parseWorkOrder(ocrText);
  const d = (description || '').trim().replace(/[.\s]+$/, '') || (mode === 'worq' && w.equipment ? 'repair ' + w.equipment : '');
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

module.exports = { parseWorkOrder, templateClosure, generate, fallback, enforce, countWords, buildPrompt, MIN_WORDS };
