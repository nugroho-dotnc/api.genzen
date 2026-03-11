'use strict';

const prisma = require('../../config/prisma');

const list = async (userId, filters = {}) => {
  const where = { userId };
  if (filters.activityId) where.activityId = filters.activityId;

  return prisma.activityLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    include: {
      activity: { select: { id: true, title: true, type: true } },
    },
  });
};

const getHeatmap = async (userId) => {
  // Ambil data batas 1 tahun terakhir agar query tidak terlalu berat
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // QUERY KE MODEL ACTIVITY LANGSUNG
  // Tarik semua activity yang berstatus 'done' dan sesuai rentang waktu
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      status: 'done', // Mencari status yang sudah selesai
      date: { gte: oneYearAgo } // Berdasarkan tanggal dijadwalkannya activity
    },
    select: { date: true }, // Hanya ambil waktu agar ringan
  });

  // Hitung jumlah completed task per hari berdasarkan date di Activity
  const heatmapData = {};
  activities.forEach(activity => {
    // Potong ISO string '2026-03-01T00:00:00.000Z' menjadi '2026-03-01'
    const dateStr = activity.date.toISOString().split('T')[0];
    
    if (heatmapData[dateStr]) {
      heatmapData[dateStr] += 1;
    } else {
      heatmapData[dateStr] = 1;
    }
  });

  // Format menjadi array yang diminta oleh library frontend
  const result = Object.keys(heatmapData).map(date => ({
    date: date,
    count: heatmapData[date]
  }));

  return result;
};


module.exports = { list, getHeatmap };
