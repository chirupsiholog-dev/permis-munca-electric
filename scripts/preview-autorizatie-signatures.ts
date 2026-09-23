import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PDFDocument, rgb } from 'pdf-lib';
import { fillAutorizatiePdf, type AutorizatieData } from '../src/lib/utils.js';
import { getAutorizatieSignatures, executantRows, modificareRows } from '../src/lib/autorizatieSignatures.js';
import type { SignaturePosition } from '../src/lib/namirial.js';

// Run: node --import tsx scripts/preview-autorizatie-signatures.ts
// Draw every possible position, including currently unused table rows.
// This is a local visual check: no upload or signing request is made.
const root = new URL('../', import.meta.url);
const payload = JSON.parse(await readFile(new URL('autorizatie-test-payload.json', root), 'utf8'));
const data: AutorizatieData = payload.pdfData ?? payload;
const bytes = await fillAutorizatiePdf(data, fileURLToPath(new URL('src/assets/Autorizatie_de_lucru_form.pdf', root)));
const pdf = await PDFDocument.load(bytes);
const allRows = { ...data };
for (const nr of executantRows) {
    allRows[`executant_nume_nr${nr}`] = `Executant ${nr}`;
    allRows[`intrerupere_data_cap_e_nr${nr}`] = 'preview';
    allRows[`reluare_data_cap_e_nr${nr}`] = 'preview';
}
for (const nr of [1, 2, 3, 4, 5, 6] as const) allRows[`zona_lucru_nr${nr}`] = String(nr);
for (const nr of modificareRows) allRows[`modificare_nume_prenume_nr${nr}`] = `Personal ${nr}`;
const positions = getAutorizatieSignatures(allRows);
const groups: [string, SignaturePosition[], ReturnType<typeof rgb>][] = [
    ['EM', positions.emitent, rgb(0.8, 0.1, 0.1)],
    ['SL', positions.sefLucrare, rgb(0.1, 0.3, 0.9)],
    ['AD', positions.admitent, rgb(0, 0.55, 0.25)],
    ...executantRows.map(nr => [`E${nr}`, positions.executanti[nr], rgb(0.7, 0.2, 0.7)] as [string, SignaturePosition[], ReturnType<typeof rgb>]),
    ...modificareRows.map(nr => [`M${nr}`, positions.personalModificat[nr], rgb(0.85, 0.4, 0)] as [string, SignaturePosition[], ReturnType<typeof rgb>]),
];
for (const [label, boxes, color] of groups) {
    for (const b of boxes) {
        const page = pdf.getPage(b.page - 1);
        page.drawRectangle({ x: b.x, y: b.y, width: b.width!, height: b.height!, borderColor: color, borderWidth: 0.6, color, opacity: 0.12 });
        page.drawText(label, { x: b.x + 2, y: b.y + 2, size: 5, color });
    }
}
await writeFile(new URL('autorizatie-signatures-preview.pdf', root), await pdf.save({ useObjectStreams: false }));
console.log('Created autorizatie-signatures-preview.pdf (EM = emitent, SL = sef lucrare, AD = admitent, E = executant, M = personal modificat).');
