import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
const prisma = new PrismaClient();


// UPDATE PROFILE
export const updateProfile = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;
        const { 
            fullName, email, rank, vessel, contractStart, contractEnd,
            contactNumber, emergencyContact, homeCountry
        } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized access" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId }, 
            data: {
                fullName,
                email,
                rank,
                vessel,
                contractStart,
                contractEnd,
                contactNumber,
                emergencyContact,
                homeCountry
            },
            select: { // Tells Prisma exactly what to return to Postman
                id: true, email: true, fullName: true, rank: true, vessel: true,
                contactNumber: true, emergencyContact: true, homeCountry: true,
                contractStart: true, contractEnd: true
            }
        });

        res.status(200).json({ status: 'success', data: updatedUser });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

// GET PROFILE DETAILS OF USER
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const userId = req.user?.userId;

        const userProfile = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true, email: true, fullName: true, rank: true, vessel: true,
                contactNumber: true, emergencyContact: true, homeCountry: true,
                contractStart: true, contractEnd: true
            }
        });

        if (!userProfile) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json({ status: 'success', data: userProfile });
    } catch (error) {
        console.error("Fetch profile error:", error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

