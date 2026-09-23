import type { SignaturePosition } from './namirial.js';
import type { AutorizatieData } from './utils.js';

// Measured against src/assets/Autorizatie_de_lucru_form.pdf (7 pages).
// Pages are 1-based; x/y locate the BOTTOM-LEFT corner in PDF points.
// Keep individual dimensions: the crew rows are only ~13 points high and
// several table columns are narrower than Namirial's default 100-point box.
const box = (page: number, x: number, y: number, width: number, height: number): SignaturePosition =>
    ({ page, x, y, width, height });

export const executantRows = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export const modificareRows = [1, 2, 3, 4] as const;
const zoneRows = [1, 2, 3, 4, 5, 6] as const;
export type ExecutantRow = typeof executantRows[number];
export type ModificareRow = typeof modificareRows[number];

const zoneY = [555.5, 532.5, 509.5, 486.5, 463.5, 440.5] as const;
const modificareY = [650.5, 624, 597.5, 573.5] as const;
const interruptionY = [434.5, 412.4, 390.2, 368.1, 345.9, 323.8, 301.6, 279.5] as const;
const executantY = [293.2, 279.15, 265.1, 251.05, 237, 222.95, 208.9, 194.85] as const;
const finalX = [85, 211.8, 338.6, 465.4] as const;

function finalCrewSlot(slot: number): SignaturePosition {
    return box(7, finalX[(slot - 1) % 4]!, 702.8 - 13.15 * Math.floor((slot - 1) / 4), 68, 11);
}

const populated = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

export function getAutorizatieSignatures(data: AutorizatieData) {
    const emitent = [box(2, 383, 326, 110, 18)];
    const sefLucrare = [
        box(2, 383, 262, 110, 18), // Cap. A, point 20
        box(3, 402, 343.5, 51, 12), // Cap. B, point 9, after the name field
    ];
    const admitent = [
        box(2, 383, 294, 110, 18), // Cap. A, point 18
        box(3, 438, 371.2, 68, 12), // Cap. B, point 8, after the name field
    ];

    // Cap. C: only require signatures for populated work-zone rows.
    for (const nr of zoneRows) {
        if (!populated(data[`zona_lucru_nr${nr}`])) continue;
        admitent.push(box(5, 427, zoneY[nr - 1]!, 45, 19));
        sefLucrare.push(box(5, 476, zoneY[nr - 1]!, 50, 19));
    }
    sefLucrare.push(box(5, 245, 398.5, 280, 12)); // Cap. C, point 8

    const executanti = {} as Record<ExecutantRow, SignaturePosition[]>;
    for (const nr of executantRows) {
        executanti[nr] = populated(data[`executant_nume_nr${nr}`])
            ? [box(5, 338, executantY[nr - 1]!, 110, 12), finalCrewSlot(nr)]
            : [];
    }

    const personalModificat = {} as Record<ModificareRow, SignaturePosition[]>;
    for (const nr of modificareRows) {
        personalModificat[nr] = [];
        if (!populated(data[`modificare_nume_prenume_nr${nr}`])) continue;
        personalModificat[nr].push(box(6, 392, modificareY[nr - 1]!, 68, 18));
        sefLucrare.push(box(6, 464, modificareY[nr - 1]!, 81, 18));
        // Modified personnel sign only Cap. D. Cap. F slots 1-8 are reserved
        // for the original executants; slots 9-16 remain unassigned.
    }

    // Cap. E: interruption and resumption are separate pairs of signatures.
    for (const nr of executantRows) {
        const y = interruptionY[nr - 1]!;
        if (populated(data[`intrerupere_data_cap_e_nr${nr}`]) || populated(data[`intrerupere_ora_cap_e_nr${nr}`])) {
            sefLucrare.push(box(6, 156, y, 75, 18));
            admitent.push(box(6, 234, y, 75, 18));
        }
        if (populated(data[`reluare_data_cap_e_nr${nr}`]) || populated(data[`reluare_ora_cap_e_nr${nr}`])) {
            sefLucrare.push(box(6, 381, y, 83, 18));
            admitent.push(box(6, 468, y, 67, 18));
        }
    }

    // Cap. F: handover, receipt, and the admitent's final confirmation.
    sefLucrare.push(box(7, 229, 599, 63, 13));
    admitent.push(box(7, 444, 599, 99, 13), box(7, 153, 520, 95, 16));
    return { emitent, sefLucrare, admitent, executanti, personalModificat };
}
