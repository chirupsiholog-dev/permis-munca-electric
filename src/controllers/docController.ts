import type { Request, Response } from "express";
import { supabase } from '../supabaseClient.js'

export const getAllDocuments = async (req: Request, res: Response) => {

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(400).json({
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
        'message': 'Sucessfully retrieved all documents',
        'data': data
    });
};

export const getDocumentOnId = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        return res.status(500).json({
            'error': 'Id was not provided'
        });
    }

    const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
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
        'message': 'Successfully retrieved document',
        'data': data
    });
}

export const postDocument = async (req: Request, res: Response) => {
    const { name, link, status, link_expiration_date, created_at } = req.body;

    console.log('name: ', name);
    console.log('exp date: ', link_expiration_date);

    if (!name || !link || !status || !link_expiration_date || !created_at) {
        return res.status(400).json({
            'error': 'Input data is invalid'
        });
    }

    const { data, error } = await supabase
    .from('documents')
    .insert({
        'name': name,
        'link': link,
        'status': status,
        'link_expiration_date': link_expiration_date,
        'created_at': created_at 
    })
    .select('*')
    .single();

    if (error) {
        return res.status(400).json({
            'error': 'Error while inserting the data'
        })
    }

    console.log('Inserted: ', data);

    return res.status(200).json({
        'message': 'Successfully inserted data',
        'data': data
    });

    
}