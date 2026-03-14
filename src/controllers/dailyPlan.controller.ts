import {Response} from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { dailyTemplates } from '../utils/templates';

const prisma = new PrismaClient();

//Get all static templates
export const getAllTemplates = async(req: AuthRequest, res: Response): Promise<any>=>{
    return res.status(200).json({status: 'success', data: dailyTemplates});
};


//Apply template to a day
export const applyTemplate= async(req: AuthRequest, res: Response):Promise<any>=>{
    try {
        const userId = req.user?.userId;

        const {templateId, targetDate} = req.body;

        //find the template
        const selectedTemplate = dailyTemplates.find(t=>t.id===templateId);
        if(!selectedTemplate)
        {
            return res.status(404).json({error:"Template not found"});
        }
        const planDate = new Date(targetDate);
        planDate.setUTCHours(0,0,0,0);

        //find and create dailyplan for the user on this exact date
        let dailyPlan = await prisma.dailyPlan.findFirst({
            where: {userId, date: planDate}
        });

        if(!dailyPlan)
        {
            dailyPlan = await prisma.dailyPlan.create({
                data: {userId, date: planDate, mainFocus: selectedTemplate.title}
            });
        }

        //Map the template into database-ready object
        const activitiesToInsert = selectedTemplate.activities.map(act =>{
            const [hours, minutes] = act.time.split(':').map(Number);

            //Create exact date and time for this activity
            const activityStartTime = new Date(planDate);
            activityStartTime.setUTCHours(hours, minutes, 0, 0);

            return {
                dailyPlanId: dailyPlan!.id,
                title: act.title,
                category: act.category,
                durationMinutes: act.durationMinutes,
                startTime: activityStartTime,
                isCompleted: false 
            };

        });
        //delete the existing activities
        await prisma.activity.deleteMany({ where: { dailyPlanId: dailyPlan.id } });

        //insert fresh activities
        await prisma.activity.createMany({ data: activitiesToInsert });

        res.status(200).json({ status: 'success', message: "Template applied successfully!" });
    } catch (error) {
        console.error("Apply template error:", error);
        res.status(500).json({ error: 'Failed to apply template' });

    }
}

//Get the specific day's plan
export const getDailyPlan = async(req: AuthRequest, res:Response): Promise<any> =>{
    try {
        
        const userId = req.user?.userId;
        const targetDate = req.params.date as string;

        const planDate = new Date(targetDate);
        planDate.setUTCHours(0,0,0,0);

        const plan = await prisma.dailyPlan.findFirst({
            where:{userId, date:planDate},
            include:{activities:{orderBy:{startTime:'asc'}}}
        });

        res.status(200).json({status: 'success', data: plan|| null});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch plan' });
    }
}

export const toggleActivityStatus = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;
        const activityId = req.params.activityId as string;
        const { isCompleted } = req.body; // true or false

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // 1. Fetch the activity AND its parent DailyPlan to check ownership
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: { dailyPlan: true } // We need this to see the userId!
        });

        // 2. Security Checks
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        if (activity.dailyPlan.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this activity' });
        }

        // 3. Ownership confirmed! Safely update the checkbox.
        const updatedActivity = await prisma.activity.update({
            where: { id: activityId },
            data: { isCompleted }
        });

        res.status(200).json({ status: 'success', data: updatedActivity });
    } catch (error) {
        console.error("Toggle activity error:", error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
};