// Free, on-device "what's the problem in this photo?" using zero-shot image classification (CLIP).
// Each entry: what the model is shown (phrase) and the work request it maps to (task).
export const PROBLEMS = [
  ['a leaking faucet', 'repair leaking faucet'],
  ['a leaking or dripping pipe', 'repair leaking pipe'],
  ['a clogged or overflowing toilet', 'repair toilet'],
  ['a clogged sink with standing water', 'unclog sink'],
  ['a water stained or damaged ceiling tile', 'replace damaged ceiling tile'],
  ['a roof with loose or missing shingles', 'repair loose shingles'],
  ['a broken door lock or door handle', 'repair door lock'],
  ['a damaged or broken door', 'repair door'],
  ['a broken or burned out light fixture', 'repair light fixture'],
  ['a hole in a wall', 'patch hole in wall'],
  ['peeling, stained or scuffed paint on a wall', 'paint wall'],
  ['a cracked or broken floor tile', 'repair floor tile'],
  ['a cracked or broken window', 'repair window'],
  ['a rooftop air conditioning unit', 'repair HVAC unit'],
  ['a ceiling mounted heater', 'repair ceiling heater'],
  ['a damaged electrical outlet or light switch', 'repair electrical outlet'],
  ['a broken desk or drawer lock', 'repair desk lock'],
  ['a damaged gutter or downspout', 'repair gutter'],
  ['a pothole or cracked asphalt in a parking lot', 'repair pavement'],
  ['a cracked or broken sidewalk or curb', 'repair sidewalk'],
  ['a damaged fence', 'repair fence'],
  ['a broken or damaged sign', 'repair sign'],
  ['mold or mildew on a wall or ceiling', 'remove mold'],
  ['a stained or dirty carpet', 'clean carpet'],
  ['a broken cabinet or shelf', 'repair cabinet'],
  ['a broken chair or desk', 'repair furniture'],
  ['a smoke detector or fire extinguisher', 'inspect fire safety equipment'],
  ['a broken exhaust fan or vent', 'repair exhaust fan'],
  ['broken window blinds', 'repair blinds'],
  ['a damaged handrail or railing', 'repair handrail'],
  ['a pile of trash or debris', 'remove debris'],
  ['an overgrown tree or branch', 'trim tree'],
  ['a water heater', 'repair water heater'],
  ['a damaged wall or baseboard', 'repair wall'],
  ['a water leak or puddle on the floor', 'repair water leak'],
  ['a scene or object unrelated to building repairs, such as a landscape, rocks, a person, an animal or an electronic gadget', null],
];

let clf;
export async function classify(dataUrl, onStatus = () => {}) {
  if (!clf) {
    onStatus('Loading photo recognition (first time only, ~90 MB)…');
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/+esm');
    clf = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
  }
  onStatus('Looking at the photo…');
  const out = await clf(dataUrl, PROBLEMS.map((p) => p[0]), { hypothesis_template: 'A close-up photo of {}.' });
  const task = new Map(PROBLEMS);
  const ranked = out.sort((a, b) => b.score - a.score);
  const guesses = ranked.filter((o) => task.get(o.label)).slice(0, 3).map((o) => ({ task: task.get(o.label), score: o.score }));
  // Only auto-fill when the model is clearly sure and the photo isn't "something unrelated".
  const confident = !!task.get(ranked[0].label) && ranked[0].score >= 0.6;
  return { guesses, confident };
}
