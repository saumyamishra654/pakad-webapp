/**
 * Guide Page
 * Plain-language explanation of the ideas behind each tool, for readers new to ragas or harmony
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { NotePatternBadges } from '../components/common/NoteBadge.jsx';
import { pitchClassesToPattern } from '../utils/noteHelpers.js';
import { THAATS } from '../data/progressionTemplates.js';

const SECTIONS = [
    { id: 'why', title: 'Why this exists' },
    { id: 'sa', title: 'Sa and the twelve notes' },
    { id: 'raga', title: 'What a raga is' },
    { id: 'chords', title: 'Chords from a raga' },
    { id: 'progressions', title: 'Hearing and keeping it' },
    { id: 'western', title: 'Borrowing Western harmony' },
    { id: 'query', title: 'Finding ragas by their notes' },
    { id: 'insights', title: 'How ragas relate' },
    { id: 'limits', title: 'What to keep in mind' }
];

// Bhupali and the four ragas you get by treating each of its other notes as Sa
const BHUPALI_FAMILY = [
    { name: 'Bhupali', from: 'its own Sa', pcs: [0, 2, 4, 7, 9] },
    { name: 'Megh', from: 'Re', pcs: [0, 2, 5, 7, 10] },
    { name: 'Malkauns', from: 'Ga', pcs: [0, 3, 5, 8, 10] },
    { name: 'Durga', from: 'Pa', pcs: [0, 2, 5, 7, 9] },
    { name: 'Dhani', from: 'Dha', pcs: [0, 3, 5, 7, 10] }
];

function Section({ id, title, children, to, toLabel }) {
    return (
        <section id={id} className="scroll-mt-20 border-t border-gray-800 pt-8 mt-10">
            <h2 className="text-2xl font-semibold text-gray-100 mb-4">{title}</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">{children}</div>
            {to && (
                <Link to={to} className="btn btn-sm btn-secondary mt-5 inline-flex">
                    {toLabel}
                </Link>
            )}
        </section>
    );
}

function Example({ label, pcs, caption }) {
    return (
        <figure className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
            <figcaption className="text-sm font-medium text-gray-200 mb-2">
                {label}
                {caption && <span className="ml-2 font-normal text-gray-400">{caption}</span>}
            </figcaption>
            <NotePatternBadges pattern={pitchClassesToPattern(pcs)} size="sm" />
        </figure>
    );
}

const Term = ({ children }) => <em className="not-italic font-medium text-gray-100">{children}</em>;

export function Guide() {
    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-gray-200">
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-100">How Samvad works</h1>
                <p className="mt-2 text-gray-400">
                    The ideas behind each tool, for anyone new to ragas, to harmony, or to both.
                </p>
            </header>

            <nav aria-label="On this page" className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-5 mb-10">
                <h2 className="text-xs font-sans font-medium uppercase tracking-wide text-gray-400 mb-3">On this page</h2>
                <ol className="sm:columns-2 gap-x-6 space-y-1.5 text-sm list-decimal list-inside text-gray-400">
                    {SECTIONS.map(s => (
                        <li key={s.id}>
                            <a href={`#${s.id}`} onClick={e => {
                                // HashRouter owns the URL hash, so scroll instead of navigating
                                e.preventDefault();
                                document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
                            }} className="text-gray-300 hover:text-gray-100 underline-offset-2 hover:underline">
                                {s.title}
                            </a>
                        </li>
                    ))}
                </ol>
            </nav>

            <Section id="why" title="Why this exists">
                <p>
                    Indian classical music is built on melody. A singer or instrumentalist unfolds a raga
                    over a steady drone, and the beauty lies in which notes are chosen and how the music
                    moves between them. There are no chord changes in the traditional sense.
                </p>
                <p>
                    Much of the world's other music, including pop, jazz, film scores and most Western
                    classical music, is organised around <Term>harmony</Term>: several notes sounding at
                    once, as chords, moving from one to the next. When the two meet, as they do in fusion,
                    film music, or a band backing a raga-based melody, a practical question comes up:
                    <strong className="text-gray-100"> which chords can sit under a raga without breaking it?</strong>
                </p>
                <p>
                    Samvad means dialogue. The app takes the rules a raga lays down about its notes and
                    turns them into chords that respect those rules, then borrows some of Western
                    harmony's ideas about how chords move. The aim is not to replace the raga, but to
                    give anyone writing harmony for it a map of where they can safely go.
                </p>
            </Section>

            <Section id="sa" title="Sa and the twelve notes">
                <p>
                    Everything in a raga is measured from one note, <Term>Sa</Term>. Sa is not a fixed
                    pitch: each performer chooses where their Sa sits, the way a singer picks a comfortable
                    key. What matters is the distance of every other note from Sa. This is why the Chord
                    Tool lets you pick a <Term>Tonic</Term>: changing it moves the sound up or down, but
                    nothing about the relationships changes.
                </p>
                <p>
                    Between Sa and the Sa an octave above there are twelve positions, the same twelve keys
                    as on a piano. Seven note names cover them: Sa, Re, Ga, Ma, Pa, Dha, Ni. Sa and Pa
                    never change. Re, Ga, Dha and Ni also come in a lowered (<Term>komal</Term>) form, and
                    Ma comes in a raised (<Term>tivra</Term>) form. That gives the twelve.
                </p>
                <Example label="All twelve positions" pcs={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} />
                <p>
                    In performance a <Term>tanpura</Term> drones Sa and Pa underneath everything, so every
                    note is heard against home. The Chord Tool has a tanpura for the same reason: chords
                    and phrases only make sense in relation to Sa, and the drone keeps it in your ear.
                </p>
            </Section>

            <Section id="raga" title="What a raga is" to="/query" toLabel="Browse ragas in Raga Query">
                <p>
                    A raga chooses some of the twelve notes, usually five, six or seven, and then says how
                    to use them. Here is Yaman, a seven-note raga that uses the raised Ma:
                </p>
                <Example label="Yaman" pcs={[0, 2, 4, 6, 7, 9, 11]} />
                <p>
                    The way up and the way down can differ. The ascent (<Term>aaroh</Term>) may skip notes
                    or use a different version of a note from the descent (<Term>avroh</Term>). Alhaiya
                    Bilawal, for example, leaves out Ma going up but uses it coming down, along with a
                    komal Ni. The app keeps aaroh and avroh separate wherever this matters. The number of
                    notes gives the raga's class (<Term>jati</Term>): five notes is audav, six is shadav,
                    and seven is sampoorna.
                </p>
                <p>
                    A raga is much more than its notes, though. It has notes it dwells on, signature
                    phrases, characteristic ornaments, a mood and often a time of day. The clearest proof
                    is that two ragas can use exactly the same notes and still sound nothing alike:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                    <Example label="Bhupali" pcs={[0, 2, 4, 7, 9]} caption="lives in the lower half, rests on Ga" />
                    <Example label="Deshkar" pcs={[0, 2, 4, 7, 9]} caption="lives in the upper half, rests on Dha" />
                </div>
                <p>
                    So treat the note sets in this app as necessary, not sufficient. Chords that fit the
                    notes will not contradict a raga, but they cannot by themselves make it sound like
                    that raga. The melody does that.
                </p>
                <p>
                    The app covers both great traditions. Hindustani (North Indian) ragas are loosely
                    grouped into ten parent scales called <Term>thaats</Term>. Carnatic (South Indian)
                    music has a complete, systematic grid of 72 parent scales, the <Term>melakartas</Term>,
                    which between them cover every seven-note scale that follows a few simple rules.
                    Carnatic names like R1, R2 and G1 label a note by its role in the scale, so two names
                    can share one key on the piano.
                </p>
            </Section>

            <Section id="chords" title="Chords from a raga" to="/" toLabel="Open the Chord Tool">
                <p>
                    A <Term>chord</Term> is three or more notes played together. Different shapes of chord
                    have different characters: major sounds bright, minor darker, diminished tense,
                    suspended open and unresolved. The Chord Tool uses one simple rule: a chord belongs to
                    a raga if every one of its notes is in the raga. It tries every chord shape on every
                    one of the twelve notes and keeps the ones that pass.
                </p>
                <p>
                    In Bhupali (Sa Re Ga Pa Dha), the major chord on Sa (Sa, Ga, Pa) fits, and so does the
                    minor chord on Dha (Dha, Sa, Ga). The minor chord on Re does not fit, because it needs
                    Ma and Bhupali has no Ma. With only five notes, Bhupali allows only a handful of
                    chords. A seven-note raga allows many more.
                </p>
                <p>
                    The <Term>Aaroh / Avroh / Full Raga</Term> switch exists because of the
                    asymmetry described above. A chord built from a note that only appears on the way down
                    suits a descending phrase, and might jar under an ascending one.
                </p>
                <p>
                    Click a note on the chord circle to see only the chords that contain it. This is the
                    most practical question when you are harmonising a melody: the melody is landing on
                    Ga, so which chords support Ga? Choosing <Term>As Root Only</Term> narrows that to the
                    chords built on that note.
                </p>
                <p>
                    <Term>Extended chords</Term> (ninths and other added notes) are richer and more
                    colourful, but they need more notes, so fewer of them fit. <Term>Notes outside raga</Term>
                    deliberately breaks the rule, showing chords with one or two foreign notes. A single
                    outside note is a way to add tension on purpose, and the app marks it so you always
                    know when you are stepping out. The <Term>Custom Chords</Term> tab lets you stack
                    notes yourself when no standard shape says what you want.
                </p>
            </Section>

            <Section id="progressions" title="Hearing and keeping it">
                <p>
                    A list of chords is only a palette. Music happens when chords follow one another in
                    time, so the Chord Tool has a timeline: a repeating loop of beats at a tempo you set,
                    where you place chords and hear the result.
                </p>
                <p>
                    <Term>Unison</Term> strikes every note of a chord together. <Term>Melody</Term> plays
                    them one after another, as an arpeggio. Arpeggios tend to suit raga music, because
                    they keep a sense of line and leave space for the melody. <Term>Tracks</Term> let you
                    keep several ideas side by side, and <Term>MIDI export</Term> carries what you have
                    built into any music software, where you can take it further with real instruments.
                </p>
                <p>
                    You can also play the aaroh and avroh themselves, so you can hear the raga's shape
                    next to the chords you are building for it.
                </p>
            </Section>

            <Section id="western" title="Borrowing Western harmony" to="/" toLabel="Try progressions in the Chord Tool">
                <p>
                    Western harmony has centuries of experience with how chords move. The Chord Tool
                    borrows four pieces of it.
                </p>
                <h3 className="text-lg font-semibold text-gray-100 pt-2">Roman numerals</h3>
                <p>
                    Each chord is labelled by its distance from Sa, as a Roman numeral. I is the chord on
                    Sa, IV the chord on Ma, V the chord on Pa. Upper case means major and lower case means
                    minor; a flat (♭) marks a chord on a komal note, and ♯IV marks the chord on tivra Ma.
                    Musicians who think in sargam already think this way, since naming notes from Sa is
                    exactly what Sa Re Ga does. The point is that a progression written as numerals works
                    from any tonic, and a numeral says what job a chord does rather than which piano key
                    it starts on.
                </p>
                <h3 className="text-lg font-semibold text-gray-100 pt-2">Thaats and modes</h3>
                <p>
                    Six of the ten thaats use exactly the same notes as a familiar Western scale, or
                    <Term> mode</Term>. Where a match exists, the chord progressions that Western
                    musicians have developed in that mode carry straight over.
                </p>
                <div className="overflow-hidden rounded-lg border border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900 text-gray-400">
                            <tr>
                                <th scope="col" className="text-left font-medium px-4 py-2">Thaat</th>
                                <th scope="col" className="text-left font-medium px-4 py-2">Western mode</th>
                            </tr>
                        </thead>
                        <tbody>
                            {THAATS.map(t => (
                                <tr key={t.id} className="border-t border-gray-800">
                                    <td className="px-4 py-2 text-gray-200">{t.name}</td>
                                    <td className="px-4 py-2 text-gray-400">{t.mode ?? 'No common Western name'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    The four without a match, Bhairav, Poorvi, Marwa and Todi, are places where the raga
                    world goes beyond the usual Western vocabulary. Here the borrowed templates fit less
                    often, and that is a sign of the raga's individuality rather than a shortcoming.
                </p>
                <h3 className="text-lg font-semibold text-gray-100 pt-2">Progression templates</h3>
                <p>
                    The templates panel lists well-known progressions, such as I–IV–V–I, the
                    I–V–vi–IV of countless pop songs, the 12-bar blues and the Andalusian cadence, and
                    checks each one against the current raga. <Term>Fits</Term> means every chord is
                    inside the raga. <Term>One chord outside</Term> is worth a look too: a single borrowed
                    chord can be a striking colour. <Term>Doesn&apos;t fit</Term> means the progression
                    would pull you away from the raga.
                </p>
                <h3 className="text-lg font-semibold text-gray-100 pt-2">Harmonising and suggestions</h3>
                <p>
                    <Term>Harmonise</Term> takes the aaroh, the avroh or both, and gives every note a
                    chord that contains it. Many chords could do that, so it looks for the smoothest path
                    through them, using two time-tested ideas. First, neighbouring chords should share
                    notes, so the harmony does not lurch. Second, roots moving by a fourth or a fifth (Sa
                    to Ma, Sa to Pa) sound the strongest. Indian music hears the same intervals as the
                    strongest consonances: they are the samvadi relationships, a word from the same root
                    as this app's name. The path starts and ends on Sa, so it feels like coming home.
                </p>
                <p>
                    Below the timeline, <Term>Next</Term> suggestions propose chords for the next empty
                    beat, each with its reason: it shares notes with the chord before, its root moves by a
                    fourth, or it resolves to Sa.
                </p>
            </Section>

            <Section id="query" title="Finding ragas by their notes" to="/query" toLabel="Open Raga Query">
                <p>
                    Raga Query reverses the direction. Instead of starting from a raga, you start from
                    notes. Perhaps you have a melody, a riff, or a chord you love, and you want to know
                    which ragas live in that territory.
                </p>
                <p>
                    Click a note once to require it and twice to exclude it. <Term>Contains</Term> finds
                    every raga that includes your notes, while <Term>Exact match</Term> finds ragas made of
                    precisely those notes and nothing else. You can also filter by jati, or choose notes
                    separately for the ascent and descent when the direction matters.
                </p>
            </Section>

            <Section id="insights" title="How ragas relate" to="/insights" toLabel="Open Insights">
                <p>
                    Ragas form a web of relationships, and Insights maps three kinds of them.
                </p>
                <p>
                    <Term>Same notes</Term> groups ragas that share an identical note set, like Bhupali
                    and Deshkar, or Marwa and Puriya. These groups are the best reminder that notes alone
                    do not make a raga. They also mean any chord progression you find for one works for the
                    others; the melody decides which raga you are in.
                </p>
                <p>
                    <Term>Murchanna</Term> is an idea found in the oldest Indian music theory: keep the
                    notes, but treat a different one as Sa. The intervals stay the same, but the sense of
                    home moves, and a new raga appears. Western modes are the same idea. Bhupali is the
                    classic example, since each of its five notes gives a different raga:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                    {BHUPALI_FAMILY.map(r => (
                        <Example key={r.name} label={r.name} pcs={r.pcs} caption={`Bhupali from ${r.from}`} />
                    ))}
                </div>
                <p>
                    Knowing these families lets you carry a phrase, a fingering or a whole set of chords
                    from one raga to another just by shifting what you call home.
                </p>
                <p>
                    <Term>Subsets</Term> shows ragas whose notes sit entirely inside another's. Bhupali,
                    for example, is contained in Yaman. One consequence is useful for harmony: every chord
                    that fits the smaller raga also fits the larger one. Search for <Term>subsets of</Term>
                    a raga to find the simpler ragas inside it, or <Term>supersets of</Term> a raga to find
                    the larger ones that contain it.
                </p>
            </Section>

            <Section id="limits" title="What to keep in mind">
                <p>
                    The app plays an equal-tempered piano, with twelve evenly spaced notes. Indian music is
                    more flexible about pitch: a note may be tuned slightly lower in one raga than in
                    another, and much of a raga's expression lives in glides and ornaments between the
                    notes. None of that is captured here.
                </p>
                <p>
                    Harmony also changes the music it accompanies. A raga's character partly comes from
                    every note being heard against an unchanging drone, and chords take some of that space
                    away. Use the chords as a lens, a set of options that will not contradict the raga,
                    and let your ear make the final call.
                </p>
            </Section>
        </div>
    );
}

export default Guide;
