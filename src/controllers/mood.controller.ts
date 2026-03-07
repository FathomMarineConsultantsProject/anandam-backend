import { Response} from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
const prisma = new PrismaClient();

//CREATE MOOD LOG
export const createMoodLog = async(req: AuthRequest, res:Response):Promise<any> =>{

    try {
        const userId = req.user?.userId;
        const { moodScore, energyLevel, stressLevel} = req.body;

        if(moodScore<1 || moodScore>10 || energyLevel<0 || energyLevel>10 || stressLevel<0 || stressLevel>10)
        {
            return res.status(400).json({error: "Score must be between 1 and 10"});
        }

        const newLog = await prisma.moodLog.create({
            data:{userId, moodScore, energyLevel, stressLevel}
        });

        res.status(201).json({status: 'success', data: newLog});
    } catch (error) {
        console.error("Mood log error:", error);
        res.status(500).json({error:'Failed to save mood log'});
    }
};

//GET MOOD HISTORY
export const getMyMoodHistory = async(req:AuthRequest, res: Response): Promise<any> =>{
    try {
        const userId = req.params.userId as string;
        const history = await prisma.moodLog.findMany({
            where:{userId:userId},
            orderBy: {loggedAt: 'desc'}
        });
        res.status(200).json({status: 'success', data: history});
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch history'});
    }
};

