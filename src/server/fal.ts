// All fal.ai calls. FAL_KEY is read here only (server side).
import { fal } from '@fal-ai/client';
import sharp from 'sharp';

export const IMAGE_MODEL = process.env.FAL_IMAGE_MODEL ?? 'fal-ai/nano-banana/edit';
export const VIDEO_MODEL = process.env.FAL_VIDEO_MODEL ?? 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video';
export const LLM_MODEL = 'fal-ai/any-llm';

// Cost guard: no identity check on the venue Wi-Fi beyond the login name, so cap total spend per run.
const MAX_JOBS = Number(process.env.FAL_MAX_JOBS ?? 120);
let jobs = 0;

export function ensureFal() {
  if (!process.env.FAL_KEY) throw new Error('Server is missing FAL_KEY.');
  fal.config({ credentials: process.env.FAL_KEY });
  if (jobs >= MAX_JOBS) throw new Error('Demo limit reached on this server.');
  jobs++;
}

export function decodeB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function upload(bytes: Uint8Array, mime: string): Promise<string> {
  return fal.storage.upload(new Blob([bytes as BlobPart], { type: mime }));
}

// nano-banana sometimes answers with text instead of an image ("no_media_generated", 422).
// Measured 2026-11-07 smoke run: 4 of 6 calls failed this way on fal's sample photo. One retry.
export async function editImage(prompt: string, imageUrls: string[], attempts = 2): Promise<string> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      ensureFal();
      const r = await fal.subscribe(IMAGE_MODEL, {
        input: { prompt, image_urls: imageUrls, num_images: 1, output_format: 'jpeg', aspect_ratio: '9:16' },
      });
      const url = (r.data as { images?: { url: string }[] })?.images?.[0]?.url;
      if (url) return url;
      last = new Error('No image returned');
    } catch (e) {
      last = e;
      if ((e as Error).message?.includes('Demo limit')) break;
    }
  }
  throw last;
}

export async function makeVideo(imageUrl: string, prompt: string, seconds: '5' | '10'): Promise<string> {
  ensureFal();
  const r = await fal.subscribe(VIDEO_MODEL, {
    input: { image_url: imageUrl, prompt, duration: seconds },
  });
  const url = (r.data as { video?: { url: string } })?.video?.url;
  if (!url) throw new Error('No video returned');
  return url;
}

export async function llm(system: string, prompt: string): Promise<string> {
  ensureFal();
  const r = await fal.subscribe(LLM_MODEL, {
    input: { model: 'google/gemini-2.5-flash', system_prompt: system, prompt, temperature: 0.8 },
  });
  return (r.data as { output?: string })?.output ?? '';
}

/** Free tier: downscale to standard quality and stamp "Made with AdVerse" bottom-right at 60%. */
export async function watermark(url: string): Promise<string> {
  const src = Buffer.from(await (await fetch(url)).arrayBuffer());
  const resized = await sharp(src).resize({ width: 720, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width, height } = resized.info;
  const base = sharp(resized.data);
  const fontSize = Math.round(width * 0.035);
  const pad = Math.round(width * 0.03);
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - pad}" y="${height - pad}" text-anchor="end" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="${fontSize}" fill="#FFFFFF" fill-opacity="0.6"
        stroke="#000000" stroke-opacity="0.25" stroke-width="1">Made with AdVerse</text>
    </svg>`,
  );
  const out = await base.composite([{ input: svg }]).jpeg({ quality: 80 }).toBuffer();
  return upload(new Uint8Array(out), 'image/jpeg');
}
