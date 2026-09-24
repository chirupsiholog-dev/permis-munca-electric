import type { Request, Response } from "express";
import { fillAutorizatiePdf, isJpeg, isPng, type AutorizatieData } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import path from "node:path";
import { createEnvelope, getViewerLinks, uploadFile, type Semnatar } from "../lib/namirial.js";
import crypto from 'crypto';
import { readFile } from 'fs/promises'
import {PDFDocument} from 'pdf-lib';
import { getAutorizatieSignatures } from '../lib/autorizatieSignatures.js';


interface EmailExecutanti{

    email_executant_1: string,
    email_executant_2: string,
    email_executant_3: string,
    email_executant_4: string,
    email_executant_5: string,
    email_executant_6: string,
    email_executant_7: string,
    email_executant_8: string

}

interface EmailModificat{
    email_modificat_1: string,
    email_modificat_2: string,
    email_modificat_3: string,
    email_modificat_4: string
}
interface AutorizatiePayload{
    emailSefLucrare: string,
    emailAdmitent: string,
    emailExecutanti: EmailExecutanti,
    emailPersonalModificat: EmailModificat,
    pdfData: AutorizatieData,
    pdfPhotoStoragePath: string
}

function sanitizeFileNamePart(value: string): string {
    const sanitized = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');

    return sanitized || 'unnamed';
}

const appUrl = process.env.APP_URL_NGROK;
const webhookSecret = process.env.WEBHOOK_SECRET

if (!appUrl || !webhookSecret)
    throw new Error('Missing APP_URL or WEBHOOK_SECRET')

export const postAutorizatie = async(req: Request, res: Response)=>{

    try{

        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Date invalide' });
        }

        const {emailAdmitent, emailSefLucrare, emailExecutanti, emailPersonalModificat, pdfData, pdfPhotoStoragePath} = req.body as AutorizatiePayload

        if (!pdfData || typeof pdfData !== 'object' || Array.isArray(pdfData)) {
            return res.status(400).json({ error: 'pdfData invalid' });
        }
        const isValidEmail = (value: unknown): value is string =>
        typeof value === 'string' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

        if (!isValidEmail(emailAdmitent) || !isValidEmail(emailSefLucrare)) {
            return res.status(400).json({ error: 'Email admitent sau sef lucrare invalid' });
        }

        const userId = req.user
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        //find user/emitent email
        const userEmailQuery  = await supabase
        .from('users')
        .select('email, username')
        .eq('id', userId)
        .maybeSingle();

        if(userEmailQuery.error || !userEmailQuery.data){
            return res.status(400).json({
                'error': 'Failed to fetch user data'
            });
        }
        
        const numeTokens = userEmailQuery.data?.username.trim().split(" ");
        const numeEmitent = numeTokens[0];
        const prenumeEmitent = numeTokens.slice(1).join(" ");

        const userEmail = userEmailQuery.data?.email;

        pdfData.emitent_nume = `${numeEmitent} ${prenumeEmitent}`

        //create semnatari array
        const semnatari: Semnatar[] = []
        const signaturePositions = getAutorizatieSignatures(pdfData);

        function splitName(fullName: string): {nume: string, prenume: string}{

            const tokene = fullName.trim().split(' ') ?? []
            const nume = tokene[0] ?? ''
            const prenume = tokene.slice(1).join(' ') ?? '';

            return {nume: nume, prenume: prenume}
        }

        //1. Emitent
        semnatari.push({
            email: userEmail,
            nume: numeEmitent,
            prenume: prenumeEmitent,
            signatures: signaturePositions.emitent,
            signingTask: { orderIndex: 1, batchGroup: 'issuerSignatures', signingGroup: 'issuer' }
        });

        const requiredNameFields: (keyof AutorizatieData)[] = [
            'sef_lucrare_nume_admitere', 'admitent_nume',
        ];
        for (const field of requiredNameFields) {
            const fullName = pdfData[field];
            if (typeof fullName !== 'string' || !fullName.trim()) {
                return res.status(400).json({ error: `Nume invalid: ${field}` });
            }
        }
        //2. Sef lucrare
        const numeSeparatSef = splitName(pdfData.sef_lucrare_nume_admitere)

        semnatari.push({
            nume: numeSeparatSef['nume'],
            prenume: numeSeparatSef['prenume'],
            email: emailSefLucrare,
            signatures: signaturePositions.sefLucrare,
            signingTask: { orderIndex: 2, batchGroup: 'supervisorSignatures', signingGroup: 'supervisor' }
        })

        //3. Admitent
        const numeSeparatAdmitent = splitName(pdfData.admitent_nume)
        semnatari.push({
            nume: numeSeparatAdmitent['nume'],
            prenume: numeSeparatAdmitent['prenume'],
            email: emailAdmitent,
            signatures: signaturePositions.admitent,
            signingTask: { orderIndex: 3, batchGroup: 'admitentSignatures', signingGroup: 'admitent' }
        })

        //4. Executanti
        for (const nr of [1, 2, 3, 4, 5, 6, 7, 8] as const) {

            const nameKey: keyof AutorizatieData = `executant_nume_nr${nr}`;
            const fullName = pdfData[nameKey];

            //an omitted or blank row means no signer.
            if ( fullName == null ||(typeof fullName === 'string' && !fullName.trim()))
                continue;
            

            if (typeof fullName !== 'string') {
                return res.status(400).json({ error: `Nume invalid: ${nameKey}` });
            }

            const email = emailExecutanti?.[`email_executant_${nr}`];
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    error: `Email invalid pentru executantul ${nr}`,
                });
            }

            semnatari.push({
                ...splitName(fullName),
                email: email.trim(),
                signatures: signaturePositions.executanti[nr],
                signingTask: { orderIndex: 4, batchGroup: 'inspectorSignatures', signingGroup: 'inspector' }
            });
        }

        for (const nr of [1, 2, 3, 4] as const) {

            const nameKey: keyof AutorizatieData = `modificare_nume_prenume_nr${nr}`;
            const fullName = pdfData[nameKey];

            //an omitted or blank row means no signer.
            if ( fullName == null ||(typeof fullName === 'string' && !fullName.trim()))
                continue;

            if (typeof fullName !== 'string') {
                return res.status(400).json({ error: `Nume invalid: ${nameKey}` });
            }

            const email = emailPersonalModificat?.[`email_modificat_${nr}`];
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    error: `Email invalid pentru executantul ${nr}`,
                });
            }

            semnatari.push({
                ...splitName(fullName),
                email: email.trim(),
                signatures: signaturePositions.personalModificat[nr],
                signingTask: { orderIndex: 4, batchGroup: 'inspectorSignatures', signingGroup: 'inspector' }
            });
        }

        //generate pdf
        // const filePath = path.join(process.cwd(), 'src', 'assets', 'Autorizatie_de_lucru_form.pdf')

        // if (!fs.existsSync(filePath)) {
        //     //if the path does not exist
        //     return res.status(500).json({
        //         'error': 'Could not find PDF'
        //     });
        // }

        const pdfBytes = await fillAutorizatiePdf(pdfData, pdfPhotoStoragePath)

        //res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        // res.setHeader('Content-Disposition', 'attachement; filename="autorizatie.pdf"')
        //res.setHeader('Content-Type', 'application/pdf')
        // res.send(pdfBytes)

        const emitentFileName = sanitizeFileNamePart(pdfData.emitent_nume)
        const sefLucrareFileName = sanitizeFileNamePart(pdfData.sef_lucrare_nume_admitere)
        const admitentFileName = sanitizeFileNamePart(pdfData.admitent_nume)
        const uniqueFileName = `autorizatie_lucru_${emitentFileName}_${sefLucrareFileName}_${admitentFileName}_${crypto.randomUUID()}.pdf`
        //upload to namirial
        const pdfBase64 = pdfBytes.toString('base64')
        const accessCode = crypto.randomBytes(32).toString('base64').substring(0, 6);
        // No callbacks until the authorization-specific webhook is implemented.
        // createEnvelope omits CallbackConfiguration for an empty URL.
        const callbackUrl = `${appUrl}/api/namirial/webhook/autorizatii/${webhookSecret}`;
        const envelopeId = await createEnvelope(pdfBase64, semnatari, accessCode, callbackUrl, uniqueFileName)
        const viewerLinks = await getViewerLinks(envelopeId)
        if(!viewerLinks || !viewerLinks[0])
                throw new Error ('Failed to obtain emitent signing link');       
        const emitentSigningLink = viewerLinks[0].link

        //upload to storage
        const storagePath = `initialAutorizatii/${uniqueFileName}`
        const {error: uploadError} = await supabase.storage.from('Documents').upload(storagePath, pdfBytes, {contentType: 'application/pdf'})
        if(uploadError)
            throw new Error('Internal Server Error')

        //insert metadata in db
        const {data: uploadMetadata, error: metadataError} = await supabase.from('autorizatii').insert({
            'user_id': userId,
            'storage_path': storagePath,
            'email_sef_lucrare': emailSefLucrare,
            'email_admitent': emailAdmitent,
            'emitent_signing_link': emitentSigningLink,
            'cod_acces': accessCode,
            'namirial_envelope_id': envelopeId,
            'workflow_status': 'pending_emitent',
        }).select().maybeSingle()

        if(metadataError)
            throw new Error('Internal Server Error')
        if(!uploadMetadata)
            return res.status(400).json({error: 'Upload failed'})

        return res.status(201).json({
                'success': true,
                'message': 'Successfully inserted data',
                'data': uploadMetadata
            });

        // //create signedUrl
        // const {data} = await supabase.storage.from('Documents').createSignedUrl(storagePath, 60 * 60)
        // if(!data || !data.signedUrl)
        //     return res.status(400).json({error: 'Failed to upload to storage'})

        // return res.status(200).json({success: true, message: 'Document creat si incarcat cu success', data: {metadata: uploadMetadata, signedUrl: data.signedUrl}})

    }catch(error: any){
        return res.status(500).json({error: error.message})
    }
}

export const getAllAutorizatii = async(req: Request, res: Response) => {
    const userId = req.user;

    const { data, error } = await supabase
        .from('autorizatii')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        return res.status(500).json({
            'error': error.message
        })
    }

    if (!data || data.length === 0) {
        return res.status(404).json({
            'error': 'No documents found'
        })
    }

    console.log('found: ', data);

    return res.status(200).json({
        'success': true,
        'message': 'Sucessfully retrieved all autorizatii',
        'data': data
    });

}

export const createPdfWithImages = async(req: Request, res: Response) => {
    try {
        const file = req.file as Express.Multer.File;

        if (!file) {
            return res.status(400).json({
                'error': 'No images were uploaded in the form'
            });
        }

        const pdfPath = path.join(process.cwd(), 'src', 'assets', 'Autorizatie_de_lucru_form.pdf')

        //access the pdf
        const pdfBytes = await readFile(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes)

        //add image to the beginning of page 2
        const imageBuffer = file.buffer

        let embeddedImage = null;
        //handle the separate cases(images can be either jpeg or pdf)
        if (isJpeg(imageBuffer)) {
            embeddedImage = await pdf.embedJpg(imageBuffer);
        } else if (isPng(imageBuffer)) {
            embeddedImage = await pdf.embedPng(imageBuffer);
        } else {
            return res.status(400).json({
                'error': 'Unsupported image format'
            });
        }

        const page = pdf.getPage(1);
        page.drawImage(embeddedImage, {
            x: 55,
            y: 360,
            width: page.getWidth() / 1.25,
            height: page.getHeight() / 2.3,
        });

        const savedPdfBytes = await pdf.save();

        return res.status(200).json({
            'data': Buffer.from(savedPdfBytes).toString('base64'),
            'message': 'Returned the pdf bytes with embedded images'
        });
    } catch (error: any) {
        return res.status(500).json({error: error.message});
    }
}
export const downloadSignedAutorizatie = async(req: Request, res: Response) => {

    try{
        const userId = req.user

        const docId = req.params.id as string | undefined

        if(!docId){
            return res.status(400).json({error: 'Missing document ID'})
        }

        const {data: storagePathData, error: storagePathError} = await supabase.from('autorizatii').select('signed_storage_path').eq('id', docId).eq('user_id', userId).maybeSingle()
        if(storagePathError)
            throw new Error('Internal Server Error')
        if(!storagePathData || !storagePathData.signed_storage_path)
            return res.status(404).json({error: 'Link-ul de descarcare nu e valabil'})
        
        const {data, error} = await supabase.storage.from('Documents').download(storagePathData.signed_storage_path)
        if(error)
            throw new Error('Internal Server Error')
        if(!data)
            throw new Error('Descarcarea a esuat')

        const buffer = Buffer.from(await data.arrayBuffer())

        const fileName = path.basename(storagePathData.signed_storage_path)
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        res.setHeader('Content-Type', 'application/pdf')

        return res.send(buffer)

    }catch(error: any){
        return res.status(500).json({error: error.message})
    }

}
