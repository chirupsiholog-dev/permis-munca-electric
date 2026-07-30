import type { Request, Response } from "express";
import { supabase } from '../lib/supabaseClient.js';

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

    if (!data || data.length === 0) {
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
    const { name, link, status, link_expiration_date, created_at } = req.body;

    const userId = req.user;

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
        'user_id': userId,
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

    return res.status(201).json({
        'success': true,
        'message': 'Successfully inserted data',
        'data': data
    });

    
}