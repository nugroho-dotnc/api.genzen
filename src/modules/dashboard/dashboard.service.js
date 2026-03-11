'use strict';

const prisma = require('../../config/prisma');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns { gte, lte } date range based on period string.
 * @param {string} period - 'today' | 'week' | 'month' | '3month' | 'year'
 * @returns {{ gte: Date, lte: Date }}
 */
const getDateRange = (period = 'year') => {
    const now = new Date();
    const lte = new Date(now);
    const gte = new Date(now);

    switch (period) {
        case 'today':
            gte.setHours(0, 0, 0, 0);
            lte.setHours(23, 59, 59, 999);
            break;
        case 'week':
            gte.setDate(gte.getDate() - 7);
            break;
        case 'month':
            gte.setDate(gte.getDate() - 30);
            break;
        case '3month':
            gte.setDate(gte.getDate() - 90);
            break;
        case 'year':
        default:
            gte.setDate(gte.getDate() - 365);
            break;
    }

    return { gte, lte };
};

/**
 * Parse "HH:MM" string to total minutes.
 * Returns null if invalid.
 * @param {string|null} timeStr
 * @returns {number|null}
 */
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(mins)) return null;
    return hours * 60 + mins;
};

// ─── Service Functions ─────────────────────────────────────────────────────────

/**
 * Get dashboard summary stats for a user within a time period.
 * - totalActivities : all activities in period
 * - doneActivities  : activities with status='done'
 * - focusTimeMinutes: total duration of 'schedule' type activities with startTime & endTime
 *
 * @param {string} userId
 * @param {string} period
 */
const getSummary = async (userId, period) => {
    const { gte, lte } = getDateRange(period);

    const activities = await prisma.activity.findMany({
        where: {
            userId,
            date: { gte, lte },
        },
        select: {
            status: true,
            type: true,
            startTime: true,
            endTime: true,
        },
    });

    let totalActivities = activities.length;
    let doneActivities = 0;
    let focusTimeMinutes = 0;

    for (const act of activities) {
        if (act.status === 'done') doneActivities++;

        if (act.type === 'schedule' && act.startTime && act.endTime) {
            const start = parseTimeToMinutes(act.startTime);
            const end = parseTimeToMinutes(act.endTime);
            if (start !== null && end !== null && end > start) {
                focusTimeMinutes += end - start;
            }
        }
    }

    return {
        period,
        totalActivities,
        doneActivities,
        focusTimeMinutes,
        focusTimeHours: parseFloat((focusTimeMinutes / 60).toFixed(2)),
    };
};

/**
 * Get heatmap data — activity count per day for a user within a time period.
 * Returns an array of { date: "YYYY-MM-DD", count: N }.
 *
 * @param {string} userId
 * @param {string} period
 */
const getHeatmap = async (userId, period) => {
    const { gte, lte } = getDateRange(period);

    const activities = await prisma.activity.findMany({
        where: {
            userId,
            date: { gte, lte },
        },
        select: { date: true },
        orderBy: { date: 'asc' },
    });

    // Group by date string "YYYY-MM-DD"
    const countMap = new Map();
    for (const act of activities) {
        const dateStr = act.date.toISOString().split('T')[0];
        countMap.set(dateStr, (countMap.get(dateStr) || 0) + 1);
    }

    const result = [];
    for (const [date, count] of countMap) {
        result.push({ date, count });
    }

    return result;
};

module.exports = { getSummary, getHeatmap };
