'use strict';
// Problem-aware wording: matches "object + symptom" in any word order (e.g. "sink clogged kitchen")
// and returns the verb, subject and the steps a technician would realistically perform.

const LOCATIONS = /\b(exterior|interior|outdoor|indoor|kitchen|bathroom|restroom|break ?room|lunch ?room|lobby|office|hallway|vault|teller (?:line|area|station)|server room|it room|idf|mdf|data closet|storage room|stock room|conference room|basement|exterior|parking lot|loading dock|dock|mens|men's|womens|women's|roof|entrance|stairwell|atm)\b/i;
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
  S({ id: 'wallpack', obj: /wall ?packs?(?: lights?)?|(?:exterior|outdoor|parking lot|pole|security|flood|building) lights?|flood ?lights?|pole lights?/i, sym: null, imp: 'repair', past: 'repaired',
    steps: 'Used a lift to reach the fixtures, replaced the failed lamps, photocells or drivers, checked the wiring connections, and confirmed all lights come on at dusk and operate properly.' }),
  S({ id: 'light', obj: /light|lamp|bulb|ballast|fixture|led|exit sign|emergency light/i, sym: /out|burn|dead|flicker|not work|broke|dim|buzz|hum|won'?t/i, imp: 'replace', past: 'replaced',
    steps: 'Replaced the failed lamp, checked the ballast or driver and wiring connections, and confirmed the fixture is working properly.' }),
  S({ id: 'outlet', obj: /outlet|receptacle|switch|gfci|plug/i, sym: /dead|no power|not work|broke|spark|burn|loose|hot|trip|crack/i, imp: 'repair', past: 'repaired',
    steps: 'Shut off power, tested the circuit, replaced the faulty device, restored power and confirmed correct operation.' }),
  S({ id: 'lock', obj: /lock|key|deadbolt|latch|cylinder|handle|knob|padlock/i, sym: /broke|jam|stuck|won'?t|not work|loose|stiff|spin|fall|lost|crack|\bfix\b|\brepair\b/i, imp: 'repair', past: 'repaired',
    steps: 'Disassembled the lock, cleaned and lubricated the mechanism, replaced the worn components as needed, and tested with the key several times for smooth operation.' }),
  S({ id: 'door', obj: /door|gate/i, sym: /stick|close|latch|rub|sag|loose|hinge|drag|slam|align|hold|won'?t|not/i, imp: 'repair', past: 'repaired',
    steps: 'Adjusted and tightened the hinges, aligned the strike plate and latch, lubricated the moving parts and confirmed the door opens, closes and latches smoothly.' }),
  S({ id: 'excess-heat', obj: /heat|hot|temperature|warm|overheat/i, sym: /excessive|too hot|too warm|overheat|extreme|high temp|getting hot|very hot|hot in|warm in|running hot/i, imp: 'repair', past: 'repaired', fixedSubject: 'excessive heat',
    steps: 'Checked the cooling equipment, airflow, thermostat settings and ventilation, corrected the fault found, and monitored the space until temperatures returned to the normal range.' }),
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
const PREFIX_PLACES = /^(exterior|interior|outdoor|indoor|kitchen|bathroom|restroom|break ?room|lunch ?room|mens|men's|womens|women's|office)$/i;
const wordAround = (t, m) => { const re = /[\w'/-]+/g; let w; while ((w = re.exec(t))) if (m.index >= w.index && m.index < w.index + w[0].length) return w[0]; return m[0]; };

const EXTRA = {
  'toilet-clog': { found: 'Investigation found the drain line blocked, preventing proper flushing.' },
  'toilet-run': { found: 'Investigation found worn tank components causing the toilet to run continuously.' },
  'floor-drain': { found: 'Investigation found the floor drain obstructed with debris and buildup.' },
  disposal: { found: 'Investigation found the disposal jammed with debris.' },
  'sink-clog': { found: 'Investigation found a blockage in the drain line from buildup and debris.' },
  'faucet-leak': { found: 'Investigation found a worn washer or cartridge allowing water to leak.' },
  'pipe-leak': { found: 'Investigation traced the water loss to a leaking joint in the line.', invest: true },
  'tile-water': { found: 'Investigation found a water-damaged tile and traced the source of the moisture.', invest: true, crew: 1, access: 'Ladder required.' },
  'roof-leak': { found: 'Investigation found a damaged area on the roof allowing water to enter.', invest: true, crew: 2, access: 'Roof access required.' },
  shingles: { found: 'Inspection found shingles lifted or missing from wear and wind exposure.', crew: 2, access: 'Roof access required.' },
  gutter: { found: 'Inspection found the gutters and downspouts obstructed with leaves and debris.', crew: 2, access: 'Ladder required.' },
  wallpack: { found: 'Investigated each fixture and found failed lamps, photocells or driver components, and checked power at each fixture.', invest: true, crew: 2, access: 'Lift or ladder required.', cond: true },
  light: { found: 'Investigation found a failed lamp or driver preventing the fixture from working.', invest: true, cond: true },
  outlet: { found: 'Investigation found a faulty device with no reliable power at the outlet.', invest: true, cond: true },
  lock: { found: 'Investigation found worn internal components preventing the lock from operating smoothly.', invest: true },
  door: { found: 'Investigation found misaligned hinges and latch preventing the door from operating properly.', invest: true },
  'excess-heat': { found: 'Investigation found inadequate cooling and airflow contributing to the high temperatures.', invest: true, issues: true },
  heat: { found: 'Investigation found a fault in the heating system preventing proper operation.', invest: true, cond: true },
  cooling: { found: 'Investigation found a fault in the cooling system affecting proper operation.', invest: true, cond: true },
  hotwater: { found: 'Investigation found the water heater not heating properly.', invest: true },
  fan: { found: 'Investigation found a dirty or worn fan affecting airflow.', invest: true, cond: true },
  hole: { found: 'Inspection found damaged drywall that required repair.' },
  'paint-peel': { found: 'Inspection found loose and peeling paint requiring repair.' },
  floor: { found: 'Inspection found damaged flooring creating a safety concern.' },
  window: { found: 'Inspection found a damaged window component.', invest: true },
  pothole: { found: 'Inspection found a damaged area of pavement.', crew: 2 },
  sidewalk: { found: 'Inspection found a damaged section creating a trip hazard.' },
  fence: { found: 'Inspection found loose and damaged components.' },
  sign: { found: 'Inspection found the sign damaged or not operating.', invest: true, crew: 2, access: 'Lift or ladder required.' },
  mold: { found: 'Inspection found mold growth from excess moisture.' },
  smoke: { found: 'Inspection found the detector failing its test.' },
  blinds: { found: 'Inspection found damaged blind components.' },
  cabinet: { found: 'Inspection found loose or damaged components.' },
};
// What the work involves (for the WORQ request) and why it matters.
const SCOPE = {
  'toilet-clog': ['Clear the blockage, flush to confirm full flow, and check the base and supply line for leaks.', 'The fixture is out of service and cannot be used.'],
  'toilet-run': ['Inspect the tank, repair or replace the flapper and fill valve, and confirm the toilet shuts off properly.', 'Continuous running wastes water and raises utility costs.'],
  'floor-drain': ['Clear the obstruction, flush the line and confirm proper drainage.', 'The drain is backing up, which can cause standing water and odors.'],
  disposal: ['Free the jam, clear the debris and confirm the unit runs and drains properly.', 'The disposal is out of service.'],
  'sink-clog': ['Clear the blockage in the drain line, flush it, and confirm proper drainage with no leaks at the trap.', 'The sink is unusable until the drain is cleared.'],
  'faucet-leak': ['Replace the worn washer or cartridge, tighten the connections and confirm the leak is stopped.', 'The leak wastes water and can damage the cabinet or floor.'],
  'pipe-leak': ['Isolate the water supply, repair the leaking section and confirm no leaks remain.', 'Water loss can cause property damage and mold if not addressed.'],
  'tile-water': ['Remove the stained tile, locate and address the moisture source, and install a new tile.', 'The stained tile points to a moisture problem and looks unprofessional to customers.'],
  'roof-leak': ['Locate the point of water entry, repair and seal it, and inspect the surrounding roof.', 'Water is entering the building, which can damage the interior and lead to mold.'],
  shingles: ['Re-secure the loose shingles, replace any missing ones and seal the affected area.', 'Loose or missing shingles can allow water into the building.'],
  gutter: ['Remove the debris, flush the gutters and downspouts and confirm proper drainage.', 'Clogged gutters can overflow and damage the roof edge and foundation.'],
  wallpack: ['Investigate the cause (failed lamps, photocells or drivers), repair or replace the failed components and confirm the lights operate at dusk.', 'The exterior is not properly lit, which is a safety and security concern.'],
  light: ['Investigate the cause, replace the failed lamp or driver and confirm the fixture works.', 'The area is under-lit, which affects safety and visibility.'],
  outlet: ['Test the circuit, repair or replace the faulty device and confirm power is restored safely.', 'The outlet is unusable and may be a safety hazard.'],
  lock: ['Inspect the lock, clean and repair or replace the failed components, and test it with the key.', 'A lock that does not work properly affects security.'],
  door: ['Adjust or repair the hinges and latch, and confirm the door opens, closes and latches properly.', 'The door does not operate properly, which affects security and access.'],
  'excess-heat': ['Check the cooling equipment, airflow and thermostat settings, correct the cause and monitor the temperature.', 'Excess heat can damage equipment and make the space uncomfortable or unsafe.'],
  heat: ['Diagnose the heating fault, repair it and confirm the space reaches the setpoint.', 'Loss of heat affects comfort and can damage the building in cold weather.'],
  cooling: ['Diagnose the cooling fault, repair it and confirm the space cools to the setpoint.', 'Loss of cooling affects comfort and can damage equipment.'],
  hotwater: ['Diagnose the heating element or burner, repair it and confirm hot water at the fixtures.', 'There is no hot water for staff or customers.'],
  fan: ['Clean or repair the fan and confirm quiet, proper airflow.', 'Poor ventilation affects air quality and comfort.'],
  hole: ['Cut out the damaged section, install new drywall, tape, mud and sand it smooth, then prime and paint to match.', 'The damaged wall looks unprofessional and can get worse if left.'],
  'paint-peel': ['Scrape off the loose paint, sand and prime the surface, and repaint to match.', 'Peeling paint looks unprofessional and can expose the surface to moisture.'],
  floor: ['Remove the damaged section, prepare the surface and install new material so the floor is level and safe.', 'Damaged flooring is a trip hazard.'],
  window: ['Secure the area, remove any broken glass and repair or replace the damaged component.', 'The damaged window affects security and weather protection.'],
  pothole: ['Clean out the damaged pavement, fill it with asphalt patch and compact it level.', 'The pothole is a hazard to vehicles and pedestrians.'],
  sidewalk: ['Repair the damaged section to remove the trip hazard.', 'The damage is a trip hazard for customers and staff.'],
  fence: ['Re-anchor or replace the damaged components and confirm it is secure.', 'The damaged fence affects security and safety.'],
  sign: ['Repair or replace the damaged hardware or lighting and confirm the sign is secure and visible.', 'The sign is not visible to customers.'],
  mold: ['Clean and treat the affected area, then identify and report the moisture source.', 'Mold is a health concern and points to a moisture problem.'],
  smoke: ['Replace the battery or the detector and test the alarm.', 'A faulty detector is a life safety concern.'],
  blinds: ['Repair or replace the damaged slats, cords or brackets.', 'Damaged blinds affect privacy and appearance.'],
  cabinet: ['Tighten or replace the loose hardware and repair the damaged part.', 'The damaged unit is unsafe and cannot be used properly.'],
};
for (const sc of SCENARIOS) {
  Object.assign(sc, EXTRA[sc.id] || {});
  if (SCOPE[sc.id]) { sc.scope = SCOPE[sc.id][0]; sc.why = SCOPE[sc.id][1]; }
}

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
  if (pm && pm.index > 0) { suffix = `${pm[1].toLowerCase()} the ${clean(pm[2]).replace(/^the\s+/i, '')}`; body = t.slice(0, pm.index).trim(); }
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
  const parts = sc.fixedSubject ? [sc.fixedSubject] : [adj, place, rest2, objWord].filter(Boolean);
  const seen = new Set();
  const core = parts.join(' ').split(' ').filter((w) => (seen.has(w.toLowerCase()) ? false : seen.add(w.toLowerCase()))).join(' ');
  const subject = core + (suffix ? ` ${suffix}` : '');
  const broken = /not work|not heat|not cool|no heat|no cool|won'?t work|inoperab|\bout\b|\bdead\b|burn|no power|stopped working/i.test(t);
  return { scenario: sc, subject: clean(subject), core: clean(core), suffix, place, plural: /s$/i.test(objWord), broken };
}

const hasLocation = (text) => LOCATIONS.test(text || '');

module.exports = { matchScenario, SCENARIOS, hasLocation };
