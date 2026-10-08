'use strict';
module.exports = (req, res) => {
  res.status(200).json({ email: process.env.WORQ_EMAIL || 'CREWOs@bmo.com', ai: !!process.env.ANTHROPIC_API_KEY });
};
