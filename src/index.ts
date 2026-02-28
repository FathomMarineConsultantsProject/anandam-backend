import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.route'


const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma Cloud Client
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());


//Routes
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});