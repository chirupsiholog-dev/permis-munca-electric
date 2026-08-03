import type { Request, Response } from "express";
import { supabase } from '../lib/supabaseClient.js';
import fs from 'fs'; //for accessing the test pdf
import path from 'path';
import crypto from 'crypto';
import { createEnvelope, type Semnatar, getViewerLinks, downloadSigned } from "../lib/namirial.js";
import { fillPdf, generateZip } from "../lib/utils.js";

export const getAllDocuments = async (req: Request, res: Response) => {

    const userId = req.user;

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(500).json({
            'error': error
        });
    }

    if (!data) {
        return res.status(404).json({
            error: 'No documents found'
        });
    }

    console.log('found: ', data);

    return res.status(200).json({
        'success': true,
        'message': 'Sucessfully retrieved all documents',
        'data': data
    });
};

export const getDocumentOnId = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user;

    if (!id) {
        return res.status(500).json({
            'error': 'Id was not provided'
        });
    }

    const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

    if (error) {
        return res.status(400).json({
            'error': 'Error while retrieving document with id ', id
        });
    }

    if (!data) {
        return res.status(404).json({
            'error': 'No document was found with id ', id
        });
    }

    console.log('found: ', data);

    return res.status(200).json({
        'success': true,
        'message': 'Successfully retrieved document',
        'data': data
    });
}



export const postDocument = async (req: Request, res: Response) => {

    try {
        const {
            link_expiration_date, 
            emailSefLucrare, 
            numeSefLucrare, 
            prenumeSefLucrare,
            pdfData
        } = req.body;

        const userId = req.user;

        if (!emailSefLucrare || !numeSefLucrare || !prenumeSefLucrare || !link_expiration_date || !pdfData) {
            return res.status(400).json({
                'error': 'Input data is invalid'
            });
        }

        //find user email
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

        console.log('user email: ', userEmail);

        //create semnatari array
        const semnatari: Semnatar[] = [];

        //first semnatar is the emitent(user)
        semnatari.push({
            email: userEmail,
            nume: numeEmitent,
            prenume: prenumeEmitent,
            signatures: [{
                'page': 1, 'x': 398, 'y': 396
            }, {
                'page': 3, 'x': 248, 'y': 695
            }]
        });

        //second semnatar is sef_lucrare
        semnatari.push({
            email: emailSefLucrare,
            nume: numeSefLucrare,
            prenume: prenumeSefLucrare,
            signatures: [{
                'page': 1, 'x': 398, 'y': 374
            }, {
                'page': 2, 'x': 246, 'y': 376
            }, {
                'page': 2, 'x': 227, 'y': 65
            }]
        });

        //locate and read the file into a buffer
        const filePath = path.join(process.cwd(), 'src', 'assets', 'PERMIS_ELECTRIC_acroform.pdf') //specify the path - cwd() sters from the root of the project directory

        if (!fs.existsSync(filePath)) {
            //if the path does not exist
            return res.status(500).json({
                'error': 'Could not find PDF'
            });
        }

        pdfData.emitent_permis_nume = `${numeEmitent} ${prenumeEmitent}`;
        pdfData.sef_lucrare_nume = `${numeSefLucrare} ${prenumeSefLucrare}`;

        const pdfBuffer = await fillPdf(pdfData, filePath);

        //generate unique filename for storing inside of the bucket
        const uniqueFileName = `Permis ${numeSefLucrare} ${prenumeSefLucrare} - ${Date.now()}-${crypto.randomUUID()}.pdf`;
        const storagePath = `initialDocs/${uniqueFileName}`;

        //upload buffer to supabase storage
        const { error: storageError } = await supabase.storage
        .from('Documents') //the name of the bucket
        .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true //if a doc with the same name alr exists it gets replaced
        });

        if (storageError) {
            return res.status(500).json({
                'error': 'Error while saving the document to the bucket'
            });
        }

        //get the link generated for the uploaded file
        const { data: urlData } = supabase.storage
        .from('Documents')
        .getPublicUrl(storagePath);

        if (!urlData) {
            return res.status(500).json({
                'error': 'Could not get the URL where the doc is stored'
            });
        }

        const link_generat = urlData.publicUrl;


        const base64 = pdfBuffer.toString('base64');
        const appUrl = process.env.APP_URL;
        if(!appUrl){
            console.log('[namirial envelope] missing app url')
            throw new Error('[namirial webhook] missing app url');
        }
        const webhookSecret = process.env.WEBHOOK_SECRET;
        const callbackUrl = `${appUrl}/api/namirial/webhook/${webhookSecret}`;
        const accessCode = crypto.randomBytes(32).toString('base64').substring(0, 6);
        
        console.log(semnatari);
        
            const envelopeId = await createEnvelope(base64, semnatari, accessCode, callbackUrl, uniqueFileName);
            const viewerLinks = await getViewerLinks(envelopeId);
            if(!viewerLinks || !viewerLinks[0])
                throw new Error ('Failed to obtain emitent signing link');

            const emitentSigningLink = viewerLinks[0].link;

            const { data, error } = await supabase
            .from('documents')
            .insert({
                'name': uniqueFileName,
                'link_expiration_date': link_expiration_date,
                'link_generat': link_generat,
                'user_id': userId,
                'sef_lucrare_email': emailSefLucrare,
                'namirial_envelope_id': envelopeId,
                'cod_acces': accessCode,
                'emitent_signing_link': emitentSigningLink,
                'workflow_status': 'pending_emitent'
            })
            .select('*')
            .single();

            if (error) {
                return res.status(400).json({
                'error': error
                });
            }

            console.log('Inserted: ', data);

            return res.status(201).json({
                'success': true,
                'message': 'Successfully inserted data',
                'data': data
            });

    }catch(err: any){
        return res.status(500).json({error: err.message});
    }
}

export const documentsStats = async(req: Request, res: Response)=>{

    const userId = req.user;
    const {data: docData, error: docError} = await supabase.from('documents').select('workflow_status')
        .eq('user_id', userId);
    
    if(docError){
        return res.status(500).json({error: 'Internal server error'});
    }

    let total: number = 0;
    let completed: number = 0;
    let sefLucrareSignNeeded = 0;
    let emitentSignNeeded = 0;

    if(docData.length > 0){
        total = docData.length;
        completed = docData.filter(d => d.workflow_status === 'completed' || d.workflow_status === 'processing_final_zip').length;
        sefLucrareSignNeeded = docData.filter(d => d.workflow_status === 'pending_sef_lucrare' || d.workflow_status === 'processing_invite').length;
        emitentSignNeeded = docData.filter(d => d.workflow_status === 'pending_emitent').length;
    }

    return res.status(200).json({success: true, stats: {total, completed, sefLucrareSignNeeded, emitentSignNeeded}})
}

export const downloadDocument = async(req: Request, res: Response)=>{

    const userId = req.user;

    const docId = req.params.id as string | undefined;

    if(!docId){
        return res.status(400).json({error: 'Missing document ID'})
    }

    const{data: docData, error: docError} = await supabase.from('documents').select('namirial_envelope_id')
                            .eq('user_id', userId)
                            .not('link_semnat', 'is', null)
                            .eq('id', docId)
                            .eq('workflow_status', 'completed').maybeSingle();

    if(docError){
        return res.status(500).json({error: 'Internal server error'});
    }

    if(!docData){
        return res.status(404).json({error: 'Document not found'});
    }

    try{
        const documents = await downloadSigned(docData.namirial_envelope_id);
        const zipBuffer = await generateZip(documents);

        res.setHeader('Content-Disposition', `attachment; filename="permis_electric_munca_${docId}.zip"`)
        res.setHeader('Content-Type', 'application/zip');

        return res.send(zipBuffer);
    }catch(err: any){
        console.log(`Error downloading envelope: ${err.message}`)
        return res.status(500).json({error: 'Failed to download document'})
    }
}