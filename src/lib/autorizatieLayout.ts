import { PDFDict, PDFDocument, PDFName, PDFTextField, StandardFonts, rgb } from 'pdf-lib';

const layoutVersion = PDFName.of('AutorizatieLayoutV1');

/** Repair the existing form without flattening it or removing uploaded photos. */
export async function formatAutorizatieLayout(pdf: PDFDocument) {
    const form = pdf.getForm();
    // Align confirmation boxes with their printed rows (some original widgets
    // sat between rows, making it ambiguous which statement was checked).
    const checkRows: [string, number, number][] = [
        ['instruire_formatie_cap_c_check', 510, 146.5],
        ['preluare_zone_lucru_cap_c_check', 510, 124.8],
        ['lucrare_terminata_cap_f_check', 510, 201.8],
        ['unelte_materiale_stranse_cap_f_check', 510, 189.15],
        ['mijloace_protectie_demontate_cap_f_check', 510, 176.5],
        ['membri_evacuati_cap_f_check', 510, 163.85],
        ['masuri_suplimentare_retrase_cap_f_check', 510, 151.2],
        ['scurtcircuitoare_demontate_cap_f_check', 510, 138.55],
        ['curatenie_zone_cap_f_check', 510, 125.9],
        ['probe_functionale_executate_cap_f_check', 510, 113.25],
    ];
    for (const [name, x, y] of checkRows) {
        const field = form.getCheckBox(name);
        for (const widget of field.acroField.getWidgets()) widget.setRectangle({ x, y, width: 10, height: 10 });
        field.defaultUpdateAppearances();
    }
    if (!pdf.catalog.has(layoutVersion)) {
        // These two old checkbox outlines are printed in the page content,
        // independently of the widgets moved above.
        pdf.getPage(3).drawRectangle({ x: 507, y: 117, width: 73, height: 27, color: rgb(1, 1, 1) });
        // Copy the original printed labels (including Romanian glyphs) before
        // covering their old positions. A separate source avoids self-reference.
        const source = await PDFDocument.load(await pdf.save());
        const labels = await pdf.embedPages([source.getPage(4), source.getPage(4)], [
            { left: 42, bottom: 411, right: 388, top: 425 },
            { left: 84, bottom: 398, right: 242, top: 412 },
        ]);
        const page = pdf.getPage(4);
        page.drawRectangle({ x: 41.5, y: 389.3, width: 510, height: 48.4, color: rgb(1, 1, 1) });
        page.drawPage(labels[0]!, { x: 42, y: 426, width: 272, height: 11 });
        page.drawPage(labels[1]!, { x: 42, y: 389.5, width: 107.2, height: 9.5 });
        page.drawLine({ start: { x: 245, y: 391 }, end: { x: 525, y: 391 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });

        const resize = (name: string, changes: Partial<{ x: number; y: number; width: number; height: number }>) => {
            for (const widget of form.getTextField(name).acroField.getWidgets()) {
                widget.setRectangle({ ...widget.getRectangle(), ...changes });
            }
        };
        resize('masuri_suplimentare_cap_c_l1', { x: 42.2, y: 414, width: 508, height: 11 });
        resize('masuri_suplimentare_cap_c_l2', { x: 42.2, y: 401.5, width: 508, height: 11 });
        for (const name of ['partea_instalatie_l1', 'continutul_lucrarii_l1', 'nominalizare_zone_l1']) {
            const rect = form.getTextField(name).acroField.getWidgets()[0]!.getRectangle();
            resize(name, { width: 511 - rect.x });
        }
        for (const name of ['emitent_nume', 'admitent_nume', 'sef_lucrare_semnatar']) resize(name, { width: 140 });
        for (let nr = 1; nr <= 8; nr++) resize(`executant_nume_nr${nr}`, { width: 235 });
        pdf.catalog.set(layoutVersion, pdf.context.obj(true));
    }

    // Use a consistent readable size, shrinking only when the actual value
    // needs it. Automatic size 0 makes short table values disproportionately big.
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    // Editable viewers resolve DA fonts through AcroForm/DR, not through the
    // appearance stream resources. Register the same font for both paths.
    const formDict = form.acroForm.dict;
    let resources = formDict.lookupMaybe(PDFName.of('DR'), PDFDict);
    if (!resources) {
        resources = pdf.context.obj({});
        formDict.set(PDFName.of('DR'), resources);
    }
    let fonts = resources.lookupMaybe(PDFName.of('Font'), PDFDict);
    if (!fonts) {
        fonts = pdf.context.obj({});
        resources.set(PDFName.of('Font'), fonts);
    }
    fonts.set(PDFName.of(font.name), font.ref);
    for (const field of form.getFields()) {
        if (!(field instanceof PDFTextField)) continue;
        let size = 8.5;
        const isTableDate = /^(intrerupere|reluare)_data_cap_e_nr\d+$/.test(field.getName());
        const isTableTime = /^(intrerupere|reluare)_ora_cap_e_nr\d+$/.test(field.getName());
        const text = (field.getText() || (isTableDate ? '00.00.0000' : isTableTime ? '00:00' : '')).replace(/[\r\n]/g, ' ');
        // Editable viewers add their own text inset beyond the appearance
        // stream's padding. Reserve room on both sides of these narrow cells.
        const viewerInset = isTableDate || isTableTime ? 8 : 1;
        for (const widget of field.acroField.getWidgets()) {
            const rect = widget.getRectangle();
            const padding = 2 * ((widget.getBorderStyle()?.getWidth() ?? 0) + 1);
            const width = font.widthOfTextAtSize(text, 1);
            size = Math.min(size, (rect.height - padding) / font.heightAtSize(1));
            if (width > 0) size = Math.min(size, (rect.width - padding - viewerInset) / width);
            // Widget DA overrides the field DA, so remove stale per-widget sizes.
            widget.dict.delete(PDFName.of('DA'));
        }
        // Some fields are merged with their widget, so clearing widget DA above
        // also clears the field DA. Recreate it before applying the fitted size.
        field.acroField.setDefaultAppearance('0 0 0 rg /Helvetica 8.5 Tf');
        field.setFontSize(Math.max(0.1, Math.floor(size * 100) / 100));
        field.updateAppearances(font);
    }
}
