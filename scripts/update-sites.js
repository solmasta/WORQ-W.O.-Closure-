'use strict';
// Refreshes the BMO branch list from the FDIC's public bank-location data (BMO Bank National Association, FDIC cert 16571).
// Usage: npm run update-sites     (needs internet; writes public/sites.json and public/bmo-branches.csv)
const fs = require('fs');
const path = require('path');

const CERT = 16571;
const TYPES = { 11: 'Branch', 12: 'Branch', 13: 'Branch', 21: 'Administrative office', 22: 'Military facility', 23: 'Limited-service facility', 29: 'Other limited-service' };
const titleCase = (s) => (s || '').toLowerCase().replace(/\b([a-z])([a-z']*)/g, (m, a, b) => a.toUpperCase() + b)
  .replace(/\b(Atm|Pc|Il|Wi|Ca|Co|Az|Mn|Ne|Ks|Mo|Ia|Or|Nm|Fl|Wy|Ok|Wa|Nv|Sd|Ut|Nd|Id|Tx|In)\b/g, (m) => m.toUpperCase())
  .replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (m, n, s) => n + s.toLowerCase());

(async () => {
  const url = new URL('https://api.fdic.gov/banks/locations');
  url.searchParams.set('filters', `CERT:${CERT}`);
  url.searchParams.set('fields', 'UNINUMBR,OFFNAME,ADDRESS,CITY,STALP,ZIP,COUNTY,SERVTYPE,LATITUDE,LONGITUDE,MAINOFF');
  url.searchParams.set('limit', '5000');
  const res = await fetch(url, { headers: { 'user-agent': 'worq-closure-site-list' } });
  if (!res.ok) throw new Error(`FDIC request failed: ${res.status}`);
  const j = await res.json();
  const sites = j.data.map((r) => r.data).map((r) => ({
    id: String(r.ID || r.UNINUMBR || ''),
    n: titleCase(r.OFFNAME) || 'Branch',
    a: (r.ADDRESS || '').trim(),
    c: titleCase(r.CITY),
    s: r.STALP,
    z: String(r.ZIP || '').slice(0, 5),
    y: r.LATITUDE ? Math.round(r.LATITUDE * 1e5) / 1e5 : null,
    x: r.LONGITUDE ? Math.round(r.LONGITUDE * 1e5) / 1e5 : null,
    t: TYPES[r.SERVTYPE] || 'Other',
  })).filter((s) => s.a).sort((p, q) => p.s.localeCompare(q.s) || p.c.localeCompare(q.c) || p.a.localeCompare(q.a));
  const dir = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(dir, 'sites.json'), JSON.stringify({ source: 'FDIC BankFind (BMO Bank National Association, cert 16571)', updated: new Date().toISOString().slice(0, 10), sites }));
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Name,Address,City,State,ZIP,Type,Latitude,Longitude', ...sites.map((s) => [`BMO ${s.n}`, s.a, s.c, s.s, s.z, s.t, s.y, s.x].map(esc).join(','))].join('\n');
  fs.writeFileSync(path.join(dir, 'bmo-branches.csv'), csv + '\n');
  const byState = sites.reduce((m, s) => ((m[s.s] = (m[s.s] || 0) + 1), m), {});
  console.log(`Saved ${sites.length} BMO locations in ${Object.keys(byState).length} states`, byState);
})().catch((e) => { console.error(e.message); process.exit(1); });
