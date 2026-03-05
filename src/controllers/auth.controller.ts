import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'


const prisma = new PrismaClient();

//SIGN UP
export const registerUser = async( req: Request, res: Response): Promise<any>=>{
    try {
        const {email, password, fullName, rank, vessel} = req.body;

        const existingUser = await prisma.user.findUnique({where:{email}});

        if(existingUser)
        {
            return res.status(400).json({error: 'Email already registered'});
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = await prisma.user.create({
            data:{email, passwordHash, fullName, rank, vessel}
        });
        //Generate access and refresh token
        const {accessToken, refreshToken} = generateToken(newUser.id)
        
        await prisma.refreshToken.create({
            data:{
                token: refreshToken,
                userId: newUser.id,
                expiresAt: new Date(Date.now() +7 * 24 * 60 * 60 * 1000)
            }
        });
        res.status(201).json({
            status: 'success',
            accessToken,
            refreshToken,
            user: {id: newUser.id, email: newUser.email, fullName: newUser.fullName}
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
};

//LOGIN USER
export const loginUser= async(req:Request, res: Response):Promise<any>=>{
    try {
        const {email, password} = req.body;

        const user = await prisma.user.findUnique({where:{email}});

        if(!user)
        {
            return res.status(404).json({error:'User not found'})
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if(!isMatch)
        {
            return res.status(401).json({error:'Invalid credentials'});
        }

        const {accessToken, refreshToken} = generateToken(user.id);

        // Save this new device's session to the database
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        

        return res.status(200).json({
            status:'success',
            accessToken,
            refreshToken,
            user: {id: user.id, email: user.email, fullName: user.fullName}
        })
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
}

//Helper function to generate tokens
const generateToken = (userId: string) =>{
    const accessToken = jwt.sign(
        {userId},
        process.env.JWT_SECRET as string,
        {expiresIn: '15m'}
    )

    const refreshToken = jwt.sign(
        {userId},
        process.env.JWT_SECRET as string,
        {expiresIn: '7d'}
    );

    return {accessToken, refreshToken};
}

//Refresh token endpoint
export const refreshAccessToken = async (req: Request, res: Response): Promise<any> =>{
    try {
        const {refreshToken} = req.body;

        if(!refreshToken)
        {
            return res.status(401).json({error:"Refresh token is expired"});
        }

        //Check if the token is actually exist in the database
        const storedToken = await prisma.refreshToken.findUnique({
            where:{token: refreshToken}
        });

        if(!storedToken)
        {
            return res.status(403).json({error: "Invalid refresh token"});
        }

        //verify if the token hasn't expired
        jwt.verify(refreshToken, process.env.JWT_SECRET as string, async (err, decoded: any)=>{
            if(err)
            {
                await prisma.refreshToken.delete({where:{token: refreshToken}});
                return res.status(403).json({error:"Refresh token expired. Please login again"});
            }
            const newAccessToken = jwt.sign(
                {userId: decoded.userId},
                process.env.JWT_SECRET as string,
                {expiresIn: '15m'}
            );
            res.status(200).json({
                status: 'success',
                accessToken: newAccessToken
            });
        });
    } catch (error) {
        console.error("Refresh error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
}