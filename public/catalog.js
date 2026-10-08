// Menu choices for building a request: Category -> Item -> Problem, plus Location.
// Problems that start with a predicate word ("not working") read after the item; the rest read before it ("clogged sink").
export const CATALOG = {
  'Plumbing': {
    'Sink': ['Clogged', 'Leaking', 'Slow draining'],
    'Toilet': ['Clogged', 'Running', "Won't flush", 'Leaking at base'],
    'Urinal': ['Clogged', 'Flush valve not working'],
    'Faucet': ['Leaking', 'Dripping', 'Handle broken'],
    'Floor drain': ['Clogged', 'Backing up'],
    'Water heater': ['Not heating', 'Leaking'],
    'Pipe': ['Leaking', 'Burst'],
    'Drinking fountain': ['Not working', 'Leaking'],
  },
  'Electrical / Lighting': {
    'Interior light': ['Not working', 'Flickering', 'Burned out'],
    'Exterior wall pack light': ['Not working', 'Flickering'],
    'Parking lot pole light': ['Not working'],
    'Exit sign / emergency light': ['Not working'],
    'Outlet': ['No power', 'Sparking', 'Broken'],
    'Light switch': ['Not working', 'Broken'],
    'Breaker / panel': ['Tripping', 'Not working'],
  },
  'HVAC': {
    'Ceiling heater': ['Not heating', 'Noisy'],
    'Rooftop unit (RTU)': ['Not cooling', 'Not heating', 'Noisy', 'Leaking'],
    'Thermostat': ['Not working'],
    'Exhaust fan': ['Not working', 'Noisy'],
    'Room temperature': ['Excessive heat', 'Too cold'],
  },
  'Roof / Exterior': {
    'Shingles': ['Loose', 'Missing'],
    'Roof': ['Leaking', 'Damaged'],
    'Gutter / downspout': ['Clogged', 'Damaged'],
    'Sign': ['Not working', 'Damaged'],
    'Fence / gate': ['Damaged', 'Loose'],
    'Parking lot': ['Pothole', 'Cracked pavement'],
    'Sidewalk / curb': ['Cracked', 'Trip hazard'],
  },
  'Doors / Locks / Windows': {
    'Door': ['Sticking', "Won't latch", 'Damaged'],
    'Lock': ['Broken', 'Jammed'],
    'Desk / drawer lock': ['Broken', 'Jammed'],
    'Window': ['Broken', 'Cracked'],
  },
  'Interior / Finishes': {
    'Ceiling tile': ['Water-stained', 'Missing', 'Damaged'],
    'Wall': ['Hole', 'Damaged'],
    'Paint': ['Peeling', 'Scuffed'],
    'Floor tile': ['Cracked', 'Loose'],
    'Carpet': ['Stained', 'Damaged'],
    'Blinds': ['Broken'],
    'Cabinet / shelf': ['Loose', 'Broken'],
    'Mold': ['Present'],
  },
  'Life safety': {
    'Smoke detector': ['Chirping', 'Not working'],
    'Fire extinguisher': ['Needs inspection'],
    'Sprinkler': ['Leaking'],
  },
};

export const LOCATIONS = ['Kitchen', 'Break room', 'Restroom', "Men's restroom", "Women's restroom", 'Lobby', 'Teller line', 'Vault', 'Office', 'Hallway',
  'IT Room', 'Storage room', 'Mechanical room', 'Roof', 'Exterior', 'Parking lot', 'Entrance', 'Loading dock'];

const PREDICATE = /^(not|no|won'?t|needs|tripping|chirping|sparking|noisy|flush|backing|trip|too|excessive)/i;
const PREP = { Roof: 'on', Exterior: 'on', Entrance: 'at', 'Loading dock': 'at', 'Teller line': 'at' };
const lc = (l) => (/^[A-Z]{2,}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1));

// -> e.g. "clogged sink in the kitchen", "exterior wall pack light not working in the Parking lot"
export function compose(item, problem, location) {
  if (!item) return '';
  const it = item.replace(/\s*\(.*?\)\s*/g, ' ').replace(/ \/ /g, ' or ').trim();
  const lowerIt = /^[A-Z]{2,}\b/.test(it) ? it : it.toLowerCase();
  const pr = (problem || '').toLowerCase();
  if (item === 'Parking lot') return `${pr || 'damage'} in the parking lot`;
  let core;
  if (item === 'Room temperature') core = pr || 'excessive heat'; // "excessive heat", "too cold"
  else if (!pr) core = lowerIt;
  else if (PREDICATE.test(pr)) core = `${lowerIt} ${pr}`;
  else core = `${pr} ${lowerIt}`;
  return location ? `${core} ${PREP[location] || 'in'} the ${lc(location)}` : core;
}

export const ACCESS = {
  '': '',
  ladder: { worq: 'Ladder required.', done: 'Used a ladder to access the work area.' },
  lift: { worq: 'Lift required.', done: 'Used a lift to access the work area.' },
  roof: { worq: 'Roof access required.', done: 'Accessed the roof safely to complete the work.' },
  afterhours: { worq: 'Work must be done after hours.', done: 'Work was performed after hours.' },
  lockout: { worq: 'Lockout/tagout required.', done: 'Followed lockout/tagout procedures before starting work.' },
  fm: { worq: 'Contact the Facility Manager to schedule access.', done: 'Contacted Facility Manager and gained access as required.' },
};
