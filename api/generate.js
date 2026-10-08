'use strict';
const { generate, fallback } = require('../lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!['closure', 'worq'].includes(body.mode)) return res.status(400).json({ error: 'Invalid mode' });
  if (!body.description?.trim() && !body.images?.length && !body.ocrText?.trim()) {
    return res.status(400).json({ error: 'Add a description or screenshot' });
  }
  try {
    res.status(200).json(await generate(body, process.env.ANTHROPIC_API_KEY, process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'));
  } catch (e) {
    console.error(e.message);
    res.status(200).json({ text: fallback(body.mode, body.description, body.vendor, body.ocrText, body.variant, { crew: body.crew, notes: body.notes, access: body.access, priority: body.priority }), source: 'template', warning: 'AI unavailable, used template' });
  }
};
