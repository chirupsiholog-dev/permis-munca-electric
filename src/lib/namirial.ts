export interface Semnatar{
    email: string,
    nume: string,
    prenume: string,
    signatures: {page: number, x: number, y: number}[]
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
    const fileId = data.fileId;
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

                        "SendEmails": true,
                    },


                    "Elements":{
                        "Signatures": s.signatures.map((sig, signatureIdx) => (
                            {
                                "GuidingOrder": signatureIdx,
                                "ElementId": `sig_signee${signeeIdx}_field${signatureIdx}`,
                                "Required": true,
                                "DocumentNumber": 0,
                                "AllowedSignatureTypes":{DrawToSign: {
                                    "StampImprintConfiguration": {
                                        "DisplayName": true,
                                        "DisplaySignatureDate": true
                                    }
                                }},
                                "FieldDefinition":{
                                    Position: { PageNumber: sig.page, X: sig.x, Y: sig.y },
                                    Size: { Width: 150, Height: 104 },
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
                    "DocumentNumber": 0
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

        await namirialFetch('envelope/send', 'POST', envelopeBody);

    }catch(err){
        throw new Error('Namirial envelope creation failed'); //catch in post endpoint when envelope is uploaded
    }

}