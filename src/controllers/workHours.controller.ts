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

// shift log by time

export const logShiftByTime = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;
        const { targetDate, startTime, endTime } = req.body; 

        if (!userId) return res.status(401).json({ error: "Unauthorized access" });
        if (!targetDate || !startTime || !endTime) {
            return res.status(400).json({ error: "Missing date, startTime, or endTime" });
        }

        const dateObj = new Date(targetDate as string);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ error: "Invalid date format." });
        }

        // Helper Function: STCW 30-Minute Rounding Logic (USING parseInt)
        const timeToIndex = (timeStr: string) => {
            if (!timeStr || typeof timeStr !== 'string') return NaN;
            
            const parts = timeStr.split(':');
            if (parts.length !== 2) return NaN;
            
            // parseInt safely ignores leading zeros!
            let hours = parseInt(parts[0], 10);
            let minutes = parseInt(parts[1], 10);

            if (isNaN(hours) || isNaN(minutes)) return NaN;

            if (minutes >= 45) {
                hours += 1;
                minutes = 0;
            } else if (minutes >= 15) {
                minutes = 30;
            } else {
                minutes = 0;
            }

            if (hours >= 24) return 48;
            return (hours * 2) + (minutes === 30 ? 1 : 0);
        };

        const startIndex = timeToIndex(startTime);
        const endIndex = timeToIndex(endTime);

        if (isNaN(startIndex) || isNaN(endIndex)) {
            return res.status(400).json({ error: "Could not parse time format. Please use 'HH:MM'." });
        }

        if (startIndex >= endIndex || startIndex < 0 || endIndex > 48) {
            return res.status(400).json({ error: "Invalid time range. Shift must be valid." });
        }

        // 1. Fetch the existing grid
        const existingGrid = await prisma.dailyWorkHours.findFirst({
            where: { userId: userId, date: dateObj }
        });

        // 2. Clone the existing array or make a blank one
        let updatedBlocks = existingGrid 
            ? [...existingGrid.workBlocks] 
            : new Array(48).fill(false);

        // 3. OVERLAP: Paint the new shift
        for (let i = startIndex; i < endIndex; i++) {
            updatedBlocks[i] = true;
        }

        let savedGrid;

        // 4. Update if exists, Create if new
        if (existingGrid) {
            savedGrid = await prisma.dailyWorkHours.update({
                where: { id: existingGrid.id },
                data: { workBlocks: updatedBlocks }
            });
        } else {
            savedGrid = await prisma.dailyWorkHours.create({
                data: { userId, date: dateObj, workBlocks: updatedBlocks }
            });
        }

        res.status(200).json({ 
            status: 'success', 
            message: `Shift merged! Blocks ${startIndex} to ${endIndex} are now active.`, 
            data: savedGrid 
        });
    } catch (error) {
        console.error("Log shift by time error:", error);
        res.status(500).json({ error: 'Failed to log shift' });
    }
};