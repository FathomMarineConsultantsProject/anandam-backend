import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// 1. GET THE FULL GRID FOR EVERYONE ON A SPECIFIC DAY
export const getDailyGrid = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const targetDate = req.params.date as string;

        const gridDate = new Date(targetDate);
        gridDate.setUTCHours(0, 0, 0, 0);

        // Fetch all users and their 48-block array for today
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                rank: true,
                workHours: {
                    where: { date: gridDate },
                    select: { workBlocks: true } // Only grab the boxes!
                }
            }
        });

        // Format the response so it is super easy for React to draw the grid
        const formattedGrid = users.map(user => ({
            userId: user.id,
            fullName: user.fullName,
            rank: user.rank,
            // If they haven't saved anything today, send an empty 48-box array of 'false' (Rest)
            workBlocks: user.workHours.length > 0 
                ? user.workHours[0].workBlocks 
                : new Array(48).fill(false) 
        }));

        res.status(200).json({ status: 'success', data: formattedGrid });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch grid' });
    }
};

// 2. SAVE A USER'S GRID SELECTION 
export const saveMyGrid = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;
        const { targetDate, workBlocks } = req.body; 

        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        // Security check: Make sure the frontend sent exactly 48 boxes!
        if (!Array.isArray(workBlocks) || workBlocks.length !== 48) {
            return res.status(400).json({ error: "Invalid grid data. Must provide exactly 48 blocks." });
        }

        const gridDate = new Date(targetDate);
        gridDate.setUTCHours(0, 0, 0, 0);

        // UPSERT: Create the day if it's new, or update the existing boxes!
        const savedGrid = await prisma.dailyWorkHours.upsert({
            where: {
                userId_date: { userId, date: gridDate }
            },
            update: {
                workBlocks: workBlocks // Overwrite with the new blue/white boxes
            },
            create: {
                userId,
                date: gridDate,
                workBlocks: workBlocks
            }
        });

        res.status(200).json({ status: 'success', message: 'Grid saved successfully!', data: savedGrid });
    } catch (error) {
        console.error("Save grid error:", error);
        res.status(500).json({ error: 'Failed to save grid' });
    }
};

// GET MY WORK HOURS (Single User)
export const getMyWorkHours = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;
        const { date } = req.params;

        if (!userId) return res.status(401).json({ error: "Unauthorized access" });



        const targetDate = new Date(date as string);

        const myGrid = await prisma.dailyWorkHours.findUnique({
            where: {
                userId_date: { // Uses your @@unique constraint from schema!
                    userId: userId,
                    date: targetDate
                }
            }
        });

        // If they haven't painted their grid for this day yet, return an empty 48-block array
        if (!myGrid) {
            return res.status(200).json({ 
                status: 'success', 
                data: {
                    userId,
                    date: targetDate,
                    workBlocks: new Array(48).fill(false)
                } 
            });
        }

        res.status(200).json({ status: 'success', data: myGrid });
    } catch (error) {
        console.error("Fetch my work hours error:", error);
        res.status(500).json({ error: 'Failed to fetch your work hours' });
    }
};

// GET ALL MY WORK HOURS (Entire History)
export const getAllMyWorkHours = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ error: "Unauthorized access" });

        // Use findMany to get every single grid the user has ever saved
        const myGrids = await prisma.dailyWorkHours.findMany({
            where: {
                userId: userId
            },
            orderBy: {
                date: 'desc' // Sorts them from newest to oldest
            }
        });

        // Returns an array of all their saved grids!
        res.status(200).json({ status: 'success', data: myGrids });
    } catch (error) {
        console.error("Fetch all my work hours error:", error);
        res.status(500).json({ error: 'Failed to fetch your work hours history' });
    }
};