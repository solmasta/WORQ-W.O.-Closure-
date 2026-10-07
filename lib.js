'use strict';

const MIN_WORDS = 10;

const countWords = (s) => (s.trim().match(/\S+/g) || []).length;

const SYSTEM = `You write short maintenance work order text for a facilities team.
Use any attached screenshots and the user's short description. Never invent specifics (part numbers, readings, names) that are not given or visible.
Output ONLY the requested text, with no quotes, labels or commentary.`;

function buildPrompt(mode, description, vendor) {
  if (mode === 'worq') {
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    return `Write ONE line that will be the start of an email requesting a work order.
It must begin exactly with "WORQ ${who} " followed by a brief plain description of the repair needed (lowercase verb, e.g. "repair compressor", "repair loose shingles").
Maximum 15 words. No period at the end.
Issue details: ${description || '(see screenshot)'}`;
  }
  return `Write a work order closure comment describing the repair that was completed so the work order can be closed.
Rules: past tense, plain language, ${MIN_WORDS} words or more (aim for 15-30), one or two sentences, mention what was repaired/replaced, that it was tested or verified, and the result.
Repair details: ${description || '(see screenshot)'}`;
}

// Used when no API key is configured, or the API call fails.
function fallback(mode, description, vendor) {
  const d = (description || '').trim().replace(/[.\s]+$/, '');
  if (mode === 'worq') {
    const who = vendor === 'vendor' ? 'third party vendor needed to' : 'MTS request to';
    return `WORQ ${who} ${d || 'repair issue noted in attached photo'}`;
  }
  const base = d ? d.charAt(0).toUpperCase() + d.slice(1) : 'Completed repair as noted in attached photo';
  return `${base}. Tested and verified operating properly, area cleaned up, work order is complete.`;
}

// Guarantee the closure rule even if the model is terse.
function enforce(mode, text, description, vendor) {
  const t = text.trim().replace(/^["']|["']$/g, '');
  if (mode === 'closure' && countWords(t) < MIN_WORDS) {
    return `${t.replace(/[.\s]+$/, '')}. Tested and verified operating properly, work order complete.`;
  }
  if (mode === 'worq' && !/^WORQ\b/.test(t)) return fallback(mode, description, vendor);
  return t;
}

async function generate({ mode, description, vendor, images = [] }, apiKey, model) {
  if (!apiKey) return { text: fallback(mode, description, vendor), source: 'template' };
  const content = images.slice(0, 5).map((src) => {
    const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(src);
    return m && { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
  }).filter(Boolean);
  content.push({ type: 'text', text: buildPrompt(mode, description, vendor) });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 300, system: SYSTEM, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  return { text: enforce(mode, text, description, vendor), source: 'ai' };
}

module.exports = { generate, fallback, enforce, countWords, buildPrompt, MIN_WORDS };
