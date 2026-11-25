"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteHabit = exports.toggleHabit = exports.getDailyHabits = exports.createHabit = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 1. CREATE A NEW HABIT
const createHabit = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { title, category } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const newHabit = await prisma.habit.create({
            data: { userId, title, category }
        });
        res.status(201).json({ status: 'success', data: newHabit });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create habit' });
    }
};
exports.createHabit = createHabit;
// 2. GET HABITS & CALCULATE DAILY PERCENTAGE
const getDailyHabits = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const targetDate = req.params.date;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const planDate = new Date(targetDate);
        planDate.setUTCHours(0, 0, 0, 0);
        // Fetch ALL of the user's habits
        const habits = await prisma.habit.findMany({
            where: { userId }
        });
        // Fetch ONLY the checkmarks for this specific date
        const completions = await prisma.habitCompletion.findMany({
            where: {
                habit: { userId },
                completedDate: planDate
            }
        });
        const completedHabitIds = completions.map(c => c.habitId);
        const habitsWithStatus = habits.map(habit => ({
            id: habit.id,
            title: habit.title,
            isCompleted: completedHabitIds.includes(habit.id)
        }));
        // CALCULATE THE PERCENTAGE!
        const totalHabits = habits.length;
        const completedCount = completions.length;
        const percentageCompleted = totalHabits === 0 ? 0 : Math.round((completedCount / totalHabits) * 100);
        res.status(200).json({
            status: 'success',
            data: {
                percentageCompleted,
                totalHabits,
                completedCount,
                habits: habitsWithStatus
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch habits' });
    }
};
exports.getDailyHabits = getDailyHabits;
// 3. TOGGLE HABIT FOR A SPECIFIC DAY
const toggleHabit = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const habitId = req.params.habitId;
        const { targetDate } = req.body;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const habit = await prisma.habit.findUnique({ where: { id: habitId } });
        if (!habit || habit.userId !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const planDate = new Date(targetDate);
        planDate.setUTCHours(0, 0, 0, 0);
        const existingCompletion = await prisma.habitCompletion.findFirst({
            where: {
                habitId: habitId,
                completedDate: planDate
            }
        });
        if (existingCompletion) {
            await prisma.habitCompletion.delete({ where: { id: existingCompletion.id } });
            return res.status(200).json({ status: 'success', message: 'Habit unchecked', isCompleted: false });
        }
        else {
            await prisma.habitCompletion.create({
                // FIX: Use 'completedDate' instead of 'date'
                data: { habitId, completedDate: planDate }
            });
            return res.status(200).json({ status: 'success', message: 'Habit completed!', isCompleted: true });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to toggle habit' });
    }
};
exports.toggleHabit = toggleHabit;
// 4. DELETE A HABIT ENTIRELY
const deleteHabit = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const habitId = req.params.habitId;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        // Prisma's "onDelete: Cascade" will automatically delete all checkmarks for this habit!
        await prisma.habit.deleteMany({
            where: { id: habitId, userId }
        });
        res.status(200).json({ status: 'success', message: 'Habit deleted' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete habit' });
    }
};
exports.deleteHabit = deleteHabit;
