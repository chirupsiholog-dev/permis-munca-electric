import jwt from 'jsonwebtoken'
import type { JwtPayload } from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'

export interface CustomRequest extends Request{
    user: string
}

export const auth = async(req: Request, res: Response, next: NextFunction) => {

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

    let payload: string | JwtPayload;
    try{
        payload = jwt.verify(token, secretKey);
    }catch(err){
        if(err instanceof jwt.TokenExpiredError)
            return res.status(401).json({'error': 'Token expired', 'code': 'token_expired'})
        return res.status(401).json({'error': 'Could not validate credentials'});
    }

    if(typeof payload === 'string' || !payload.sub)
        return res.status(401).json({'error': 'Could not validate credentials'});

    (req as CustomRequest).user = payload.sub;

    next();
}