import type { Request, Response } from "express";
import { supabase } from '../lib/supabaseClient.js';
import fs from 'fs'; //for accessing the test pdf
import path from 'path';
import crypto from 'crypto';
import { createEnvelope, type Semnatar } from "../lib/namirial.js";

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

    if (!data || data.length === 0) {
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
    const { status, link_expiration_date } = req.body; //add semnatari
    const userId = req.user;

    if (!status || !link_expiration_date) {
        return res.status(400).json({
            'error': 'Input data is invalid'
        });
    }

    //find user email
    //create semnatari array
    const semnatari: Semnatar[] = [];

    //locate and read the file into a buffer
    const filePath = path.join(process.cwd(), 'src', 'assets', 'recursivitate.pdf') //specify the path - cwd() sters from the root of the project directory

    if (!fs.existsSync(filePath)) {
        //if the path does not exist
        return res.status(500).json({
            'error': 'Could not find PDF'
        });
    }

    const pdfBuffer = fs.readFileSync(filePath);

    //generate unique filename for storing inside of the bucket
    const uniqueFileName = `Test - ${Date.now()} - ${crypto.randomUUID()}.pdf`;
    const storagePath = `initialDocs/${uniqueFileName}`;

    //upload buffer to supabase storage
    const { error: storageError } = await supabase.storage
    .from('Documents') //the name of the bucket
    .upload(storagePath, pdfBuffer, {
        contentType: 'application/json',
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

    const { data, error } = await supabase
    .from('documents')
    .insert({
        'name': uniqueFileName,
        'user_id': userId,
        'status': status,
        'link_generat': link_generat,
        'link_expiration_date': link_expiration_date,
    })
    .select('*')
    .single();

    if (error) {
        return res.status(400).json({
            'error': error
        })
    }

    console.log('Inserted: ', data);
    
    const base64 = pdfBuffer.toString('base64');
    const callbackUrl = 'http://localhost:3000/api/namirial/webhook'; //replace with real app url
    const accessCode = crypto.randomBytes(32).toString('base64').substring(0, 6);

    try{
        await createEnvelope(base64, semnatari, accessCode, callbackUrl, uniqueFileName);
    }catch(err: any){
        return res.status(500).json({error: err.message})
    }

    return res.status(201).json({
        'success': true,
        'message': 'Successfully inserted data',
        'data': data
    });

    
}