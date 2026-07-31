import JSZip from "jszip";
import type { Document } from "./namirial.js";
import {PDFDocument} from 'pdf-lib';
import fs from 'fs/promises'

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
    descriere_lucrare: string,
    emitent_permis_nume: string
    sef_lucrare_nume: string,
    executanti: string[],
    riscuri: string[],
    masuri: string[],
    echipamente: string[],
    confirmari: string[],
    ora_inceput: string,
    ora_sfarsit: string,
    observatii: string,
    inchidere_permis: string[]
}

export async function fillPdf(data: PdfData, filePath: string){

   //read pdf bytes
   const pdfBytes = await fs.readFile(filePath);
   //load pdf
   const pdfDoc = await PDFDocument.load(pdfBytes);
   //get acroform instance
   const form = pdfDoc.getForm();

    const textFields: (keyof Omit<PdfData, 'executanti' | 'tipLucrare' | 'riscuri' | 'masuri' | 'echipamente' | 'confirmari' | 'inchidere_permis'>)[] = [
            'data', 
            'emitent_permis_nume',
            'locatia', 
            'instalatia', 
            'descriere_lucrare', 
            'sef_lucrare_nume',
            'ora_inceput',
            'ora_sfarsit',
            'observatii'
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