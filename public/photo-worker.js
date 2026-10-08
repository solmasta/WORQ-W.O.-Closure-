import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/+esm';

let clf;
self.onmessage = async (e) => {
  const { id, image, labels } = e.data;
  try {
    if (!clf) {
      self.postMessage({ id, status: 'loading' });
      clf = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' });
    }
    self.postMessage({ id, status: 'looking' });
    const out = await clf(image, labels, { hypothesis_template: 'A close-up photo of {}.' });
    self.postMessage({ id, out });
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
