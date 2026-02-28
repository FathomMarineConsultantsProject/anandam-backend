import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma 7 Cloud Client
const prisma = new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL
}).$extends(withAccelerate());

// Middleware
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Anandam API is running' });
});

// Quick test to verify prisma
app.get('/api/users/count', async (req, res) => {
    try {
        const count = await prisma.user.count();
        res.json({ status: 'success', userCount: count });
    } catch (error) {
        console.error("Database connection failed:", error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});