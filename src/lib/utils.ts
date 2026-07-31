import JSZip from "jszip";

interface Document{
    fileId: string,
    fileName: string,
    base64: string
}

export async function generateZip(data: {documents: Document[], pdfAuditTrail: string}){

    const zip = new JSZip();

    const document = data.documents[0];

    if(!document?.fileName || !document.base64)
        throw new Error("A document with a file name and base64 content is required");
    const signedPdfName = document.fileName;
    const signedPdfBase64 = document.base64;

    zip.file(signedPdfName, signedPdfBase64, {base64: true})
    zip.file('AuditTrail.pdf', data.pdfAuditTrail, {base64: true});

    const zipBuffer = await zip.generateAsync({type: 'blob', compression: 'DEFLATE'});
    return zipBuffer

}