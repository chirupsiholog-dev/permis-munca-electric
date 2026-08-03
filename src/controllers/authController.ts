import type { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import { redis } from '../lib/redisClient.js';
import crypto from 'node:crypto'
import { error } from 'node:console';


const secretKey = process.env.JWT_SECRET;


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
       return res.status(401).json({'error': 'Invalid credentials'});
    }

    const passwordsMatch = await bcrypt.compare(password, data.password_hash);

    if(!passwordsMatch){
        return res.status(401).json({'error': 'Invalid credentials'});
    }

    if(!secretKey){
        console.log('JWT Secret not loaded from env');
        throw new Error('JWT Secret not loaded from env');
    }

    //generate an id for the JWT token, so we can also pace it in redis when the user logs out, to blacklist the token
    const jwtId = crypto.randomUUID();

    const token = jwt.sign({userId: data?.id, jwtId: jwtId}, secretKey, {expiresIn: '1d'}); //expiresIn is injected into the {userId: data.id} payload
    return res.status(200).json({'success': true, 'token': token});

}

export const logout = async(req: Request, res: Response) => {

    //logout - user clicks logout, we place their jwt token in a redis blacklist
    try{

        if(req.user && req.jwtId && req.exp){
            const now = Math.floor(Date.now()/1000);
            //we set the ttl in redis to how many seconds there are until the jwt expires
            //while the jwt is not expired, we have to keep it in the blacklist, to mark it as logged out
            //after the jwt expires, it will invalid anyway, meaning a user cannot use it to log in, so there is no reason to keep it in redis anymore
            const ttl = req.exp - now;
            if(ttl > 0){
                await redis.setex(`bl_${req.jwtId}`, ttl, 'blacklist'); //jwtId - 'blacklist' pair, with ttl as expiration time
            }
        }

        return res.status(200).json({success: true, message: 'Logged out succesfully'})
    }catch(err){
        return res.status(500).json({error: 'Failed to process logout.'})
    }

}

export const signup = async(req: Request, res: Response) => {

    const {email, username, password} = req.body ?? {};

    if(typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string'){
        return res.status(400).json({error: 'Invalid signup fields'});
    }

    try{
        //check if either the email and username already exists in the db
        const{data: existingUsers, error: checkError} = await supabase.from('users').select('email, username')
                                                    .or(`email.eq.${email}, username.eq.${username}`);
        if(checkError){
            console.log('User check error:', checkError);
            return res.status(500).json({ error: 'Database check failed' });
        }

        //if there are already existing users with that username or email
        if(existingUsers && existingUsers.length > 0){
            const userWithSameEmail = existingUsers.filter(e => e.email === email);
            
            if(userWithSameEmail.length > 0){
                return res.status(409).json({error: 'Email is already used'})
            }else{
                return res.status(409).json({error: 'Username is already used'});
            }
        }

        //if the credentials are unused
        const password_hash = await bcrypt.hash(password, 10);
        const {error: insertError} = await supabase.from('users').insert({
            'email': email,
            'username': username,
            'password_hash': password_hash,
        })

        if(insertError){
            console.log('Insert error:', insertError);
            return res.status(500).json({error: 'Failed to process signup'});
        }

        return res.status(200).json({success: true});

    }catch(err: any){
        console.error('Catch block error:', err.message);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }

}

export const me = async (req: Request, res: Response) => {

    const userId = req.user;
    const {data: userData, error: userError} = await supabase.from('users').select('id, email, username').eq('id', userId).maybeSingle();
    if(userError){
        return res.status(500).json({error: 'Internal server error'})
    }

    if(!userData){
        return res.status(401).json({error: 'User not found'});
    }

    return res.status(200).json({success: true, 'data': userData})

}