"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyAppointmentById = exports.getMyAppointments = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ======================================================
// GET USER APPOINTMENTS
// ======================================================
const getMyAppointments = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const appointments = await prisma.appointment.findMany({
            where: {
                userId,
            },
            orderBy: {
                scheduledStart: "asc",
            },
            include: {
                practitioner: {
                    select: {
                        id: true,
                        slug: true,
                        professionalTitle: true,
                        practitionerType: true,
                        profileImageUrl: true,
                        location: true,
                        sessionDurationMinutes: true,
                        sessionPrice: true,
                        currency: true,
                        user: {
                            select: {
                                fullName: true,
                            },
                        },
                    },
                },
                enquiry: {
                    select: {
                        id: true,
                        supportTopic: true,
                    },
                },
            },
        });
        return res.status(200).json({
            appointments,
        });
    }
    catch (error) {
        console.error("getMyAppointments:", error);
        return res.status(500).json({
            message: "Unable to load appointments",
        });
    }
};
exports.getMyAppointments = getMyAppointments;
// ======================================================
// GET SINGLE USER APPOINTMENT
// ======================================================
const getMyAppointmentById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const appointmentId = String(req.params.appointmentId);
        const appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                userId,
            },
            include: {
                practitioner: {
                    select: {
                        id: true,
                        slug: true,
                        professionalTitle: true,
                        practitionerType: true,
                        profileImageUrl: true,
                        location: true,
                        sessionDurationMinutes: true,
                        sessionPrice: true,
                        currency: true,
                        user: {
                            select: {
                                fullName: true,
                            },
                        },
                    },
                },
                enquiry: {
                    select: {
                        id: true,
                        supportTopic: true,
                        message: true,
                    },
                },
            },
        });
        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found",
            });
        }
        return res.status(200).json({
            appointment,
        });
    }
    catch (error) {
        console.error("getMyAppointmentById:", error);
        return res.status(500).json({
            message: "Unable to load appointment",
        });
    }
};
exports.getMyAppointmentById = getMyAppointmentById;
