import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { redis } from '../lib/redisClient.js'

export interface CustomRequest extends Request{
    user: string,
    jwtId: string,
    exp: number
}

export const getCurrentUser = async(req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.header('Authorization')?.split(' ') ?? []; //authHeader[0] = 'Bearer', authHeader[1] = the token
    if(authHeader[0]?.toLowerCase() !== 'bearer' || !authHeader[1]){
        return res.status(401).json({'error': 'You are not authenticated'});
    }

    const token = authHeader[1];

    const secretKey = process.env.JWT_SECRET;
    if(!secretKey){
        console.log('JWT Secret not loaded from env');
        throw new Error('JWT Secret not loaded from env');
    }

    let payload;
    try{
        payload = jwt.verify(token, secretKey) as jwt.JwtPayload
    }catch(err){
        if(err instanceof jwt.TokenExpiredError)
            return res.status(401).json({'error': 'Token expired', 'code': 'token_expired'})
        return res.status(401).json({'error': 'Could not validate credentials'});
    }


    if(!payload.userId || !payload.jwtId)
        return res.status(401).json({'error': 'Could not validate credentials'});
    
    //check if the token is blacklisted => logged out
    const isBlacklisted = await redis.get(`bl_${payload.jwtId}`);
    console.log(isBlacklisted);
    if(isBlacklisted){
        return res.status(401).json({'error': 'Token has been invalidated (logged out)'});
    }

    req.user = payload.userId;
    req.jwtId = payload.jwtId;
    req.exp = payload.exp as number;

    next();
}