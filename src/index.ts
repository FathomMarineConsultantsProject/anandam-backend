import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.route';
import moodRoutes from './routes/mood.route';
import profileRoutes from './routes/profile.route';
import dailyPlanRoutes from './routes/dailyPlan.route';
import habitRouter from './routes/habit.route';
import workHoursRouter from './routes/workHours.route';

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma Cloud Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// --- Health Check Route ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Welcome to the Anandam Seafarer App API!',
        status: 'Active',
        time: new Date().toISOString()
    });
});
//Routes
app.use('/api/auth', authRoutes);
app.use('/api/mood',moodRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/daily-plan', dailyPlanRoutes);
app.use('/api/habits', habitRouter);
app.use('/api/work-hours', workHoursRouter);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default app;