import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, PDFRef, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { formatAutorizatieLayout } from '../src/lib/autorizatieLayout.js';

// Run: node --import tsx scripts/format-autorizatie-template.ts
// Updates the editable template and produces a local filled review copy.
const root = new URL('../', import.meta.url);
const template = new URL('src/assets/Autorizatie_de_lucru_form.pdf', root);
const pdf = await PDFDocument.load(await readFile(template));
const rootRef = pdf.context.trailerInfo.Root;
if (rootRef instanceof PDFRef) {
    for (const [ref] of pdf.context.enumerateIndirectObjects()) {
        if (ref.objectNumber === rootRef.objectNumber && ref !== rootRef) pdf.context.delete(ref);
    }
}
await formatAutorizatieLayout(pdf);
await writeFile(template, await pdf.save({ useObjectStreams: false }));

const payload = JSON.parse(await readFile(new URL('autorizatie-test-payload.json', root), 'utf8'));
const data = payload.pdfData ?? payload;
for (const field of pdf.getForm().getFields()) {
    const value = data[field.getName()];
    if (field instanceof PDFTextField && typeof value === 'string') field.setText(value);
    if (field instanceof PDFCheckBox) value === true ? field.check() : field.uncheck();
}
await formatAutorizatieLayout(pdf);
await writeFile(new URL('autorizatie-layout-preview.pdf', root), await pdf.save({ useObjectStreams: false }));
console.log('Updated editable template and wrote autorizatie-layout-preview.pdf');
