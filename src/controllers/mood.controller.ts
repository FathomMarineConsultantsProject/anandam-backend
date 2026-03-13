import { Response} from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
const prisma = new PrismaClient();

//CREATE MOOD LOG
export const createMoodLog = async(req: AuthRequest, res:Response):Promise<any> =>{

    try {
        const userId = req.user?.userId;
        const { 
            moodScore, energyLevel, stressLevel, 
            hoursOfSleep, currentWorkload, feeling, additionalThoughts, journalEntry 
        } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized: Invalid token payload" });
        }

        // Make sure they sent at least ONE piece of data before saving a blank row
        if (
            moodScore === undefined && energyLevel === undefined && stressLevel === undefined && 
            hoursOfSleep === undefined && !currentWorkload && !feeling && !additionalThoughts && !journalEntry
        ) {
            return res.status(400).json({ error: "Please provide at least one field to log." });
        }

        // Validate numbers ONLY if the user decided to provide them
        if (moodScore !== undefined && (moodScore < 1 || moodScore > 5)) {
            return res.status(400).json({error: "Mood score must be between 1 and 5"});
        }
        if (energyLevel !== undefined && (energyLevel < 0 || energyLevel > 5)) {
            return res.status(400).json({error: "Energy level must be between 0 and 5"});
        }
        if (stressLevel !== undefined && (stressLevel < 0 || stressLevel > 5)) {
            return res.status(400).json({error: "Stress level must be between 0 and 5"});
        }
        const newLog = await prisma.moodLog.create({
            data: { 
                userId, 
                moodScore, 
                energyLevel, 
                stressLevel,
                hoursOfSleep,
                currentWorkload,
                feeling,
                additionalThoughts,
                journalEntry
            }
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
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        const history = await prisma.moodLog.findMany({
            where:{userId:userId},
            orderBy: {loggedAt: 'desc'}
        });
        res.status(200).json({status: 'success', data: history});
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch history'});
    }
};

