// The six starter universes from the AdVerse brand kit (p.05). Each one is a scene rule that
// goes into the image prompt. The universe colour frames the card; it is never printed into the image.

export type UniverseId = 'luxe' | 'neon' | 'wild' | 'pulse' | 'glow' | 'cozy' | 'custom';

export type Universe = {
  id: UniverseId;
  name: string;
  color: string;
  mood: { en: string; tr: string };
  scene: string; // English: image models follow English best
  fits: string[]; // product categories (for the Director's template fallback)
};

export const UNIVERSES: Universe[] = [
  {
    id: 'luxe', name: 'Luxe', color: '#E8C27A',
    mood: { en: 'luxury, calm, exclusive', tr: 'lüks, sakin, seçkin' },
    scene: 'marble and satin surfaces, a single spotlight, generous negative space, product centered, refined and quiet luxury mood',
    fits: ['perfume', 'watch', 'cosmetics'],
  },
  {
    id: 'neon', name: 'Neon', color: '#3DE3FF',
    mood: { en: 'Gen-Z, gaming, night', tr: 'Gen-Z, oyun, gece' },
    scene: 'neon rim light, RGB gaming setup at night, dynamic angle, energetic tech atmosphere',
    fits: ['drink', 'tech', 'accessory'],
  },
  {
    id: 'wild', name: 'Wild', color: '#5FD38D',
    mood: { en: 'natural, simple, organic', tr: 'doğal, sade, organik' },
    scene: 'daylight, plants, natural stone and wood, soft shadows, calm tones, product on a natural surface',
    fits: ['skincare', 'food', 'home'],
  },
  {
    id: 'pulse', name: 'Pulse', color: '#FF8A3D',
    mood: { en: 'sport, energy, performance', tr: 'spor, enerji, performans' },
    scene: 'sunset light, motion blur, high contrast, active sporty lifestyle energy',
    fits: ['drink', 'sport', 'apparel'],
  },
  {
    id: 'glow', name: 'Glow', color: '#FF6FB5',
    mood: { en: 'beauty, fun, social', tr: 'güzellik, eğlence, sosyal' },
    scene: 'pastel background, glossy surfaces, ring light, authentic social-media UGC feel',
    fits: ['makeup', 'fashion', 'jewelry'],
  },
  {
    id: 'cozy', name: 'Cozy', color: '#E9DCC7',
    mood: { en: 'home, family, warmth', tr: 'ev, aile, sıcaklık' },
    scene: 'morning light, linen, kitchen counter, warm tones, product in an everyday moment of use',
    fits: ['home', 'food', 'baby'],
  },
];

export const CUSTOM_COLOR = '#B48CFF';

export function universe(id: UniverseId): Universe {
  return (
    UNIVERSES.find((u) => u.id === id) ?? {
      id: 'custom', name: 'Custom', color: CUSTOM_COLOR,
      mood: { en: 'your idea', tr: 'senin fikrin' }, scene: '', fits: [],
    }
  );
}

// Brand kit "universe rules (every generation)".
export const RULES =
  'Keep the product exactly as in the photo: same packaging, shape, colors, logo and label text. ' +
  'Do not add any text, letters, claims, badges or logos. Do not add health, performance or price claims. ' +
  'Photorealistic commercial advertising photograph, the product is the hero and sharply in focus, vertical 9:16 composition.';

// Editable by the user before sending (shown in the app); the product-protection rules are always appended.
export const DEFAULT_MOTION =
  'Slow cinematic camera push-in around the product, gentle light movement in the scene, smooth premium commercial motion.';
export const VIDEO_RULES = 'The product packaging, logo and label stay exactly the same. No text appears.';

export function imagePrompt(scene: string): string {
  return `Place this exact product into a new advertising scene: ${scene}. ${RULES}`;
}

export function crossoverPrompt(scene: string): string {
  return (
    `Create an advertising photo of the person from the second image holding and presenting the product from the first image, in this scene: ${scene}. ` +
    `Keep the person's face and identity exactly as in their photo. ${RULES}`
  );
}
