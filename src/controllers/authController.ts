import type { Request, Response } from 'express';
import { supabase } from '../supabaseClient.js';
import crypto from 'node:crypto';

export const login = async(req: Request, res: Response) => {

    const {email, password} = req.body;

    if(!email || !password){
        res.status(401).json({'error': 'Credentials are mandatory'});
    }

    const {data, error} = await supabase.from('users').select('id, password_hash').eq('email', email).maybeSingle();

    if(error){
        res.status(500).json({'error': `DB Error: ${error.message}`});
    }

    if(!data){
        res.status(400).json({'error': 'User not found'});
    }

    if(crypto.hash('sha256', password) !== data?.password_hash){
        res.status(401).json({'error': 'Invalid credentials'});
    }



}