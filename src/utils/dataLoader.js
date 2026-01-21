// Manual CSV parsing to match original behavior
const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].trim() : '';
        });
        return obj;
    });
};

const parseSequenceAndPattern = (s) => {
    if (!s) return { pattern: Array(12).fill(0), sequence: [] };
    const tokens = s.split('-');
    const present = Array(12).fill(0);
    const sequence = [];
    const map = {
        'S': 0, 'R': 2, 'r': 1, 'G': 4, 'g': 3, 'M': 6, 'm': 5, 'P': 7,
        'D': 9, 'd': 8, 'N': 11, 'n': 10
    };

    tokens.forEach(tok => {
        const token = tok.trim();
        // Handle compound notes like 'gG', 'Rr', 'Mm', 'nN', 'Dd'
        for (let i = 0; i < token.length; i++) {
            const ch = token[i];
            if (map[ch] !== undefined) {
                const noteIndex = map[ch];
                present[noteIndex] = 1;
                sequence.push(noteIndex);
            }
        }
    });

    return { pattern: present, sequence: sequence };
};

export const loadHindustaniRagas = async () => {
    try {
        const response = await fetch('/aarohavroha.csv');
        const text = await response.text();
        const data = parseCSV(text);

        // Transform data to match application structure
        return data.map((row, index) => {
            const aroha = row.Aroha || row.aroha || '';
            const avroha = row.Avroh || row.avroha || row.Avroha || '';
            const arohaChalanStr = row.ArohaChalan || row.arohachalan || '';
            const avrohaChalanStr = row.AvrohChalan || row.avrohchalan || '';
            const name = row.RAGATABLE || row.Name || row.name || `Raga ${index}`;

            const arohaData = parseSequenceAndPattern(aroha);
            const avrohaData = parseSequenceAndPattern(avroha);
            const arohaChalanData = arohaChalanStr ? parseSequenceAndPattern(arohaChalanStr) : arohaData;
            const avrohaChalanData = avrohaChalanStr ? parseSequenceAndPattern(avrohaChalanStr) : avrohaData;

            const combinedPattern = arohaData.pattern.map((v, i) => (v || avrohaData.pattern[i]) ? 1 : 0);

            return {
                id: `raga-${index}`,
                name: name,
                thaat: row.Thaat || row.thaat || '',
                time: row.Time || row.time || '',
                vadi: row.Vadi || row.vadi || '',
                samvadi: row.Samvadi || row.samvadi || '',
                pattern: combinedPattern,
                aarohaPattern: arohaData.pattern,
                avrohaPattern: avrohaData.pattern,
                aarohaChalan: arohaChalanData.sequence,
                avrohaChalan: avrohaChalanData.sequence,
                aaroha: aroha,
                avroha: avroha,
                info: row.Info || row.info || ''
            };
        });
    } catch (error) {
        console.error("Error loading Hindustani ragas:", error);
        return [];
    }
};

// Helper to parse Carnatic swaras into a 12-note pattern
const parseCarnaticSwaras = (swaras) => {
    const pattern = Array(12).fill(0);
    // Normalize: remove spaces, handle subscripts if they are actual characters or just numbers
    // The CSV has "R₁", "G₁" etc. which might be unicode or just R1.
    // Let's handle both standard ASCII R1 and Unicode subscripts if possible, 
    // or just look for the key sequences.

    // Mapping based on standard Melakarta scheme
    // S=0, P=7
    // R1=1, R2=2, R3=3
    // G1=2, G2=3, G3=4
    // M1=5, M2=6
    // D1=8, D2=9, D3=10
    // N1=9, N2=10, N3=11

    // We will search for presence of these tokens.
    // Note: R2 and G1 are same pitch (2), etc.

    const text = swaras.replace(/\s+/g, '');

    if (text.includes('S')) pattern[0] = 1;
    if (text.includes('P')) pattern[7] = 1;

    if (text.includes('R1') || text.includes('R₁')) pattern[1] = 1;
    if (text.includes('R2') || text.includes('R₂')) pattern[2] = 1;
    if (text.includes('R3') || text.includes('R₃')) pattern[3] = 1;

    if (text.includes('G1') || text.includes('G₁')) pattern[2] = 1;
    if (text.includes('G2') || text.includes('G₂')) pattern[3] = 1;
    if (text.includes('G3') || text.includes('G₃')) pattern[4] = 1;

    if (text.includes('M1') || text.includes('M₁')) pattern[5] = 1;
    if (text.includes('M2') || text.includes('M₂')) pattern[6] = 1;

    if (text.includes('D1') || text.includes('D₁')) pattern[8] = 1;
    if (text.includes('D2') || text.includes('D₂')) pattern[9] = 1;
    if (text.includes('D3') || text.includes('D₃')) pattern[10] = 1;

    if (text.includes('N1') || text.includes('N₁')) pattern[9] = 1;
    if (text.includes('N2') || text.includes('N₂')) pattern[10] = 1;
    if (text.includes('N3') || text.includes('N₃')) pattern[11] = 1;

    return pattern;
};

export const loadMelakartaRagas = async () => {
    try {
        const response = await fetch('/melakarta_72.csv');
        const text = await response.text();
        const data = parseCSV(text);

        return data.map(row => {
            const name = row.name || row.Name || `Melakarta ${row.number}`;
            const swaras = row.swaras || '';
            const pattern = parseCarnaticSwaras(swaras);
            const sequence = [];
            pattern.forEach((v, i) => { if (v) sequence.push(i); });

            // Melakarta ragas usually have same aroha/avroha
            return {
                id: `melakarta-${row.number}`,
                name: `${row.number}. ${name}`,
                pattern: pattern,
                aarohaPattern: pattern,
                avrohaPattern: pattern,
                aarohaChalan: sequence,
                avrohaChalan: [...sequence].reverse(),
                aaroha: swaras,
                avroha: swaras,
                isMelakarta: true
            };
        });
    } catch (error) {
        console.error("Error loading Melakarta ragas:", error);
        return [];
    }
};

export const loadAllRagas = async () => {
    const [hindustani, melakarta] = await Promise.all([
        loadHindustaniRagas(),
        loadMelakartaRagas()
    ]);
    return { hindustani, melakarta };
};
