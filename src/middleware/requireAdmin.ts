
import type { Request, Response, NextFunction } from "express";

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {

    if(!req.admin)
        return res.status(403).json({message: 'Forbidden'});

    next();
}
