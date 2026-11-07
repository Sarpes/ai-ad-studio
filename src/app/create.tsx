// Main flow (plan p.04 journey + brand kit p.04 copy):
// 1 product (+ optional Crossover person, consent) -> 2 mode -> 3 check the ideas (human in the loop)
// -> Open Multiverse (3 images) -> save / before-after / make it move (video, paid tiers).
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BeforeAfter, Button, Chip, Header, s, Section } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { pickPhoto, saveMedia, type Photo } from '@/lib/media';
import { api, ApiError, logout, refresh, useSession } from '@/lib/session';
import { C, F } from '@/lib/theme';
import { universe, UNIVERSES, type UniverseId } from '@/lib/universes';

type Mode = 'director' | 'choose' | 'idea';
type Idea = { universe: UniverseId; scene: string; headline: string; caption: string };
type Card = { universe: string; headline: string; caption: string; url: string | null; watermarked: boolean };
type Step = 'compose' | 'preview' | 'running' | 'results';

export default function Create() {
  const { t, lang } = useT();
  const ses = useSession();
  const [step, setStep] = useState<Step>('compose');
  const [product, setProduct] = useState<Photo | null>(null);
  const [what, setWhat] = useState('');
  const [crossover, setCrossover] = useState(false);
  const [person, setPerson] = useState<Photo | null>(null);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<Mode>('director');
  const [picks, setPicks] = useState<UniverseId[]>([]);
  const [idea, setIdea] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState(0);
  const [compare, setCompare] = useState(false);
  const [video, setVideo] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState<'short' | 'premium' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!ses.userId) router.replace('/');
  }, [ses.userId]);

  function explain(e: unknown) {
    const a = e instanceof ApiError ? e : new ApiError('glitch', String(e), 0);
    if (a.code === 'out_of_credits') {
      if (a.reason === 'video-locked') return setErr(t.videoLocked);
      if (a.reason === 'premium-locked') return setErr(t.premiumLocked);
      setErr(t.outOfCredits);
      router.push('/paywall');
      return;
    }
    if (a.code === 'network') return setErr(t.network);
    if (a.reason === 'consent required') return setErr(t.needsConsent);
    setErr(t.glitch);
  }

  async function choose(set: (p: Photo | null) => void) {
    setErr(null);
    try {
      const p = await pickPhoto();
      if (p) set(p);
    } catch {
      setErr(t.badFile);
    }
  }

  async function showIdeas() {
    setErr(null);
    if (!product) return setErr(t.needsPhoto);
    if (crossover && (!person || !consent)) return setErr(!person ? t.crossoverHint : t.needsConsent);
    if (!crossover && mode === 'choose' && picks.length !== 3) return setErr(t.needsThree);
    if (!crossover && mode === 'idea' && idea.trim().length < 3) return setErr(t.needsIdea);
    setBusy(true);
    try {
      const r = await api<{ ideas: Idea[] }>('/api/director', {
        mode, picks: mode === 'choose' ? picks : undefined, idea, product: what, crossover,
      });
      setIdeas(r.ideas);
      setStep('preview');
    } catch (e) {
      explain(e);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setErr(null);
    setStep('running');
    setVideo(null);
    setCompare(false);
    try {
      const r = crossover
        ? await api<{ cards: Card[] }>('/api/crossover', {
            product: { b64: product!.b64, mime: product!.mime },
            person: { b64: person!.b64, mime: person!.mime },
            consent, scene: ideas[0].scene, headline: ideas[0].headline, caption: ideas[0].caption,
          })
        : await api<{ cards: Card[] }>('/api/multiverse', { photo: { b64: product!.b64, mime: product!.mime }, ideas });
      setCards(r.cards);
      setSelected(Math.max(0, r.cards.findIndex((c) => c.url)));
      setStep('results');
      if (r.cards.every((c) => !c.url)) setErr(t.glitch);
    } catch (e) {
      setStep('preview');
      explain(e);
    } finally {
      refresh().catch(() => {});
    }
  }

  async function makeVideo(length: 'short' | 'premium') {
    const c = cards[selected];
    if (!c?.url) return;
    setErr(null);
    setVideoBusy(length);
    try {
      const r = await api<{ url: string }>('/api/video', { imageUrl: c.url, length, universe: c.universe, headline: c.headline });
      setVideo(r.url);
    } catch (e) {
      explain(e);
    } finally {
      setVideoBusy(null);
      refresh().catch(() => {});
    }
  }

  async function save(url: string, kind: 'image' | 'video') {
    const r = await saveMedia(url, kind);
    setNote(r === 'saved' ? t.saved : t.openedSave);
  }

  const cost = crossover ? t.costCrossover : t.costMultiverse;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.void }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 56, maxWidth: 620, width: '100%', alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled">
        <Header />

        {step === 'compose' && (
          <>
            <Section title={t.uploadTitle} hint={t.uploadHint}>
              <Pressable onPress={() => choose(setProduct)} style={drop} accessibilityRole="button">
                {product ? <Image source={{ uri: product.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  : <Text style={s.hint}>+</Text>}
              </Pressable>
              <TextInput value={what} onChangeText={setWhat} placeholder={lang === 'tr' ? 'Ne bu? (ör. enerji içeceği)' : 'What is it? (e.g. energy drink)'}
                placeholderTextColor={C.dust} style={input} maxLength={120} />
            </Section>

            <Section title={t.crossoverTitle} hint={t.crossoverHint}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <Chip label={t.startCrossover} on={crossover} onPress={() => setCrossover(!crossover)} color={universe('glow').color} />
              </View>
              {crossover && (
                <>
                  <Pressable onPress={() => choose(setPerson)} style={[drop, { height: 160 }]} accessibilityRole="button">
                    {person ? <Image source={{ uri: person.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                      : <Text style={s.hint}>+</Text>}
                  </Pressable>
                  <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10 }}
                    accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
                    <View style={[box, consent && { backgroundColor: C.lilac, borderColor: C.lilac }]} />
                    <Text style={[s.body, { flex: 1 }]}>{t.crossoverConsent}</Text>
                  </Pressable>
                </>
              )}
            </Section>

            {!crossover && (
              <Section title={t.modeTitle}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip label={t.modeDirector} on={mode === 'director'} onPress={() => setMode('director')} />
                  <Chip label={t.modeChoose} on={mode === 'choose'} onPress={() => setMode('choose')} />
                  <Chip label={t.modeIdea} on={mode === 'idea'} onPress={() => setMode('idea')} />
                </View>
                {mode === 'choose' && (
                  <>
                    <Text style={[s.mono, { marginTop: 14, marginBottom: 8 }]}>{t.pickCount(picks.length).toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {UNIVERSES.map((u) => (
                        <Chip key={u.id} label={u.name} color={u.color} on={picks.includes(u.id)}
                          onPress={() => setPicks(picks.includes(u.id) ? picks.filter((p) => p !== u.id)
                            : picks.length < 3 ? [...picks, u.id] : picks)} />
                      ))}
                    </View>
                  </>
                )}
                {mode === 'idea' && (
                  <TextInput value={idea} onChangeText={setIdea} placeholder={t.ideaPlaceholder} placeholderTextColor={C.dust}
                    style={[input, { marginTop: 12 }]} maxLength={300} multiline />
                )}
              </Section>
            )}

            <Button label={t.previewCta} onPress={showIdeas} busy={busy} />
            <Text style={[s.mono, { textAlign: 'center', marginTop: 10 }]}>{ses.tier === 'free' ? t.watermarkNote.toUpperCase() : ''}</Text>
          </>
        )}

        {step === 'preview' && (
          <>
            <Text style={s.h1}>{t.previewTitle}</Text>
            <Text style={[s.hint, { marginTop: 8, marginBottom: 16 }]}>{t.previewHint}</Text>
            {ideas.map((i, k) => (
              <View key={k} style={[s.card, { marginBottom: 12, borderColor: universe(i.universe).color }]}>
                <Text style={[s.mono, { color: universe(i.universe).color, marginBottom: 8 }]}>
                  {universe(i.universe).name.toUpperCase()} · 9:16
                </Text>
                <Text style={s.mono}>{t.headline.toUpperCase()}</Text>
                <TextInput value={i.headline} onChangeText={(v) => setIdeas(ideas.map((x, j) => (j === k ? { ...x, headline: v } : x)))}
                  style={[input, { fontFamily: F.heading, marginBottom: 8 }]} maxLength={80} />
                <Text style={s.mono}>{t.caption.toUpperCase()}</Text>
                <TextInput value={i.caption} onChangeText={(v) => setIdeas(ideas.map((x, j) => (j === k ? { ...x, caption: v } : x)))}
                  style={[input, { minHeight: 76 }]} maxLength={240} multiline />
              </View>
            ))}
            <Button label={`${crossover ? t.startCrossover : t.openMultiverse} · ${cost}`} onPress={generate} />
            <Button label={t.back} kind="ghost" onPress={() => setStep('compose')} style={{ marginTop: 10 }} />
          </>
        )}

        {step === 'running' && (
          <View style={{ paddingVertical: 80, alignItems: 'center' }}>
            <Text style={[s.h1, { textAlign: 'center' }]}>{t.loading}</Text>
            <Text style={[s.mono, { marginTop: 14 }]}>{ideas.map((i) => universe(i.universe).name.toUpperCase()).join('  ·  ')}</Text>
          </View>
        )}

        {step === 'results' && (
          <>
            <Text style={[s.h2, { fontSize: 20, lineHeight: 26 }]}>{crossover ? t.startCrossover : t.resultTitle}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 10 }}>
              {cards.map((c, k) => (
                <Pressable key={k} onPress={() => { setSelected(k); setCompare(false); }}
                  style={[thumb, { borderColor: universe(c.universe as UniverseId).color, borderWidth: selected === k ? 3 : 1 }]}>
                  <Text style={[s.mono, { color: universe(c.universe as UniverseId).color, margin: 6 }]}>
                    {universe(c.universe as UniverseId).name.toUpperCase()}
                  </Text>
                  {c.url ? <Image source={{ uri: c.url }} style={{ flex: 1, borderRadius: 10 }} resizeMode="cover" />
                    : <Text style={[s.hint, { padding: 8 }]}>{t.glitch}</Text>}
                </Pressable>
              ))}
            </ScrollView>

            {cards[selected]?.url && (
              <>
                {compare && product ? (
                  <BeforeAfter before={product.uri} after={cards[selected].url!} height={520} />
                ) : (
                  <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: universe(cards[selected].universe as UniverseId).color }}>
                    <Image source={{ uri: cards[selected].url! }} style={{ width: '100%', aspectRatio: 9 / 16 }} resizeMode="cover" />
                    <View style={overlay}>
                      <Text style={{ fontFamily: F.display, color: C.star, fontSize: 22, lineHeight: 28 }}>{cards[selected].headline}</Text>
                      <Text style={[s.body, { marginTop: 4 }]}>{cards[selected].caption}</Text>
                    </View>
                  </View>
                )}
                <Text style={[s.hint, { color: C.lilac, marginTop: 10 }]}>{t.checkLabel}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <Button label={t.save} kind="secondary" onPress={() => save(cards[selected].url!, 'image')} style={{ flex: 1 }} />
                  <Button label={t.beforeAfter} kind="ghost" onPress={() => setCompare(!compare)} style={{ flex: 1 }} />
                </View>

                <Section title={t.makeMove}>
                  <Button label={t.videoShort} kind="secondary" busy={videoBusy === 'short'} disabled={videoBusy !== null}
                    onPress={() => makeVideo('short')} style={{ marginBottom: 8 }} />
                  <Button label={t.videoPremium} kind="secondary" busy={videoBusy === 'premium'} disabled={videoBusy !== null}
                    onPress={() => makeVideo('premium')} />
                  {videoBusy && <Text style={[s.hint, { marginTop: 10 }]}>{t.videoWait}</Text>}
                  {video && (
                    <View style={{ marginTop: 12 }}>
                      <Clip url={video} />
                      <Button label={t.save} kind="ghost" onPress={() => save(video, 'video')} style={{ marginTop: 8 }} />
                    </View>
                  )}
                </Section>
              </>
            )}
            <Button label={t.newRun} onPress={() => { setStep('compose'); setCards([]); setVideo(null); }} />
          </>
        )}

        {err && <Text style={s.error}>{err}</Text>}
        {note && <Text style={[s.hint, { marginTop: 8 }]}>{note}</Text>}

        <View style={{ marginTop: 36 }}>
          <Text style={s.h2}>{t.recent}</Text>
          {ses.history.length === 0 ? (
            <Text style={s.hint}>{t.empty}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {ses.history.map((h, k) => (
                <View key={k} style={[thumb, { width: 150, height: 267, borderColor: universe(h.universe as UniverseId).color }]}>
                  {h.kind === 'video' ? <Clip url={h.url} small /> : (
                    <Pressable style={{ flex: 1 }} onPress={() => save(h.url, 'image')}>
                      <Image source={{ uri: h.url }} style={{ flex: 1, borderRadius: 10 }} resizeMode="cover" />
                    </Pressable>
                  )}
                  <Text style={[s.mono, { margin: 6 }]}>{h.kind === 'video' ? 'VIDEO · ' : ''}{universe(h.universe as UniverseId).name.toUpperCase()}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <Button label={t.logout} kind="ghost" onPress={() => { logout(); router.replace('/'); }} style={{ marginTop: 28 }} />
        <Text style={[s.mono, { textAlign: 'center', marginTop: 14 }]}>{(ses.userId ?? '').toUpperCase()} · {t.poweredBy.toUpperCase()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Clip({ url, small }: { url: string; small?: boolean }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView player={player} style={small ? { flex: 1, borderRadius: 10 } : { width: '100%', aspectRatio: 9 / 16, borderRadius: 20 }}
      nativeControls={!small} contentFit="cover" />
  );
}

const drop = {
  height: 220, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed' as const, borderColor: C.line,
  backgroundColor: C.deep, alignItems: 'center' as const, justifyContent: 'center' as const, overflow: 'hidden' as const,
};
const input = {
  fontFamily: F.body, fontSize: 15, color: C.star, backgroundColor: C.deep, borderColor: C.line, borderWidth: 1,
  borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 10,
};
const box = { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.dust };
const thumb = { width: 120, height: 214, borderRadius: 14, backgroundColor: C.deep, padding: 4 };
const overlay = {
  position: 'absolute' as const, left: 0, right: 0, bottom: 0, padding: 16,
  backgroundColor: 'rgba(18,11,31,0.72)',
};
