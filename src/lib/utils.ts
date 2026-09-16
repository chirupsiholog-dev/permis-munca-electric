import JSZip from "jszip";
import type { Document } from "./namirial.js";
import {PDFDocument} from 'pdf-lib';
//named import, not `import fs from 'fs/promises'` — the default export only
//exists under Node's native ESM. Vercel bundles this to CJS, where the default
//is undefined and every call throws "cannot read properties of undefined".
import { readFile } from 'fs/promises'

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
    turnon: string
}

function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
} 

export async function fillInventarPdf(data: InventarData, filePath: string){

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
        const field = form.getTextField(textfield);
        if(textfield === 'remarks')
            field.setText(removeDiacritics(data[textfield]))
        else
            field.setText(data[textfield])
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

    form.flatten();
    const savedPdfBytes = await pdfDoc.save();
    return Buffer.from(savedPdfBytes)

}