export interface Semnatar{
    email: string,
    nume: string,
    prenume: string,
    signatures: {page: number, x: number, y: number}[]
}

export interface Document{
    fileId: string,
    fileName: string,
    base64: string
}

export async function namirialFetch(path: string, method: string, body?: any){
    
    const baseUrl = process.env.NAMIRIAL_BASE_URL;
    if(!baseUrl){
        console.log('Namirial base url not loaded');
        throw new Error('Namirial base url not loaded');
    }

    const token = process.env.NAMIRIAL_API_TOKEN;
    if(!token){
        console.log('Namirial token not loaded');
        throw new Error('Namirial token not loaded');
    }

    const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
    };

    let fetchBody = body;

    //if the body exists and it is not form data (not file upload), convert it from string to json
    if(body && !(body instanceof FormData)){
        headers['Content-Type'] = 'application/json'
        fetchBody = JSON.stringify(body);
    }

    const res = await fetch(`${baseUrl}/api/v6/${path}`,{
            method: method, 
            headers: headers,
            body: fetchBody //if the body is missing => undefined, fetch ignoes it safely
        }
    )
    
    if(!res.ok){
        let errorMessage = `Namirial fetch failed with status ${res.status}`;
        try{
            const errorData = await res.json();
            errorMessage += `: ${JSON.stringify(errorData)}`;
        }catch(e){
            errorMessage += ` - No JSON error info provided.`;
        }

        console.error(errorMessage);
        throw new Error(errorMessage);
    }

    const data = await res.json();
    if(!data){
        throw new Error('Namirial returned empty response body')
    }

    return data;

}

export async function uploadFile(doc: string, fileName: string){

    //convert base64 to blob
    const buffer = Buffer.from(doc, 'base64');
    const blob = new Blob([buffer], {type: 'application/pdf'});

    //attach the blob to form data
    const formData = new FormData();
    formData.append('file', blob, fileName)

    //upload it to namirial - post request, with the form data as body
    const data = await namirialFetch('file/upload', 'POST', formData); //will throw if something goes wrong => try-catch in createEnvelope
    const fileId = data.FileId;
    return fileId;

}

export async function createEnvelope(doc: string, semnatari: Semnatar[], accessCode: string, callbackUrl: string, fileName: string){

    try{
        const fileId = await uploadFile(doc, fileName);

        const actions = semnatari.map((s, signeeIdx) => ({
            "Action": {
                "Sign":{
                    "RecipientConfiguration":{
                        "ContactInformation":{
                            "Email": s.email,
                            "GivenName": s.prenume,
                            "Surname": s.nume,
                            "LanguageCode": "EN"
                        },

                        "AuthenticationConfiguration":{
                            "AccessCode":{
                                "Code": accessCode
                            }
                        },

                        "SendEmails": false,
                    },


                    "Elements":{
                        "Signatures": s.signatures.map((sig, signatureIdx) => (
                            {
                                "GuidingOrder": signatureIdx + 1,
                                "ElementId": `sig_signee${signeeIdx}_field${signatureIdx}`,
                                "Required": true,
                                "DocumentNumber": 1,
                                "AllowedSignatureTypes":{DrawToSign: {
                                    "StampImprintConfiguration": {
                                        "DisplayName": false,
                                        "DisplaySignatureDate": false,
                                        "DisplayIp": false,
                                        "DisplayEmail": false
                                    }
                                }},
                                "FieldDefinition":{
                                    Position: { PageNumber: sig.page, X: sig.x, Y: sig.y },
                                    Size: { Width: 100, Height: 20 },
                                }
                            }
                        ))
                    }
                }
            }
        }))

        const envelopeBody = {

            "Name": "Envelope",
            "Documents": [
                {
                    "FileId": fileId,
                    "DocumentNumber": 1
                }
            ],

            "Activities": actions,
            ReminderConfiguration: {
            "Enabled": false,
            },

            "CallbackConfiguration": {
            StatusUpdateCallbackUrl: `${callbackUrl}?envelope=##EnvelopeId##&action=##Action##`,
            CallbackUrl: `${callbackUrl}?envelope=##EnvelopeId##`,
            }
        }

        const data = await namirialFetch('envelope/send', 'POST', envelopeBody);
        if(!data?.EnvelopeId)
            throw new Error('Namirial envelope creation failed: missing EnvelopeId');
        return data.EnvelopeId as string;
    }catch(err){
        console.error('Namirial envelope creation failed:', err);
        throw new Error('Namirial envelope creation failed', { cause: err });
    }

}

export async function getViewerLinks(envelopeId: string): Promise<
Array<{activityId: string, email: string, link: string}>>{

    const data = await namirialFetch(`envelope/${envelopeId}/viewerlinks`, 'GET'); //throws if something's wrong
    return (data.ViewerLinks || []).map((d: any) => ({

        activityId: d.ActivityId,
        email: d.Email,
        link: d.ViewerLink
    }))
}

export async function getEnvelopeStatus(envelopeId: string): Promise<{status: string
    activities: Array<{ id: string, status: string, email: string }>
}>{
    const data = await namirialFetch(`envelope/${envelopeId}`, 'GET'); //throws
    return {
        status: data.EnvelopeStatus,
        activities: (data.Activities || []).map((d: any) => ({
            id: d.Id,
            status: d.Status,
            email: d.Action?.Sign?.RecipientConfiguration?.ContactInformation?.Email || '',
        }))
    }
}

export async function namirialDownloadFile(path: string): Promise<ArrayBuffer> {
    const baseUrl = process.env.NAMIRIAL_BASE_URL;
    const token = process.env.NAMIRIAL_API_TOKEN;

    if(!baseUrl || !token) throw new Error('Namirial credentials missing');

    const res = await fetch(`${baseUrl}/api/v6/${path}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        throw new Error(`Namirial file download failed with status ${res.status}`);
    }

    // Use .arrayBuffer() instead of .json()
    return await res.arrayBuffer(); 
}

export async function downloadSigned(envelopeId: string){

    const data = await namirialFetch(`envelope/${envelopeId}/files`, 'GET');
    const documents: Document[] = []

    for(const doc of data.Documents ?? []){
            const buffer = await namirialDownloadFile(`file/${doc.FileId}`);        
            documents.push({
                fileId: doc.FileId,
                fileName: doc.FileName,
                base64: Buffer.from(buffer).toString('base64')
        })
    }

    let pdfBase64:  string = '';
    if(data.AuditTrail?.FileId){
        const buffer = await namirialDownloadFile(`file/${data.AuditTrail.FileId}`);
        pdfBase64 = Buffer.from(buffer).toString('base64');
    }

    return {documents: documents, pdfAuditTrail: pdfBase64};

}