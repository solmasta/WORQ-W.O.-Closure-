'use strict';
// Problem-aware wording: matches "object + symptom" in any word order (e.g. "sink clogged kitchen")
// and returns the verb, subject and the steps a technician would realistically perform.

const LOCATIONS = /\b(kitchen|bathroom|restroom|break ?room|lunch ?room|lobby|office|hallway|vault|teller (?:line|area|station)|server room|storage room|stock room|conference room|basement|exterior|parking lot|loading dock|dock|mens|men's|womens|women's|roof|entrance|stairwell|atm)\b/i;
const PREP_TAIL = /\b(in|at|by|near|on|inside|outside|behind|under|above)\s+(?:the\s+)?([\w'/ -]+)$/i;

const ADJ = [
  [/un?clog|clog|plug|backed|stopped|blocked|block/i, 'clogged'],
  [/leak|drip|seep/i, 'leaking'],
  [/crack/i, 'cracked'], [/broke|broken|busted/i, 'broken'], [/loose|wobbl/i, 'loose'],
  [/\brunning\b|\brun\b/i, 'running'], [/stuck|jam/i, 'jammed'], [/stain/i, 'water-stained'], [/missing/i, 'missing'],
  [/burn|burnt|\bout\b/i, 'burned-out'], [/dead/i, 'dead'], [/flicker/i, 'flickering'], [/\bdim\b/i, 'dim'], [/peel/i, 'peeling'], [/damag/i, 'damaged'],
];

const S = (o) => o;
const SCENARIOS = [
  S({ id: 'toilet-clog', obj: /toilet|commode|urinal/i, sym: /clog|plug|backed|stopped|block|overflow|won'?t flush/i, imp: 'clear', past: 'cleared',
    steps: 'Removed the blockage with a plunger and closet auger, flushed repeatedly to confirm full flow, and checked the base and supply line for leaks.' }),
  S({ id: 'toilet-run', obj: /toilet|commode/i, sym: /run|constant|weak|hiss|fill|flush|handle/i, imp: 'repair', past: 'repaired',
    steps: 'Inspected the tank, adjusted and replaced the worn flapper and fill valve as needed, and confirmed the toilet flushes fully and shuts off properly.' }),
  S({ id: 'floor-drain', obj: /floor drain/i, sym: /clog|plug|backed|slow|block|overflow|smell|odor/i, imp: 'clear', past: 'cleared',
    steps: 'Removed the cover, cleared the blockage with a drain machine, flushed the line with water and confirmed proper drainage.' }),
  S({ id: 'disposal', obj: /disposal/i, sym: /jam|stuck|hum|clog|not working|broke|leak/i, imp: 'repair', past: 'repaired',
    steps: 'Freed the jammed flywheel, cleared the debris, reset the unit and ran water to confirm it operates and drains properly.' }),
  S({ id: 'sink-clog', obj: /sink|drain|basin|lavatory/i, sym: /clog|plug|backed|slow|block|stopped|overflow|won'?t drain/i, imp: 'clear', past: 'cleared',
    steps: 'Removed the blockage with a drain snake, flushed the line with hot water, and verified proper drainage with no leaks at the trap or connections.' }),
  S({ id: 'faucet-leak', obj: /faucet|tap|spigot|sprayer|handle/i, sym: /leak|drip|seep|run/i, imp: 'repair', past: 'repaired',
    steps: 'Shut off the water supply, replaced the worn washer or cartridge, tightened the connections, and ran the water to confirm the leak is stopped.' }),
  S({ id: 'pipe-leak', obj: /pipe|line|valve|supply|fitting|joint|coupling|hose/i, sym: /leak|drip|burst|seep|spray/i, imp: 'repair', past: 'repaired',
    steps: 'Isolated the water supply, repaired the leaking section, restored water and confirmed no leaks at the repair and surrounding connections.' }),
  S({ id: 'tile-water', obj: /ceiling tile|ceiling|drop ceiling/i, sym: /stain|leak|wet|drip|water|sag|damag|broke|missing|crack/i, imp: 'replace', past: 'replaced',
    steps: 'Removed the stained tile, confirmed the water source has been addressed, installed a new tile and checked that it sits level in the grid.' }),
  S({ id: 'roof-leak', obj: /roof|flashing|skylight/i, sym: /leak|drip|water|damag/i, imp: 'repair', past: 'repaired',
    steps: 'Located the point of water entry, repaired and sealed the affected area, and inspected the surrounding roof for further damage.' }),
  S({ id: 'shingles', obj: /shingle/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Re-secured the loose shingles, replaced any missing or damaged pieces, sealed the affected area and inspected the surrounding roof.' }),
  S({ id: 'gutter', obj: /gutter|downspout/i, sym: null, imp: 'clear', past: 'cleared',
    steps: 'Removed debris from the gutters and downspouts, flushed them with water to confirm proper drainage and secured any loose sections.' }),
  S({ id: 'light', obj: /light|lamp|bulb|ballast|fixture|led|exit sign|emergency light/i, sym: /out|burn|dead|flicker|not work|broke|dim|buzz|hum|won'?t/i, imp: 'replace', past: 'replaced',
    steps: 'Replaced the failed lamp, checked the ballast or driver and wiring connections, and confirmed the fixture is working properly.' }),
  S({ id: 'outlet', obj: /outlet|receptacle|switch|gfci|plug/i, sym: /dead|no power|not work|broke|spark|burn|loose|hot|trip|crack/i, imp: 'repair', past: 'repaired',
    steps: 'Shut off power, tested the circuit, replaced the faulty device, restored power and confirmed correct operation.' }),
  S({ id: 'lock', obj: /lock|key|deadbolt|latch|cylinder|handle|knob|padlock/i, sym: /broke|jam|stuck|won'?t|not work|loose|stiff|spin|fall|lost|crack|\bfix\b|\brepair\b/i, imp: 'repair', past: 'repaired',
    steps: 'Disassembled the lock, cleaned and lubricated the mechanism, replaced the worn components as needed, and tested with the key several times for smooth operation.' }),
  S({ id: 'door', obj: /door|gate/i, sym: /stick|close|latch|rub|sag|loose|hinge|drag|slam|align|hold|won'?t|not/i, imp: 'repair', past: 'repaired',
    steps: 'Adjusted and tightened the hinges, aligned the strike plate and latch, lubricated the moving parts and confirmed the door opens, closes and latches smoothly.' }),
  S({ id: 'heat', obj: /heat|furnace|boiler|unit heater|space heater|hvac|rtu|thermostat/i, sym: /no heat|not heat|won'?t heat|cold|not work|broke|won'?t|fail|short cycl|noisy|loud/i, imp: 'repair', past: 'repaired',
    steps: 'Diagnosed the loss of heat, checked the thermostat, power supply and heating components, repaired the fault, and confirmed the unit heats to the setpoint.' }),
  S({ id: 'cooling', obj: /\bac\b|a\/c|air condition|cooling|hvac|rtu|condenser|split|compressor|chiller|thermostat/i, sym: /no cool|not cool|warm|hot|won'?t|not work|broke|ice|freez|fail|noisy|loud|leak/i, imp: 'repair', past: 'repaired',
    steps: 'Diagnosed the cooling issue, checked the thermostat, airflow, condensate drain and electrical components, repaired the fault, and confirmed the unit cools properly.' }),
  S({ id: 'hotwater', obj: /water heater|hot water/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Diagnosed the loss of hot water, checked the heating element or burner, thermostat and relief valve, repaired the fault, and confirmed hot water at the fixtures.' }),
  S({ id: 'fan', obj: /exhaust|fan|vent|blower/i, sym: /noisy|loud|not work|broke|won'?t|squeal|rattl|dirty|slow|stuck/i, imp: 'repair', past: 'repaired',
    steps: 'Cleaned the fan and housing, tightened or replaced the worn components, and confirmed quiet, proper airflow.' }),
  S({ id: 'hole', obj: /hole|drywall|sheetrock|wall|dent/i, sym: /hole|damag|crack|dent|broke|patch|gouge|punch/i, imp: 'patch', past: 'patched',
    steps: 'Cut out the damaged section, installed new drywall, taped, mudded and sanded the area smooth, then primed and painted to match.' }),
  S({ id: 'paint-peel', obj: /paint|wall|ceiling|trim|baseboard|door frame/i, sym: /peel|scuff|stain|chip|fade|bubble|flak|scratch|mark/i, imp: 'repaint', past: 'repainted',
    steps: 'Scraped away the loose paint, sanded and cleaned the surface, primed as needed, and applied matching paint for an even finish.' }),
  S({ id: 'floor', obj: /tile|floor|vct|carpet|flooring|grout/i, sym: /crack|loose|broke|lift|peel|stain|buckl|missing|chip|damag|trip/i, imp: 'repair', past: 'repaired',
    steps: 'Removed the damaged section, prepared the surface, installed new material, and confirmed the floor is level, secure and safe to walk on.' }),
  S({ id: 'window', obj: /window|glass|pane/i, sym: /crack|broke|shatter|stuck|won'?t|leak|fog|damag|loose/i, imp: 'repair', past: 'repaired',
    steps: 'Secured the area, removed any broken glass, repaired or replaced the damaged component, sealed the edges and confirmed proper operation.' }),
  S({ id: 'pothole', obj: /pothole|asphalt|pavement|parking lot/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Cleaned out the damaged area, filled it with cold patch asphalt, compacted it level with the surrounding pavement and cleaned up the debris.' }),
  S({ id: 'sidewalk', obj: /sidewalk|curb|concrete|walkway/i, sym: /crack|broke|trip|damag|chip|heav|settle/i, imp: 'repair', past: 'repaired',
    steps: 'Cleaned and prepared the damaged area, applied repair material to remove the trip hazard, and cleaned up the work area.' }),
  S({ id: 'fence', obj: /fence|railing|handrail|guardrail|bollard/i, sym: /loose|broke|damag|bent|fall|lean|wobbl|missing/i, imp: 'repair', past: 'repaired',
    steps: 'Re-anchored and tightened the loose components, replaced damaged hardware, and confirmed it is secure and stable.' }),
  S({ id: 'sign', obj: /\bsign\b|signage/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Re-secured the sign, repaired or replaced the damaged hardware or lighting, and confirmed it is secure and visible.' }),
  S({ id: 'mold', obj: /mold|mildew/i, sym: null, imp: 'remove', past: 'removed',
    steps: 'Cleaned and treated the affected area with an approved mold-inhibiting cleaner, identified and reported the moisture source, and left the surface clean and dry.' }),
  S({ id: 'smoke', obj: /smoke detector|smoke alarm|co detector|fire alarm|detector/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Replaced the battery or faulty unit, tested the alarm and confirmed it operates properly.' }),
  S({ id: 'blinds', obj: /blind|shade|curtain/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Repaired or replaced the damaged slats, cords and brackets, and confirmed the blinds raise, lower and tilt properly.' }),
  S({ id: 'cabinet', obj: /cabinet|shelf|drawer|counter|desk|chair|table|furniture/i, sym: /broke|loose|stuck|fall|crack|wobbl|damag|jam|off/i, imp: 'repair', past: 'repaired',
    steps: 'Tightened or replaced the loose hardware, repaired the damaged component, and confirmed it is secure and works properly.' }),
];

const OBJ_NAME = { heat: 'heating system', furnace: 'furnace', ac: 'AC unit', 'a/c': 'AC unit', cooling: 'cooling system', hvac: 'HVAC unit', rtu: 'rooftop unit',
  'hot water': 'water heater', condenser: 'condenser', compressor: 'compressor', thermostat: 'thermostat' };
const PREFIX_PLACES = /^(kitchen|bathroom|restroom|break ?room|lunch ?room|mens|men's|womens|women's|office)$/i;
const wordAround = (t, m) => { const re = /[\w'/-]+/g; let w; while ((w = re.exec(t))) if (m.index >= w.index && m.index < w.index + w[0].length) return w[0]; return m[0]; };

const clean = (s) => s.replace(/[.\s]+$/, '').replace(/\s+/g, ' ').trim();

// text -> {scenario, subject} or null
function matchScenario(text) {
  const t = clean(text || '');
  if (!t) return null;
  const sc = SCENARIOS.find((x) => x.obj.test(t) && (!x.sym || x.sym.test(t)));
  if (!sc) return null;

  // Split off a trailing "in/at/by ..." place, then build "<problem> <place> <object>".
  let body = t, suffix = '';
  const pm = PREP_TAIL.exec(t);
  if (pm && pm.index > 0) { suffix = `${pm[1].toLowerCase()} the ${clean(pm[2]).toLowerCase()}`; body = t.slice(0, pm.index).trim(); }
  const loc = LOCATIONS.exec(body);
  let place = '';
  if (loc && !suffix) {
    const w = loc[0].toLowerCase();
    body = clean(body.replace(loc[0], ' '));
    if (PREFIX_PLACES.test(w)) place = w; else suffix = `in the ${w}`;
  }

  const om = sc.obj.exec(body) || sc.obj.exec(t);
  let objWord = om ? (/\s/.test(om[0]) ? om[0] : wordAround(sc.obj.exec(body) ? body : t, om)).toLowerCase() : '';
  const rawObj = objWord;
  objWord = OBJ_NAME[rawObj] || objWord;
  let adj = '';
  if (sc.sym) {
    const sw = [...t.matchAll(new RegExp(sc.sym.source, 'gi'))].map((x) => x[0]).join(' ');
    const hit = ADJ.find(([re, label]) => label && re.test(sw));
    adj = hit ? hit[1] || '' : '';
  }
  // keep any other descriptive words the user typed (e.g. "loose", "kitchen", "ceiling")
  const rest = clean(body.replace(new RegExp(`\\b${rawObj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'), ' ')
    .replace(/\b(please|pls|fix|repair|replace|the|a|an|my|is|are|has|have|not|working|work|need|needs|to|and|of|problem|issue|request|worq|mts|vendor|third|party|needed|clogged|clog|un?clog\w*|leak\w*|drip\w*|broke\w*|crack\w*|stuck|jam\w*|out|no|won'?t|flush\w*|burn\w*|dead|dim|flicker\w*|stain\w*|peel\w*|cool\w*|heat\w*|warm|hot|run\w*)\b/gi, ' '));
  if (objWord === 'paint' && rest) objWord = '';
  const rest2 = adj === 'water-stained' ? clean(rest.replace(/\bwater\b/gi, ' ')) : rest;
  const parts = [adj, place, rest2, objWord].filter(Boolean);
  const seen = new Set();
  const subject = parts.join(' ').split(' ').filter((w) => (seen.has(w.toLowerCase()) ? false : seen.add(w.toLowerCase()))).join(' ') + (suffix ? ` ${suffix}` : '');
  return { scenario: sc, subject: clean(subject) };
}

module.exports = { matchScenario, SCENARIOS };
