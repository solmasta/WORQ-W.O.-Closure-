// Menu choices for building a request: Category -> Item -> Problem, plus Location.
// Problems that start with a predicate word ("not working") read after the item; the rest read before it ("clogged sink").
export const CATALOG = {
  'Plumbing': {
    'Sink': ['Clogged', 'Leaking', 'Slow draining', 'Loose from the counter'],
    'Toilet': ['Clogged', 'Running', "Won't flush", 'Leaking at base', 'Loose or rocking'],
    'Toilet seat': ['Broken', 'Loose'],
    'Urinal': ['Clogged', 'Flush valve not working'],
    'Faucet': ['Leaking', 'Dripping', 'Handle broken'],
    'Sensor faucet': ['Not working'],
    'Shower / tub': ['Clogged', 'Slow draining'],
    'Floor drain': ['Clogged', 'Backing up'],
    'Water heater': ['Not heating', 'Leaking'],
    'Pipe / supply line': ['Leaking', 'Burst', 'Frozen'],
    'Shut-off valve / trap': ['Leaking'],
    'Hose bib / spigot': ['Leaking', 'Broken'],
    'Drinking fountain': ['Not working', 'Leaking'],
    'Sump pump': ['Not working'],
    'Sewer / main line': ['Backing up'],
    'Water pressure': ['Low'],
    'Backflow preventer': ['Needs testing'],
  },
  'Electrical / Lighting': {
    'Interior light': ['Not working', 'Flickering', 'Burned out'],
    'Exterior wall pack light': ['Not working', 'Flickering'],
    'Parking lot pole light': ['Not working'],
    'Canopy / soffit light': ['Not working'],
    'Exit sign / emergency light': ['Not working', 'Battery dead'],
    'Ballast / LED driver': ['Humming', 'Failed'],
    'Motion sensor / photocell / timer': ['Not working'],
    'Outlet': ['No power', 'Sparking', 'Broken', 'Loose'],
    'GFCI outlet': ['Tripped', 'Not working'],
    'Light switch': ['Not working', 'Broken'],
    'Breaker / panel': ['Tripping', 'Not working'],
    'Power': ['Out'],
    'Exposed wiring': ['Exposed', 'Missing cover plate'],
    'Generator / UPS': ['Needs service'],
    'Data jack': ['Not working'],
    'Fire alarm': ['Trouble signal'],
    'Extension cord': ['Used as permanent wiring'],
  },
  'HVAC': {
    'Ceiling heater': ['Not heating', 'Noisy'],
    'Rooftop unit (RTU)': ['Not cooling', 'Not heating', 'Noisy', 'Leaking'],
    'Thermostat': ['Not working', 'Dead battery'],
    'Exhaust fan': ['Not working', 'Noisy'],
    'Room temperature': ['Excessive heat', 'Too cold'],
    'Air filters': ['Dirty'],
    'Belt': ['Squealing', 'Worn'],
    'Condensate drain': ['Clogged'],
    'Ductwork': ['Leaking', 'Disconnected', 'Damaged'],
    'Damper / VAV / diffuser': ['Stuck', 'Not working', 'Noisy'],
    'Boiler / hydronic heat': ['Not heating'],
    'Chiller / cooling tower': ['Needs service'],
    'Mini-split / IT room AC': ['Not working'],
    'Refrigerant': ['Low or leaking'],
    'Frozen coil': ['Frozen'],
    'Air quality / humidity': ['Musty', 'Stuffy'],
  },
  'Painting & Walls': {
    'Paint': ['Peeling', 'Scuffed', 'Needs repainting'],
    'Wall': ['Hole', 'Crack', 'Water damage', 'Scuffed', 'Damaged'],
    'Ceiling tile': ['Water-stained', 'Missing', 'Damaged'],
    'Ceiling grid': ['Sagging'],
    'Baseboard / trim': ['Loose', 'Damaged', 'Missing'],
    'Caulk / sealant': ['Failed'],
    'Graffiti': ['Present'],
  },
  'Flooring': {
    'Floor tile': ['Cracked', 'Loose'],
    'Grout': ['Cracked'],
    'Carpet': ['Stained', 'Torn', 'Buckled'],
    'Floor finish': ['Scuffed', 'Dull'],
  },
  'Doors / Locks / Glass': {
    'Door': ['Sticking', "Won't latch", 'Damaged'],
    'Lock': ['Broken', 'Jammed'],
    'Desk / drawer lock': ['Broken', 'Jammed'],
    'Rekey / lost keys': ['Needs rekeying'],
    'Door closer': ['Not working'],
    'Panic / exit device': ['Not working'],
    'Automatic door / ADA operator': ['Not working'],
    'Overhead / dock door': ['Not working'],
    'Hinge': ['Loose', 'Broken'],
    'Weather stripping / sweep': ['Worn', 'Missing'],
    'Door frame': ['Damaged'],
    'Window': ['Broken', 'Cracked', 'Stuck'],
    'Storefront glass': ['Cracked', 'Broken'],
    'Card reader / access control': ['Not working'],
    'Security camera': ['Not working'],
    'Night drop / drive-thru': ['Jammed'],
    'Elevator': ['Not working'],
  },
  'Roof / Exterior': {
    'Roof': ['Leaking', 'Damaged'],
    'Shingles': ['Loose', 'Missing'],
    'Roof drain': ['Clogged'],
    'Flashing / parapet': ['Damaged'],
    'Roof membrane': ['Torn'],
    'Skylight / roof hatch': ['Leaking'],
    'Gutter / downspout': ['Clogged', 'Damaged'],
    'Canopy / awning': ['Damaged'],
    'Siding / soffit / fascia': ['Damaged', 'Rotted'],
    'Brick / masonry / stucco': ['Cracked', 'Missing'],
    'Sign': ['Not working', 'Damaged'],
    'Fence / gate': ['Damaged', 'Loose'],
    'Light pole': ['Leaning', 'Damaged'],
  },
  'Grounds / Parking': {
    'Parking lot': ['Pothole', 'Cracked pavement'],
    'Parking striping': ['Faded'],
    'Curb / bollard': ['Damaged'],
    'Sidewalk': ['Cracked', 'Trip hazard'],
    'Catch basin / storm drain': ['Clogged'],
    'Landscaping / trees': ['Overgrown'],
    'Snow / ice': ['On walkways'],
    'Pressure washing': ['Needed'],
    'Dumpster / trash': ['Overflowing'],
  },
  'Life safety': {
    'Smoke detector': ['Chirping', 'Not working'],
    'Fire extinguisher': ['Needs inspection'],
    'Sprinkler': ['Leaking'],
    'AED / eyewash station': ['Needs inspection'],
    'Exit path': ['Blocked'],
  },
  'General / Other': {
    'Pests': ['Present'],
    'Odor': ['Present'],
    'Flooding': ['Standing water'],
    'Mold': ['Present'],
    'Teller counter / countertop': ['Damaged', 'Peeling'],
    'Furniture': ['Broken', 'Loose'],
    'Cabinet / shelf': ['Loose', 'Broken'],
    'Blinds': ['Broken'],
  },
};

export const LOCATIONS = ['Kitchen', 'Break room', 'Restroom', "Men's restroom", "Women's restroom", 'Lobby', 'Teller line', 'Vault', 'Office', 'Hallway',
  'IT Room', 'Storage room', 'Mechanical room', 'Roof', 'Exterior', 'Parking lot', 'Entrance', 'Loading dock'];

const PREDICATE = /^(not|no|won'?t|needs|tripping|chirping|sparking|noisy|flush|backing|trip|too|excessive|present|used|out|on |needed|battery|low|trouble|tripped|humming|failed|overflowing|standing|faded|frozen|leaning|sagging)/i;
const PREP = { Roof: 'on', Exterior: 'on', Entrance: 'at', 'Loading dock': 'at', 'Teller line': 'at' };
const lc = (l) => (/^[A-Z]{2,}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1));

const ITEM_PHRASE = { 'Air quality / humidity': 'humidity', 'Exit sign / emergency light': 'emergency light', 'Mini-split / IT room AC': 'IT room AC', 'Card reader / access control': 'card reader',
  'Automatic door / ADA operator': 'automatic door', 'Panic / exit device': 'exit device', 'Boiler / hydronic heat': 'boiler', 'Ballast / LED driver': 'ballast', 'Canopy / soffit light': 'canopy light', 'Overhead / dock door': 'overhead door' };
const IN_THE = { hole: 'in the', crack: 'in the', 'water damage': 'on the' };

// -> e.g. "clogged sink in the kitchen", "exterior wall pack light not working in the parking lot"
export function compose(item, problem, location) {
  if (!item) return '';
  const base = ITEM_PHRASE[item] || item.split(' / ')[0];
  const it = base.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const lowerIt = /^[A-Z]{2,}\b/.test(it) ? it : it.toLowerCase();
  const pr = (problem || '').toLowerCase();
  if (item === 'Parking lot') return `${pr || 'damage'} in the parking lot`;
  let core;
  if (item === 'Room temperature') core = pr || 'excessive heat'; // "excessive heat", "too cold"
  else if (!pr) core = lowerIt;
  else if (IN_THE[pr]) core = `${pr} ${IN_THE[pr]} ${lowerIt}`;
  else if (PREDICATE.test(pr)) core = `${lowerIt} ${pr}`;
  else core = `${pr} ${lowerIt}`;
  // don't repeat the place when the item already says it ("roof drain" + "Roof")
  if (location && core.toLowerCase().includes(lc(location).toLowerCase())) return core;
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

// Facility managers shown in the drop-down (add more here).
export const FACILITY_MANAGERS = ['Brianna Brungardt', 'Dave Fleming', 'Alan Macejak'];
