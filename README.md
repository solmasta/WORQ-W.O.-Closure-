# WORQ Closure Helper

Web app that turns screenshots + a short description into:
- **Closure comments** (10+ words) describing the repair, to close out a work order.
- **WORQ request lines**, e.g. `WORQ MTS request to repair compressor` or
  `WORQ third party vendor needed to repair loose shingles`.

## Run
```
export ANTHROPIC_API_KEY=sk-ant-...   # optional; without it a simple template is used
export WORQ_EMAIL=community-box@example.com   # optional; enables the Email button
npm start     # http://localhost:3000
```
No dependencies (Node 18+). `npm test` runs the unit tests.
