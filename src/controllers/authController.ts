import type { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken'

export const login = async(req: Request, res: Response) => {

    const {email, password} = req.body;

    if(!email || !password){
        return res.status(401).json({'error': 'Credentials are mandatory'});
    }

    const {data, error} = await supabase.from('users').select('id, password_hash').eq('email', email).maybeSingle();

    if(error){
        return res.status(500).json({'error': `DB Error: ${error.message}`});
    }

    if(!data){
       return res.status(400).json({'error': 'User not found'});
    }

    if(crypto.hash('sha256', password) !== data?.password_hash){
        return res.status(401).json({'error': 'Invalid credentials'});
    }

    const secretKey = process.env.JWT_SECRET;

    if(!secretKey){
        console.log('JWT Secret not loaded from env');
        throw new Error('JWT Secret not loaded from env');
    }

    const token = jwt.sign({userId: data?.id}, secretKey, {expiresIn: '1d'}); //expiresIn is injected into the {userId: data.id} payload
    return res.status(200).json({'success': true, 'token': token});

}