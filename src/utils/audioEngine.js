import { westernNotesSharp } from './musicTheory';

// Audio Context Singleton
let audioContext = null;
const bufferCache = {};

export const getAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
};

const loadBuffer = async (url) => {
    if (bufferCache[url]) return bufferCache[url];

    const ctx = getAudioContext();
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`HTTP error loading ${url}: ${response.status}`);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
            console.error(`Empty buffer for ${url}`);
            return null;
        }
        // Clone the array buffer to avoid detached buffer errors
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
        bufferCache[url] = audioBuffer;
        return audioBuffer;
    } catch (error) {
        console.error(`Failed to load/decode audio from ${url}:`, error);
        // If standard decoding fails, the file might be corrupted or unsupported
        // Return null so playback can gracefully fail
        return null;
    }
};

const getNoteFilename = async (noteIndex, octave, ctx) => {
    // noteIndex: 0-11 (C to B)
    // octave: 3, 4, 5 (supported by current samples: m12, base, p12)

    const noteName = westernNotesSharp[noteIndex]; // C, C#, D...

    let suffix = '';
    if (octave === 3) suffix = '_m12';
    else if (octave === 5) suffix = '_p12';
    else if (octave === 4) suffix = '';
    else {
        if (octave < 4) suffix = '_m12';
        else suffix = '_p12';
    }

    // Try multiple naming variants and file extensions
    const nameVariants = [noteName];
    if (noteName.includes('#')) {
        nameVariants.push(noteName.replace('#', 'sharp'));
        nameVariants.push(noteName.replace('#', 's'));
    }

    const extensions = ['.mp3', '.wav', '.ogg'];

    for (const variant of nameVariants) {
        for (const ext of extensions) {
            const filename = `${variant}${suffix}`;
            const encoded = encodeURIComponent(filename);
            const url = `/Piano/${encoded}${ext}`;

            try {
                const response = await fetch(url);
                if (!response.ok) continue;

                const arrayBuffer = await response.arrayBuffer();
                if (arrayBuffer.byteLength === 0) continue;

                const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
                return { url, buffer: audioBuffer };
            } catch (error) {
                // Try next variant/extension
                continue;
            }
        }
    }

    return null;
};

export const playNote = async (noteIndex, octave = 4, duration = 2, volume = 1.0) => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    // Determine file to play
    // We have samples for octaves 3, 4, 5.
    // If requested octave is outside, we can use the closest sample and detune.
    let sampleOctave = octave;
    let detune = 0;

    if (octave < 3) {
        sampleOctave = 3;
        detune = (octave - 3) * 1200;
    } else if (octave > 5) {
        sampleOctave = 5;
        detune = (octave - 5) * 1200;
    }

    const result = await getNoteFilename(noteIndex, sampleOctave, ctx);

    if (!result) {
        console.warn(`No audio file found for note ${noteIndex} octave ${sampleOctave}`);
        return;
    }

    const { url, buffer } = result;

    // Cache the buffer
    if (!bufferCache[url]) {
        bufferCache[url] = buffer;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.detune.value = detune;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    // Envelope for smooth release
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration + 0.5); // Stop after fade out

    return { source, gainNode };
};

export const playChord = async (notes, duration = 3, delay = 0, volume = 0.6) => {
    // notes: array of { noteIndex, octave } or just noteIndex (assume octave 4)
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const promises = notes.map((n, i) => {
        const idx = typeof n === 'object' ? n.noteIndex : n;
        const oct = typeof n === 'object' ? n.octave : 4;

        // We call playNote but with a custom startTime offset for arpeggiation
        return (async () => {
            const result = await getNoteFilename(idx, oct, ctx);
            if (!result) return;

            const source = ctx.createBufferSource();
            source.buffer = result.buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            const startAt = now + (i * delay);
            gainNode.gain.setValueAtTime(volume, startAt);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startAt + duration);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(startAt);
            source.stop(startAt + duration + 0.5);
            return { source, gainNode };
        })();
    });

    return Promise.all(promises);
};

export const playSequence = async (notes, noteDuration = 0.6, gap = 0.1, volume = 0.8) => {
    // notes: array of { noteIndex, octave }
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    let currentTime = ctx.currentTime;

    for (const note of notes) {
        const idx = typeof note === 'object' ? note.noteIndex : note;
        const oct = typeof note === 'object' ? note.octave : 4;

        const result = await getNoteFilename(idx, oct, ctx);
        if (result) {
            const source = ctx.createBufferSource();
            source.buffer = result.buffer;

            const gainNode = ctx.createGain();
            gainNode.gain.value = volume;

            gainNode.gain.setValueAtTime(volume, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + noteDuration);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            source.start(currentTime);
            source.stop(currentTime + noteDuration + 0.5);
        }

        currentTime += (noteDuration + gap);
    }
};

export const stopAll = () => {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
};

// Tanpura logic using HTML Audio element for better loading
let tanpuraAudioElement = null;

const getTanpuraFileName = (tonicIndex) => {
    if (tonicIndex === null || tonicIndex === undefined) return 'C.mp3';
    const westernNotesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    return `${westernNotesFlat[tonicIndex]}.mp3`;
};

const loadTanpuraFile = async (fileName) => {
    // Try different naming conventions if the primary file doesn't exist
    const namingVariants = [
        fileName, // original (e.g., "Db.mp3")
        fileName.replace('b', '#'), // sharp notation (e.g., "D#.mp3") 
        fileName.replace('#', 's'), // s for sharp (e.g., "Ds.mp3")
        'C.mp3' // fallback to C
    ];

    for (const variant of namingVariants) {
        try {
            const audio = new Audio(`/tanpura/${variant}`);
            audio.loop = true;
            audio.preload = 'metadata';
            audio.volume = 0.5;

            // Test if file exists by trying to load metadata
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
                audio.addEventListener('canplaythrough', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                audio.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    reject(e);
                }, { once: true });
                audio.load();
            });

            return audio;
        } catch (error) {
            console.log(`Tanpura file ${variant} not found, trying next variant...`);
            continue;
        }
    }

    throw new Error('No tanpura file found for any naming variant');
};

export const playTanpura = async (rootIndex, volume = 0.5) => {
    try {
        const fileName = getTanpuraFileName(rootIndex);

        // Create new audio element if needed or if tonic changed
        if (!tanpuraAudioElement || !tanpuraAudioElement.src.includes(fileName.replace('.mp3', ''))) {
            // Stop current audio if playing
            if (tanpuraAudioElement) {
                tanpuraAudioElement.pause();
                tanpuraAudioElement.currentTime = 0;
            }

            const audio = await loadTanpuraFile(fileName);
            audio.volume = volume;
            tanpuraAudioElement = audio;

            // Play the loaded audio
            await audio.play();
        } else {
            // Resume existing audio
            tanpuraAudioElement.volume = volume;
            await tanpuraAudioElement.play();
        }
    } catch (error) {
        console.error('Could not load tanpura file:', error);
        throw error;
    }
};

export const stopTanpura = () => {
    if (tanpuraAudioElement) {
        try {
            tanpuraAudioElement.pause();
        } catch (e) {
            console.error('Error stopping tanpura:', e);
        }
    }
};

// audioEngine object must be defined AFTER all functions it references
export const audioEngine = {
    get context() { return getAudioContext(); },
    getNoteFilename,
    playNote,
    playChord,
    playSequence,
    playTanpura,
    stopTanpura
};
