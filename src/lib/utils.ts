import JSZip from "jszip";
import type { Document } from "./namirial.js";
import {PDFDocument, PDFRef} from 'pdf-lib';
//named import, not `import fs from 'fs/promises'` — the default export only
//exists under Node's native ESM. Vercel bundles this to CJS, where the default
//is undefined and every call throws "cannot read properties of undefined".
import { readFile } from 'fs/promises'
import { supabase } from "./supabaseClient.js";

export async function generateZip(data: {documents: Document[], pdfAuditTrail: string}){

    const zip = new JSZip();

    const document = data.documents[0];

    if(!document?.fileName || !document.base64)
        throw new Error("A document with a file name and base64 content is required");
    const signedPdfName = document.fileName;
    const signedPdfBase64 = document.base64;

    zip.file(signedPdfName, signedPdfBase64, {base64: true})
    zip.file('AuditTrail.pdf', data.pdfAuditTrail, {base64: true});

    const zipBuffer = await zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'});
    return zipBuffer

}

export interface PdfData{
    data: string,
    locatia: string,
    instalatia: string,
    tipLucrare: string,
    tip_lucrare_altul_text: string
    descriere_lucrare: string,
    emitent_permis_nume: string
    sef_lucrare_nume: string,
    executanti: string[],
    riscuri: string[],
    risc_alte_text: string,
    masuri: string[],
    echipamente: string[],
    eip_alte_text: string
    confirmari: string[],
    ora_inceput: string,
    ora_sfarsit: string,
    observatii: string,
    inchidere_permis: string[],
    inchidere_data_an: string,
    inchidere_ora: string
}

export async function fillPdf(data: PdfData, filePath: string){

   //read pdf bytes
   const pdfBytes = await readFile(filePath);
   //load pdf
   const pdfDoc = await PDFDocument.load(pdfBytes);
   //get acroform instance
   const form = pdfDoc.getForm();

    const textFields: (keyof Omit<PdfData, 'executanti' | 'tipLucrare' | 'riscuri' | 'masuri' | 'echipamente' | 'confirmari' | 'inchidere_permis'>)[] = [
            'data', 
            'emitent_permis_nume',
            'locatia', 
            'instalatia',
            'tip_lucrare_altul_text',
            'descriere_lucrare', 
            'sef_lucrare_nume',
            'risc_alte_text',
            'eip_alte_text',
            'ora_inceput',
            'ora_sfarsit',
            'observatii',
            'inchidere_data_an',
            'inchidere_ora'
        ];   
    for(const textField of textFields){
        const field = form.getTextField(textField);
        field.setText(data[textField])
    }

   const tipLucrareBox = form.getCheckBox(`tip_lucrare_${data.tipLucrare.toLowerCase()}`);
   tipLucrareBox.check();

   for(let i = 0; i < data.executanti.length; i++){
    const field = form.getTextField(`executant_${i+1}`);
    field.setText(data.executanti[i]);
   }

   for(const risc of data.riscuri){
    const box = form.getCheckBox(`risc_${risc}`);
    box.check();
   }

   for(const masura of data.masuri){
    const box = form.getCheckBox(`masuri_${masura}`);
    box.check();
   }

   for(const echipament of data.echipamente){
    const box = form.getCheckBox(`eip_${echipament}`);
    box.check();
   }

   for(const confirmare of data.confirmari){
    const box = form.getCheckBox(`confirm_${confirmare}`);
    box.check();
   }

   for(const inchidere of data.inchidere_permis){
    const box = form.getCheckBox(`inchidere_${inchidere}`);
    box.check();
   }

   const confirmSefLucrareField = form.getTextField('confirm_sef_lucrare_nume');
   confirmSefLucrareField.setText(data.sef_lucrare_nume);

   const inchidereSefLucrareField = form.getTextField('inchidere_sef_lucrare_nume');
   inchidereSefLucrareField.setText(data.sef_lucrare_nume);

   const dataValabilitateField = form.getTextField('data_valabilitate');
   dataValabilitateField.setText(data.data);

   const emitentFinalField = form.getTextField('emitent_final_nume');
   emitentFinalField.setText(data.emitent_permis_nume);

   //flatter so a user cannot input data in acroform fields later
   form.flatten();

   //save bytes of the filled pdf
   const savedPdfBytes = await pdfDoc.save();
   //return a buffer
   return Buffer.from(savedPdfBytes);

}

export interface ImageObject {
    url: string;
    path: string;
}

export interface InventarData{

    praf: boolean,
    ventilatoare: boolean,
    inventorDeteriorat: boolean,
    inventorSunete: boolean,
    parametriiCorecti: boolean,
    cabluriConectate: boolean,
    cabluriIntacte: boolean,
    capaceEtansare: boolean,
    porturi: boolean,
    impamantare: boolean,
    comutatorCurent: boolean,
    suruburi: boolean
    remarks: string;
    data: string,
    inverter: string
    turnoff: string
    turnon: string,
}

function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
} 

function isJpeg(bytes: Uint8Array): boolean {
    return bytes[0] === 0xFF && bytes[1] === 0xD8;
}

function isPng(bytes: Uint8Array): boolean {
    return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 && // 'P'
    bytes[2] === 0x4E && // 'N'
    bytes[3] === 0x47    // 'G'
  );
}

export async function fillInventarPdf(data: InventarData, images: ImageObject[], filePath: string){

    const pdfBytes = await readFile(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const textfields: (keyof Omit<InventarData, 'praf' | 'ventilatoare' |'inventorDeteriorat' | 'inventorSunete' | 'parametriiCorecti' | 'cabluriConectate' | "cabluriIntacte" | "capaceEtansare"	| "porturi"	| "impamantare"	 | "comutatorCurent" | 'suruburi'>)[] = [
        'data',
        'turnoff',
        'inverter',
        'turnon',
        'remarks'
    ]

    for(const textfield of textfields){
        // The template names the start-time field "turnoff" and the end-time field "turnon".
        const pdfFieldName = textfield === 'turnon' ? 'turnoff' : textfield === 'turnoff' ? 'turnon' : textfield;
        const field = form.getTextField(pdfFieldName);
        field.setText(removeDiacritics(data[textfield]))
    }

    const checkboxes: (keyof Omit<InventarData, 'data' | 'remarks' | 'turnoff' | 'inverter' | 'turnon'>)[] = [
        'praf', 'ventilatoare', 'inventorDeteriorat', 'inventorSunete', 'parametriiCorecti', 
        'cabluriConectate', 'cabluriIntacte', 'capaceEtansare', 'porturi', 'impamantare', 'comutatorCurent', 'suruburi'
    ]

    for(const checkbox of checkboxes){
        const box = form.getCheckBox(checkbox)
        if(data[checkbox])
            box.check();
    }

    for (const image of images) {
        //since the bucket is set to private, we cannot access the images directly via the link stored in supabase
        
        //we generate a link that is valid for 30 seconds
        const { data, error } = await supabase.storage.from('Images').createSignedUrl(image.path, 30);

        if (error || !data) {
            throw new Error('Failed to create a signed URL for image: ' + image.path);
        }

        //fetch the images from the generated link
        const response = await fetch(data.signedUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch image from url: ' + data.signedUrl);
        }

        const imageBuffer = await response.arrayBuffer();
        const imageBytes = new Uint8Array(imageBuffer);

        let embeddedImage = null;
        //handle the separate cases(images can be either jpeg or pdf)
        if (isJpeg(imageBytes)) {
            embeddedImage = await pdfDoc.embedJpg(imageBuffer);
        } else if (isPng(imageBytes)) {
            embeddedImage = await pdfDoc.embedPng(imageBuffer);
        } else {
            continue; //unhandled case, skip unsupported images
        }

        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: embeddedImage.width,
            height: embeddedImage.height
        });
    }


    form.flatten();
    const savedPdfBytes = await pdfDoc.save();
    return Buffer.from(savedPdfBytes)

}

export interface AutorizatieData{
    nr_autorizatie: string,
    data_autorizatie: string,
    sef_lucrare_desemnat: string,
    instalatia_l1: string,
    instalatia_l2: string,
    partea_instalatie_l1: string,
    partea_instalatie_l2: string,
    continutul_lucrarii_l1: string,
    continutul_lucrarii_l2: string,
    durata_zile: string,
    data_inceperii: string,
    revenire_zilnica_check: boolean,
    nr_zone_lucru: string,
    nominalizare_zone_l1: string,
    nominalizare_zone_l2: string,
    de_la_cine: string,
    foaie_manevra_check: boolean,
    preluare_mesaj_check: boolean,
    utilaje_speciale_check: boolean,
    fisa_tehnologica_check: boolean,
    instructiune_tehnica_check: boolean,
    instalatii_afectate: string,
    separare_electrica_catre: string,
    aparate_comutatie_check: boolean, 
    dezlegare_conductoare_check: boolean, 
    dezlegare_cordoane_check: boolean, 
    dezlegare_bare_aparataj_check: boolean, 
    dezlegare_cabluri_check: boolean,
    cabluri_detaliu: string,
    separare_electrica_continuare: string,
    legari_pamant_catre: string,
    emitent_nume: string,
    admitent_nume: string,
    sef_lucrare_semnatar: string,
    
    manevra_nr1: string;
    manevra_nr2: string;
    manevra_nr3: string;

    mesaj_nr1: string;
    mesaj_nr2: string;
    mesaj_nr3: string;
    mesaj_nr4: string;
    mesaj_nr5: string;

    separat_vizibil_nominalizare: string;
    separat_vizibil_nominalizare_l2: string;
    separat_vizibil_nominalizare_l3: string;

    este_separat_vizibil: string;

    legat_pamant_scurtcircuit_unde: string;
    legat_pamant_scurtcircuit_l2: string;
    legat_pamant_scurtcircuit_l3: string;
    legat_pamant_scurtcircuit_l4: string;

    este_legat_pamant_scurtcircuit: string;

    masuri_suplimentare_admitere: string;
    masuri_suplimentare_admitere_l2: string;
    masuri_suplimentare_admitere_l3: string;

    data_ora_admiterii: string;

    admitent_nume_admitere: string;

    sef_lucrare_nume_admitere: string;

    schema_diferita_check: boolean;

    continut_mesaj_nr1: string;
    continut_mesaj_nr2: string;
    continut_mesaj_nr3: string;

    sef_lucrare_nume_cap_c: string;

    identificare_instalatie_cap_c_check: boolean;
    fisa_tehnologica_cap_c_check: boolean;
    instructiune_tehnica_cap_c_check: boolean;
    instruire_formatie_cap_c_check: boolean;
    preluare_zone_lucru_cap_c_check: boolean;
    lucru_inaltime_cap_c_check: boolean;

    zona_lucru_nr1: string;
    legari_pamant_delimitare_nr1: string;
    admitere_zona_data_ora_nr1: string;

    zona_lucru_nr2: string;
    legari_pamant_delimitare_nr2: string;
    admitere_zona_data_ora_nr2: string;

    zona_lucru_nr3: string;
    legari_pamant_delimitare_nr3: string;
    admitere_zona_data_ora_nr3: string;

    zona_lucru_nr4: string;
    legari_pamant_delimitare_nr4: string;
    admitere_zona_data_ora_nr4: string;

    zona_lucru_nr5: string;
    legari_pamant_delimitare_nr5: string;
    admitere_zona_data_ora_nr5: string;

    zona_lucru_nr6: string;
    legari_pamant_delimitare_nr6: string;
    admitere_zona_data_ora_nr6: string;

    masuri_suplimentare_cap_c_l1: string;
    masuri_suplimentare_cap_c_l2: string;

    executant_nume_nr1: string;
    executant_nume_nr2: string;
    executant_nume_nr3: string;
    executant_nume_nr4: string;
    executant_nume_nr5: string;
    executant_nume_nr6: string;
    executant_nume_nr7: string;
    executant_nume_nr8: string;

    modificare_nume_prenume_nr1: string;
    modificare_scoatere_introducere_nr1: string;
    modificare_ziua_nr1: string;
    modificare_ora_nr1: string;

    modificare_nume_prenume_nr2: string;
    modificare_scoatere_introducere_nr2: string;
    modificare_ziua_nr2: string;
    modificare_ora_nr2: string;

    modificare_nume_prenume_nr3: string;
    modificare_scoatere_introducere_nr3: string;
    modificare_ziua_nr3: string;
    modificare_ora_nr3: string;

    modificare_nume_prenume_nr4: string;
    modificare_scoatere_introducere_nr4: string;
    modificare_ziua_nr4: string;
    modificare_ora_nr4: string;

    zona_lucru_cap_e_nr1: string;
    intrerupere_data_cap_e_nr1: string;
    intrerupere_ora_cap_e_nr1: string;
    reluare_data_cap_e_nr1: string;
    reluare_ora_cap_e_nr1: string;

    zona_lucru_cap_e_nr2: string;
    intrerupere_data_cap_e_nr2: string;
    intrerupere_ora_cap_e_nr2: string;
    reluare_data_cap_e_nr2: string;
    reluare_ora_cap_e_nr2: string;

    zona_lucru_cap_e_nr3: string;
    intrerupere_data_cap_e_nr3: string;
    intrerupere_ora_cap_e_nr3: string;
    reluare_data_cap_e_nr3: string;
    reluare_ora_cap_e_nr3: string;

    zona_lucru_cap_e_nr4: string;
    intrerupere_data_cap_e_nr4: string;
    intrerupere_ora_cap_e_nr4: string;
    reluare_data_cap_e_nr4: string;
    reluare_ora_cap_e_nr4: string;

    zona_lucru_cap_e_nr5: string;
    intrerupere_data_cap_e_nr5: string;
    intrerupere_ora_cap_e_nr5: string;
    reluare_data_cap_e_nr5: string;
    reluare_ora_cap_e_nr5: string;

    zona_lucru_cap_e_nr6: string;
    intrerupere_data_cap_e_nr6: string;
    intrerupere_ora_cap_e_nr6: string;
    reluare_data_cap_e_nr6: string;
    reluare_ora_cap_e_nr6: string;

    zona_lucru_cap_e_nr7: string;
    intrerupere_data_cap_e_nr7: string;
    intrerupere_ora_cap_e_nr7: string;
    reluare_data_cap_e_nr7: string;
    reluare_ora_cap_e_nr7: string;

    zona_lucru_cap_e_nr8: string;
    intrerupere_data_cap_e_nr8: string;
    intrerupere_ora_cap_e_nr8: string;
    reluare_data_cap_e_nr8: string;
    reluare_ora_cap_e_nr8: string;

    sef_lucrare_nume_cap_f: string;

    lucrare_terminata_cap_f_check: boolean;
    unelte_materiale_stranse_cap_f_check: boolean;
    mijloace_protectie_demontate_cap_f_check: boolean;
    membri_evacuati_cap_f_check: boolean;
    masuri_suplimentare_retrase_cap_f_check: boolean;
    scurtcircuitoare_demontate_cap_f_check: boolean;
    curatenie_zone_cap_f_check: boolean;
    probe_functionale_executate_cap_f_check: boolean;

    terminare_comunicare_data: string;
    terminare_comunicare_ora: string;
    terminare_comunicare_admitent: string;
    terminare_comunicare_cale: string;

    predat_data_cap_f: string;
    predat_ora_cap_f: string;
    primit_data_cap_f: string;
    primit_ora_cap_f: string;

    instalatie_pusa_tensiune_da_check: boolean;
    instalatie_pusa_tensiune_nu_check: boolean;

    punere_tensiune_comunicare_data: string;
    punere_tensiune_comunicare_ora: string;
    treapta_operativa_decizie: string;
    punere_tensiune_cale: string;

    admitent_confirmare_data_cap_f: string;
    admitent_confirmare_ora_cap_f: string;

}

export async function fillAutorizatiePdf(data: AutorizatieData, filePath: string){

    const pdfBytes = await readFile(filePath)
    const pdf = await PDFDocument.load(pdfBytes)
    // The template has an incremental catalog update (1 0 R -> 1 1 R).
    // pdf-lib retains both generations, but its writer cannot produce a valid
    // xref table for duplicate object numbers. Keep only the active catalog.
    const rootRef = pdf.context.trailerInfo.Root;
    if (rootRef instanceof PDFRef) {
        for (const [ref] of pdf.context.enumerateIndirectObjects()) {
            if (ref.objectNumber === rootRef.objectNumber && ref !== rootRef) {
                pdf.context.delete(ref);
            }
        }
    }
    const form = pdf.getForm()

    type CheckField =
        | 'revenire_zilnica_check'
        | 'foaie_manevra_check'
        | 'preluare_mesaj_check'
        | 'utilaje_speciale_check'
        | 'fisa_tehnologica_check'
        | 'instructiune_tehnica_check'
        | 'aparate_comutatie_check'
        | 'dezlegare_conductoare_check'
        | 'dezlegare_cordoane_check'
        | 'dezlegare_bare_aparataj_check'
        | 'dezlegare_cabluri_check'
        | 'schema_diferita_check'
        | 'identificare_instalatie_cap_c_check'
        | 'fisa_tehnologica_cap_c_check'
        | 'instructiune_tehnica_cap_c_check'
        | 'instruire_formatie_cap_c_check'
        | 'preluare_zone_lucru_cap_c_check'
        | 'lucru_inaltime_cap_c_check'
        | 'lucrare_terminata_cap_f_check'
        | 'unelte_materiale_stranse_cap_f_check'
        | 'mijloace_protectie_demontate_cap_f_check'
        | 'membri_evacuati_cap_f_check'
        | 'masuri_suplimentare_retrase_cap_f_check'
        | 'scurtcircuitoare_demontate_cap_f_check'
        | 'curatenie_zone_cap_f_check'
        | 'probe_functionale_executate_cap_f_check'
        | 'instalatie_pusa_tensiune_da_check'
        | 'instalatie_pusa_tensiune_nu_check';

    const checkFields: CheckField[] = [
        'revenire_zilnica_check',
        'foaie_manevra_check',
        'preluare_mesaj_check',
        'utilaje_speciale_check',
        'fisa_tehnologica_check',
        'instructiune_tehnica_check',
        'aparate_comutatie_check',
        'dezlegare_conductoare_check',
        'dezlegare_cordoane_check',
        'dezlegare_bare_aparataj_check',
        'dezlegare_cabluri_check',
        'schema_diferita_check',
        'identificare_instalatie_cap_c_check',
        'fisa_tehnologica_cap_c_check',
        'instructiune_tehnica_cap_c_check',
        'instruire_formatie_cap_c_check',
        'preluare_zone_lucru_cap_c_check',
        'lucru_inaltime_cap_c_check',
        'lucrare_terminata_cap_f_check',
        'unelte_materiale_stranse_cap_f_check',
        'mijloace_protectie_demontate_cap_f_check',
        'membri_evacuati_cap_f_check',
        'masuri_suplimentare_retrase_cap_f_check',
        'scurtcircuitoare_demontate_cap_f_check',
        'curatenie_zone_cap_f_check',
        'probe_functionale_executate_cap_f_check',
        'instalatie_pusa_tensiune_da_check',
        'instalatie_pusa_tensiune_nu_check'
    ];

    type TextField = Exclude<keyof AutorizatieData, CheckField>;

    const textFields: TextField[] = [
        'nr_autorizatie',
        'data_autorizatie',
        'sef_lucrare_desemnat',
        'instalatia_l1',
        'instalatia_l2',
        'partea_instalatie_l1',
        'partea_instalatie_l2',
        'continutul_lucrarii_l1',
        'continutul_lucrarii_l2',
        'durata_zile',
        'data_inceperii',
        'nr_zone_lucru',
        'nominalizare_zone_l1',
        'nominalizare_zone_l2',
        'de_la_cine',
        'instalatii_afectate',
        'separare_electrica_catre',
        'cabluri_detaliu',
        'separare_electrica_continuare',
        'legari_pamant_catre',
        'emitent_nume',
        'admitent_nume',
        'sef_lucrare_semnatar',
        'manevra_nr1',
        'manevra_nr2',
        'manevra_nr3',
        'mesaj_nr1',
        'mesaj_nr2',
        'mesaj_nr3',
        'mesaj_nr4',
        'mesaj_nr5',
        'separat_vizibil_nominalizare',
        'separat_vizibil_nominalizare_l2',
        'separat_vizibil_nominalizare_l3',
        'este_separat_vizibil',
        'legat_pamant_scurtcircuit_unde',
        'legat_pamant_scurtcircuit_l2',
        'legat_pamant_scurtcircuit_l3',
        'legat_pamant_scurtcircuit_l4',
        'este_legat_pamant_scurtcircuit',
        'masuri_suplimentare_admitere',
        'masuri_suplimentare_admitere_l2',
        'masuri_suplimentare_admitere_l3',
        'data_ora_admiterii',
        'admitent_nume_admitere',
        'sef_lucrare_nume_admitere',
        'continut_mesaj_nr1',
        'continut_mesaj_nr2',
        'continut_mesaj_nr3',
        'sef_lucrare_nume_cap_c',
        'zona_lucru_nr1',
        'legari_pamant_delimitare_nr1',
        'admitere_zona_data_ora_nr1',
        'zona_lucru_nr2',
        'legari_pamant_delimitare_nr2',
        'admitere_zona_data_ora_nr2',
        'zona_lucru_nr3',
        'legari_pamant_delimitare_nr3',
        'admitere_zona_data_ora_nr3',
        'zona_lucru_nr4',
        'legari_pamant_delimitare_nr4',
        'admitere_zona_data_ora_nr4',
        'zona_lucru_nr5',
        'legari_pamant_delimitare_nr5',
        'admitere_zona_data_ora_nr5',
        'zona_lucru_nr6',
        'legari_pamant_delimitare_nr6',
        'admitere_zona_data_ora_nr6',
        'masuri_suplimentare_cap_c_l1',
        'masuri_suplimentare_cap_c_l2',
        'executant_nume_nr1',
        'executant_nume_nr2',
        'executant_nume_nr3',
        'executant_nume_nr4',
        'executant_nume_nr5',
        'executant_nume_nr6',
        'executant_nume_nr7',
        'executant_nume_nr8',
        'modificare_nume_prenume_nr1',
        'modificare_scoatere_introducere_nr1',
        'modificare_ziua_nr1',
        'modificare_ora_nr1',
        'modificare_nume_prenume_nr2',
        'modificare_scoatere_introducere_nr2',
        'modificare_ziua_nr2',
        'modificare_ora_nr2',
        'modificare_nume_prenume_nr3',
        'modificare_scoatere_introducere_nr3',
        'modificare_ziua_nr3',
        'modificare_ora_nr3',
        'modificare_nume_prenume_nr4',
        'modificare_scoatere_introducere_nr4',
        'modificare_ziua_nr4',
        'modificare_ora_nr4',
        'zona_lucru_cap_e_nr1',
        'intrerupere_data_cap_e_nr1',
        'intrerupere_ora_cap_e_nr1',
        'reluare_data_cap_e_nr1',
        'reluare_ora_cap_e_nr1',
        'zona_lucru_cap_e_nr2',
        'intrerupere_data_cap_e_nr2',
        'intrerupere_ora_cap_e_nr2',
        'reluare_data_cap_e_nr2',
        'reluare_ora_cap_e_nr2',
        'zona_lucru_cap_e_nr3',
        'intrerupere_data_cap_e_nr3',
        'intrerupere_ora_cap_e_nr3',
        'reluare_data_cap_e_nr3',
        'reluare_ora_cap_e_nr3',
        'zona_lucru_cap_e_nr4',
        'intrerupere_data_cap_e_nr4',
        'intrerupere_ora_cap_e_nr4',
        'reluare_data_cap_e_nr4',
        'reluare_ora_cap_e_nr4',
        'zona_lucru_cap_e_nr5',
        'intrerupere_data_cap_e_nr5',
        'intrerupere_ora_cap_e_nr5',
        'reluare_data_cap_e_nr5',
        'reluare_ora_cap_e_nr5',
        'zona_lucru_cap_e_nr6',
        'intrerupere_data_cap_e_nr6',
        'intrerupere_ora_cap_e_nr6',
        'reluare_data_cap_e_nr6',
        'reluare_ora_cap_e_nr6',
        'zona_lucru_cap_e_nr7',
        'intrerupere_data_cap_e_nr7',
        'intrerupere_ora_cap_e_nr7',
        'reluare_data_cap_e_nr7',
        'reluare_ora_cap_e_nr7',
        'zona_lucru_cap_e_nr8',
        'intrerupere_data_cap_e_nr8',
        'intrerupere_ora_cap_e_nr8',
        'reluare_data_cap_e_nr8',
        'reluare_ora_cap_e_nr8',
        'sef_lucrare_nume_cap_f',
        'terminare_comunicare_data',
        'terminare_comunicare_ora',
        'terminare_comunicare_admitent',
        'terminare_comunicare_cale',
        'predat_data_cap_f',
        'predat_ora_cap_f',
        'primit_data_cap_f',
        'primit_ora_cap_f',
        'punere_tensiune_comunicare_data',
        'punere_tensiune_comunicare_ora',
        'treapta_operativa_decizie',
        'punere_tensiune_cale',
        'admitent_confirmare_data_cap_f',
        'admitent_confirmare_ora_cap_f'
    ];

    const allFields: (keyof AutorizatieData)[] = [
        ...textFields,
        ...checkFields
    ];

    for(const textField of textFields){
        const field = form.getTextField(textField)
        field.setText(data[textField])
    }

    for(const checkField of checkFields){
        if(data[checkField]){
            const check = form.getCheckBox(checkField)
            check.check()
        }
    }

    form.flatten()
    const savedBytes = await pdf.save({ useObjectStreams: false })
    return Buffer.from(savedBytes)

}
