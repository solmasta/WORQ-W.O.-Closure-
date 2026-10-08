'use strict';
const { handle } = require('../lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!['closure', 'worq'].includes(body.mode)) return res.status(400).json({ error: 'Invalid mode' });
  if (!body.description?.trim() && !body.images?.length && !body.ocrText?.trim()) {
    return res.status(400).json({ error: 'Add a description or screenshot' });
  }
  const key = process.env.ANTHROPIC_API_KEY, model = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
  try {
    res.status(200).json(await handle(body, key, model));
  } catch (e) {
    console.error(e.message);
    res.status(200).json(await handle(body, '', model));
  }
};
