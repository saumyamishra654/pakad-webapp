/**
 * Carnatic Melakarta Data
 * The 72 parent ragas (melakartas) of the Carnatic system
 * Each has exactly 7 notes with systematic swara variations
 */

// Raw CSV data for 72 melakartas
export const MELAKARTA_CSV_DATA = `number,name,swaras
1,Kanakangi,S R₁ G₁ M₁ P D₁ N₁ S
2,Ratnangi,S R₁ G₁ M₁ P D₁ N₂ S
3,Ganamurti,S R₁ G₁ M₁ P D₁ N₃ S
4,Vanaspati,S R₁ G₁ M₁ P D₂ N₂ S
5,Manavati,S R₁ G₁ M₁ P D₂ N₃ S
6,Tanarupi,S R₁ G₁ M₁ P D₃ N₃ S
7,Senavati,S R₁ G₂ M₁ P D₁ N₁ S
8,Hanumatodi,S R₁ G₂ M₁ P D₁ N₂ S
9,Dhenuka,S R₁ G₂ M₁ P D₁ N₃ S
10,Natakapriya,S R₁ G₂ M₁ P D₂ N₂ S
11,Kokilapriya,S R₁ G₂ M₁ P D₂ N₃ S
12,Rupavati,S R₁ G₂ M₁ P D₃ N₃ S
13,Gayakapriya,S R₁ G₃ M₁ P D₁ N₁ S
14,Vakulabharanam,S R₁ G₃ M₁ P D₁ N₂ S
15,Mayamalavagaula,S R₁ G₃ M₁ P D₁ N₃ S
16,Chakravakam,S R₁ G₃ M₁ P D₂ N₂ S
17,Suryakantam,S R₁ G₃ M₁ P D₂ N₃ S
18,Hatakambari,S R₁ G₃ M₁ P D₃ N₃ S
19,Jhankaradhvani,S R₂ G₂ M₁ P D₁ N₁ S
20,Natabhairavi,S R₂ G₂ M₁ P D₁ N₂ S
21,Keeravani,S R₂ G₂ M₁ P D₁ N₃ S
22,Kharaharapriya,S R₂ G₂ M₁ P D₂ N₂ S
23,Gaurimanohari,S R₂ G₂ M₁ P D₂ N₃ S
24,Varunapriya,S R₂ G₂ M₁ P D₃ N₃ S
25,Mararanjani,S R₂ G₃ M₁ P D₁ N₁ S
26,Charukesi,S R₂ G₃ M₁ P D₁ N₂ S
27,Sarasangi,S R₂ G₃ M₁ P D₁ N₃ S
28,Harikambhoji,S R₂ G₃ M₁ P D₂ N₂ S
29,Dheerasankarabharanam,S R₂ G₃ M₁ P D₂ N₃ S
30,Naganandini,S R₂ G₃ M₁ P D₃ N₃ S
31,Yagapriya,S R₃ G₃ M₁ P D₁ N₁ S
32,Ragavardhini,S R₃ G₃ M₁ P D₁ N₂ S
33,Gangeyabhushini,S R₃ G₃ M₁ P D₁ N₃ S
34,Vagadhishvari,S R₃ G₃ M₁ P D₂ N₂ S
35,Shulini,S R₃ G₃ M₁ P D₂ N₃ S
36,Chalanata,S R₃ G₃ M₁ P D₃ N₃ S
37,Salagam,S R₁ G₁ M₂ P D₁ N₁ S
38,Jalarnavam,S R₁ G₁ M₂ P D₁ N₂ S
39,Jhalavarali,S R₁ G₁ M₂ P D₁ N₃ S
40,Navaneetam,S R₁ G₁ M₂ P D₂ N₂ S
41,Pavani,S R₁ G₁ M₂ P D₂ N₃ S
42,Raghupriya,S R₁ G₁ M₂ P D₃ N₃ S
43,Gavambodhi,S R₁ G₂ M₂ P D₁ N₁ S
44,Bhavapriya,S R₁ G₂ M₂ P D₁ N₂ S
45,Shubhapantuvarali,S R₁ G₂ M₂ P D₁ N₃ S
46,Shadvidhamargini,S R₁ G₂ M₂ P D₂ N₂ S
47,Suvarnangi,S R₁ G₂ M₂ P D₂ N₃ S
48,Divyamani,S R₁ G₂ M₂ P D₃ N₃ S
49,Dhavalambari,S R₁ G₃ M₂ P D₁ N₁ S
50,Namanarayani,S R₁ G₃ M₂ P D₁ N₂ S
51,Kamavardhini,S R₁ G₃ M₂ P D₁ N₃ S
52,Ramapriya,S R₁ G₃ M₂ P D₂ N₂ S
53,Gamanashrama,S R₁ G₃ M₂ P D₂ N₃ S
54,Vishvambhari,S R₁ G₃ M₂ P D₃ N₃ S
55,Shyamalangi,S R₂ G₂ M₂ P D₁ N₁ S
56,Shanmukhapriya,S R₂ G₂ M₂ P D₁ N₂ S
57,Simhendramadhyamam,S R₂ G₂ M₂ P D₁ N₃ S
58,Hemavati,S R₂ G₂ M₂ P D₂ N₂ S
59,Dharmavati,S R₂ G₂ M₂ P D₂ N₃ S
60,Neetimati,S R₂ G₂ M₂ P D₃ N₃ S
61,Kantamani,S R₂ G₃ M₂ P D₁ N₁ S
62,Rishabhapriya,S R₂ G₃ M₂ P D₁ N₂ S
63,Latangi,S R₂ G₃ M₂ P D₁ N₃ S
64,Vachaspati,S R₂ G₃ M₂ P D₂ N₂ S
65,Mechakalyani,S R₂ G₃ M₂ P D₂ N₃ S
66,Chitrambari,S R₂ G₃ M₂ P D₃ N₃ S
67,Sucharitra,S R₃ G₃ M₂ P D₁ N₁ S
68,Jyotiragam,S R₃ G₃ M₂ P D₁ N₂ S
69,Dhatuvardhani,S R₃ G₃ M₂ P D₁ N₃ S
70,Nasikabhushani,S R₃ G₃ M₂ P D₂ N₂ S
71,Kosalam,S R₃ G₃ M₂ P D₂ N₃ S
72,Rasikapriya,S R₃ G₃ M₂ P D₃ N₃ S`;

/**
 * Carnatic 16-swara labels (with enharmonic equivalents)
 */
export const CARNATIC_LABELS = [
    'S',      // 0 - Shadja
    'R1',     // 1 - Shuddha Rishabham
    'R2',     // 2 - Chatushruti Rishabham (= G1)
    'G1',     // 3 - Shuddha Gandharam (= R2)
    'R3',     // 4 - Shatshruti Rishabham (= G2)
    'G2',     // 5 - Sadharana Gandharam (= R3)
    'G3',     // 6 - Antara Gandharam
    'M1',     // 7 - Shuddha Madhyamam
    'M2',     // 8 - Prati Madhyamam
    'P',      // 9 - Panchamam
    'D1',     // 10 - Shuddha Dhaivatam
    'D2',     // 11 - Chatushruti Dhaivatam (= N1)
    'N1',     // 12 - Shuddha Nishadam (= D2)
    'D3',     // 13 - Shatshruti Dhaivatam (= N2)
    'N2',     // 14 - Kaisiki Nishadam (= D3)
    'N3'      // 15 - Kakali Nishadam
];

/**
 * Map from 16 Carnatic swaras to 12-TET pitch classes
 * Handles enharmonic equivalents (R2=G1, R3=G2, D2=N1, D3=N2)
 */
export const CARNATIC_TO_12TET = {
    0: 0,   // S
    1: 1,   // R1
    2: 2,   // R2
    3: 2,   // G1 (same as R2)
    4: 3,   // R3
    5: 3,   // G2 (same as R3)
    6: 4,   // G3
    7: 5,   // M1
    8: 6,   // M2
    9: 7,   // P
    10: 8,  // D1
    11: 9,  // D2
    12: 9,  // N1 (same as D2)
    13: 10, // D3
    14: 10, // N2 (same as D3)
    15: 11  // N3
};

/**
 * Reverse mapping from 12-TET to Carnatic indices
 */
export const TET12_TO_CARNATIC = {
    0: [0],        // S
    1: [1],        // R1
    2: [2, 3],     // R2, G1
    3: [4, 5],     // R3, G2
    4: [6],        // G3
    5: [7],        // M1
    6: [8],        // M2
    7: [9],        // P
    8: [10],       // D1
    9: [11, 12],   // D2, N1
    10: [13, 14],  // D3, N2
    11: [15]       // N3
};

/**
 * Parse a Carnatic swaras string into a 12-TET pattern and 16-swara array
 * @param {string} swarasString - e.g., "S R₁ G₂ M₁ P D₂ N₃ S"
 * @returns {{notePattern: number[], carnaticSwaras: boolean[]}}
 */
export function parseMelakartaSwaras(swarasString) {
    const present = new Array(12).fill(0);
    const carnaticSwaras = new Array(16).fill(false);
    const tokens = swarasString.trim().split(/\s+/);

    const add = (pc) => {
        if (pc >= 0) present[((pc % 12) + 12) % 12] = 1;
    };

    for (const t of tokens) {
        // Normalize subscript numerals
        const norm = t.replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3');

        if (norm === 'S') { add(0); carnaticSwaras[0] = true; continue; }
        if (norm === 'P') { add(7); carnaticSwaras[9] = true; continue; }
        if (norm === 'M1') { add(5); carnaticSwaras[7] = true; continue; }
        if (norm === 'M2') { add(6); carnaticSwaras[8] = true; continue; }

        if (norm.startsWith('R')) {
            const v = norm.slice(1);
            if (v === '1') { add(1); carnaticSwaras[1] = true; }
            else if (v === '2') { add(2); carnaticSwaras[2] = true; }
            else if (v === '3') { add(3); carnaticSwaras[4] = true; }
            continue;
        }
        if (norm.startsWith('G')) {
            const v = norm.slice(1);
            if (v === '1') { add(2); carnaticSwaras[3] = true; }
            else if (v === '2') { add(3); carnaticSwaras[5] = true; }
            else if (v === '3') { add(4); carnaticSwaras[6] = true; }
            continue;
        }
        if (norm.startsWith('D')) {
            const v = norm.slice(1);
            if (v === '1') { add(8); carnaticSwaras[10] = true; }
            else if (v === '2') { add(9); carnaticSwaras[11] = true; }
            else if (v === '3') { add(10); carnaticSwaras[13] = true; }
            continue;
        }
        if (norm.startsWith('N')) {
            const v = norm.slice(1);
            if (v === '1') { add(9); carnaticSwaras[12] = true; }
            else if (v === '2') { add(10); carnaticSwaras[14] = true; }
            else if (v === '3') { add(11); carnaticSwaras[15] = true; }
            continue;
        }
    }

    // Ensure Sa is always present
    present[0] = 1;
    carnaticSwaras[0] = true;

    return { notePattern: present, carnaticSwaras };
}

/**
 * Parse the full Melakarta CSV into an array of raga objects
 * @param {string} csvText - CSV with columns: number, name, swaras
 * @returns {Array}
 */
export function parseMelakartaCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(Boolean);
    const ragas = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 3) continue;

        const number = parseInt(parts[0]);
        const name = parts[1]?.trim();
        const swaras = parts.slice(2).join(',').trim();

        if (!name || !swaras) continue;

        const parseResult = parseMelakartaSwaras(swaras);

        ragas.push({
            number,
            name,
            notePattern: parseResult.notePattern,
            carnaticSwaras: parseResult.carnaticSwaras,
            // Melakartas are symmetric - same aaroh and avroh
            aarohPattern: parseResult.notePattern,
            avrohPattern: parseResult.notePattern,
            type: 'carnatic'
        });
    }

    return ragas;
}

// Pre-parsed melakarta list
export const MELAKARTA_72 = parseMelakartaCSV(MELAKARTA_CSV_DATA);

export default MELAKARTA_72;
