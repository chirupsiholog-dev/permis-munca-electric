import type { Request, Response } from "express";
import { fillAutorizatiePdf, type AutorizatieData } from "../lib/utils.js";
import { supabase } from "../lib/supabaseClient.js";
import path from "node:path";
import fs from 'fs'
import type { Semnatar } from "../lib/namirial.js";
import crypto from 'crypto';


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
    pdfData: AutorizatieData
}


export const postAutorizatie = async(req: Request, res: Response)=>{

    try{

        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({ error: 'Date invalide' });
        }

        const {emailAdmitent, emailSefLucrare, emailExecutanti, emailPersonalModificat, pdfData} = req.body as AutorizatiePayload

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
            signatures: [] //empty for now
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
            signatures: [] //empty for now
        })

        //3. Admitent
        const numeSeparatAdmitent = splitName(pdfData.admitent_nume)
        semnatari.push({
            nume: numeSeparatAdmitent['nume'],
            prenume: numeSeparatAdmitent['prenume'],
            email: emailAdmitent,
            signatures: [] //empty for now
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
                signatures: [],
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
                signatures: [],
            });
        }

        //generate pdf
        const filePath = path.join(process.cwd(), 'src', 'assets', 'Autorizatie_de_lucru_form.pdf')

        if (!fs.existsSync(filePath)) {
            //if the path does not exist
            return res.status(500).json({
                'error': 'Could not find PDF'
            });
        }
        const pdfBytes = await fillAutorizatiePdf(pdfData, filePath)

        //res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        // res.setHeader('Content-Disposition', 'attachement; filename="autorizatie.pdf"')
        //res.setHeader('Content-Type', 'application/pdf')
        // res.send(pdfBytes)

        //upload to storage
        const uniqueFileName = `autorizatie_lucru_${pdfData.emitent_nume}_${pdfData.sef_lucrare_nume_admitere}_${pdfData.admitent_nume}_${crypto.randomUUID()}.pdf`
        const storagePath = `initialAutorizatii/${uniqueFileName}`
        const {error: uploadError} = await supabase.storage.from('Documents').upload(storagePath, pdfBytes, {contentType: 'application/pdf'})
        if(uploadError)
            throw new Error('Internal Server Error')

        //insert metadata in db
        const {data: uploadMetadata, error: metadataError} = await supabase.from('autorizatii').insert({
            'user_id': userId,
            'storage_path': storagePath,
            'email_sef_lucrare': emailSefLucrare,
            'email_admitent': emailAdmitent
        }).select().maybeSingle()

        if(metadataError)
            throw new Error('Internal Server Error')
        if(!uploadMetadata)
            return res.status(400).json({error: 'Upload failed'})

        //create signedUrl
        const {data} = await supabase.storage.from('Documents').createSignedUrl(storagePath, 60 * 60)
        if(!data || !data.signedUrl)
            return res.status(400).json({error: 'Failed to upload to storage'})

        return res.status(200).json({success: true, message: 'Document creat si incarcat cu success', data: {metadata: uploadMetadata, signedUrl: data.signedUrl}})

    }catch(error: any){
        return res.status(500).json({error: error.message})
    }
}
