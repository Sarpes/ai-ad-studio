// POST /api/director: builds the 3 ad ideas the user sees in "Check the ideas" (human in the loop).
// Nothing is charged here. The LLM writes headline + caption in the chosen language; the image
// scene stays English. If the LLM fails, a template fallback produces the same shape.
import { z } from 'zod';

import { llm } from '@/server/fal';
import { BadRequest, fail, parse } from '@/server/http';
import { UNIVERSES, universe, type UniverseId } from '@/lib/universes';

const Body = z.object({
  lang: z.enum(['en', 'tr']),
  mode: z.enum(['director', 'choose', 'idea']),
  picks: z.array(z.enum(['luxe', 'neon', 'wild', 'pulse', 'glow', 'cozy'])).optional(),
  idea: z.string().max(300).optional(),
  product: z.string().max(120).optional(), // short description the user typed, optional
  crossover: z.boolean().default(false),
  count: z.number().int().min(1).max(3).default(3), // how many universes (1-3)
});

export type Idea = { universe: UniverseId; scene: string; headline: string; caption: string };

function pickUniverses(mode: string, count: number, picks?: string[]): UniverseId[] {
  if (mode === 'choose') {
    if (!picks || picks.length < 1 || picks.length > 3) throw new BadRequest('Pick 1 to 3 universes.');
    return picks as UniverseId[];
  }
  return (['luxe', 'neon', 'wild'] as UniverseId[]).slice(0, count); // default; the LLM may replace them
}

function template(u: UniverseId, lang: 'en' | 'tr', product: string, idea?: string): Idea {
  const uni = universe(u);
  const p = product || (lang === 'tr' ? 'Ürünün' : 'Your product');
  const head = {
    luxe: { en: 'Quiet luxury.', tr: 'Sessiz lüks.' },
    neon: { en: 'Level up your night.', tr: 'Gecene seviye atlat.' },
    wild: { en: 'Simply natural.', tr: 'Sadece doğal.' },
    pulse: { en: 'Keep moving.', tr: 'Hareketi bırakma.' },
    glow: { en: 'Your daily glow.', tr: 'Her günün ışıltısı.' },
    cozy: { en: 'Made for home.', tr: 'Ev için yapıldı.' },
    custom: { en: 'Your idea, made real.', tr: 'Fikrin, gerçek oldu.' },
  }[u][lang];
  return {
    universe: u,
    scene: u === 'custom' ? (idea ?? '') : uni.scene,
    headline: head,
    caption: lang === 'tr' ? `${p}, ${uni.mood.tr} bir evrende.` : `${p}, in a ${uni.mood.en} universe.`,
  };
}

const SYSTEM = `You are the creative Director of AdVerse, a tool that turns one product photo into ads for different audiences ("universes").
Rules: never invent health, performance, price or ingredient claims. Describe audiences by lifestyle, never by demographics.
Headlines: max 6 words. Captions: one sentence, max 18 words. Return ONLY JSON, no prose.`;

export async function POST(req: Request) {
  try {
    const b = await parse(req, Body);
    if (b.mode === 'idea' && (b.idea ?? '').trim().length < 3) throw new BadRequest('Write your idea first.');
    if (b.crossover) {
      return Response.json({ ideas: [template('glow', b.lang, b.product ?? '')], source: 'template' });
    }

    let slots = pickUniverses(b.mode, b.count, b.picks);
    const n = slots.length;
    const langName = b.lang === 'tr' ? 'Turkish' : 'English';
    const catalog = UNIVERSES.map((u) => `${u.id}: ${u.mood.en}; scene: ${u.scene}`).join('\n');
    const ask =
      `Universes:\n${catalog}\n\nProduct: ${b.product || 'unknown, judge from typical small-brand products'}.\n` +
      (b.mode === 'director'
        ? `Choose the ${n} universe(s) that fit this product best.`
        : b.mode === 'choose'
          ? `Use exactly these universes in this order: ${slots.join(', ')}.`
          : `Slot 1 is a custom universe built from the user's idea: "${b.idea}".` +
            (n > 1 ? ` Choose ${n - 1} more universe(s) that fit.` : '')) +
      `\nReturn JSON: {"ideas":[{"universe":"<id or custom>","scene":"<English scene description, 1 sentence, visual only, no text in image>","headline":"<${langName}>","caption":"<${langName}>"}]} with exactly ${n} item(s).`;

    try {
      const raw = await llm(SYSTEM, ask);
      const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      const ideas = (json.ideas as Idea[]).slice(0, n).map((i, k) => {
        const id = (['luxe', 'neon', 'wild', 'pulse', 'glow', 'cozy', 'custom'].includes(i.universe)
          ? i.universe
          : slots[k]) as UniverseId;
        const scene = id === 'custom' ? `${b.idea}. ${i.scene ?? ''}` : `${universe(id).scene}. ${i.scene ?? ''}`;
        return { universe: id, scene, headline: String(i.headline ?? ''), caption: String(i.caption ?? '') };
      });
      if (ideas.length !== n) throw new Error('LLM returned wrong count');
      return Response.json({ ideas, source: 'director' });
    } catch (e) {
      console.warn('[director] LLM fallback:', (e as Error).message);
      if (b.mode === 'idea') slots = (['custom', 'luxe', 'neon'] as UniverseId[]).slice(0, n);
      const ideas = slots.map((u) => template(u, b.lang, b.product ?? '', b.idea));
      return Response.json({ ideas, source: 'template' });
    }
  } catch (e) {
    return fail(e);
  }
}
