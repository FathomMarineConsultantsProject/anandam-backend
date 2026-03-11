import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request{
    user?: {
        userId: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction)=>{

    try {
        const authHeader = req.headers.authorization || req.headers.Authorization as string;

        if(!authHeader.startsWith('Bearer')){
            return res.status(401).json({error: 'Access denied. No token provided'});
        }
        // Extract just the token part
        const token = authHeader.split(' ')[1];
        // Verify the token using your secret key
        const decoded = jwt.verify(token,process.env.JWT_ACCESS_SECRET as string) as {userId: string};

        //Attaching decoded payload
        req.user = decoded;
        //  Pass control to the next function
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired access token.' });
    }
}