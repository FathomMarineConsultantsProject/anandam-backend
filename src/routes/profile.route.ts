import { Router } from 'express';
import {  updateProfile, getMyProfile } from '../controllers/profile.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();


// Update an existing profile (PATCH /api/profile)
router.patch('/', authenticateToken, updateProfile);

// Get user profile detail
router.get('/', authenticateToken, getMyProfile);

export default router;