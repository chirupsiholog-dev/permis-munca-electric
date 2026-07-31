import JSZip from "jszip";

interface Document{
    fileId: string,
    fileName: string,
    base64: string
}

export async function generateZip(data: {documents: Document[], pdfAuditTrail: string}){

    const zip = new JSZip();

    const signedPdfBase64 = data.documents[0]?.base64!;
    const signedPdfName = data.documents[0]?.fileName!;

    zip.file(signedPdfName, signedPdfBase64, {base64: true})
    zip.file('AuditTrail.pdf', data.pdfAuditTrail, {base64: true});

    const savedZip = await zip.generateAsync({type: 'blob'});
    return savedZip
    
}