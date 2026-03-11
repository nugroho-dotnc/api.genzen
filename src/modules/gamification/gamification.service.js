'use strict';

const prisma = require('../../config/prisma');

const syncTodayStreak = async (userId, targetDate) => {
  // Normalisasi tanggal target ke jam 00:00:00 UTC (Sesuai cara Prisma menyimpan date)
  const today = new Date(targetDate);
  today.setUTCHours(0, 0, 0, 0);

  // 1. Ambil data gamifikasi user
  let gamification = await prisma.gamification.findUnique({ where: { userId } });
  
  if (!gamification) {
    gamification = await prisma.gamification.create({ 
      data: { userId, currentStreak: 0, longestStreak: 0 } 
    });
  }

  // 2. Cek apakah ADA minimal 1 activity yang "done" pada tanggal tersebut
  const doneTodayCount = await prisma.activity.count({
    where: { 
      userId, 
      status: 'done', 
      date: today 
    }
  });

  const lastUpdate = gamification.lastUpdateDate ? new Date(gamification.lastUpdateDate) : null;
  if (lastUpdate) lastUpdate.setUTCHours(0, 0, 0, 0);

  const isUpdatedToday = lastUpdate && lastUpdate.getTime() === today.getTime();

  // 3. SKENARIO A: Ada task selesai, TAPI streak hari ini belum tercatat (User baru klik Done)
  if (doneTodayCount > 0 && !isUpdatedToday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isUpdatedYesterday = lastUpdate && lastUpdate.getTime() === yesterday.getTime();

    // Lanjut streak jika kemarin ngerjain, jika tidak reset dari 1
    const newStreak = isUpdatedYesterday ? gamification.currentStreak + 1 : 1;
    const newLongest = Math.max(newStreak, gamification.longestStreak);

    await prisma.gamification.update({
      where: { userId },
      data: { 
        currentStreak: newStreak, 
        longestStreak: newLongest, 
        lastUpdateDate: today 
      }
    });
  } 
  
  // 4. SKENARIO B: TIDAK ADA task selesai, TAPI streak terlanjur tercatat 
  // (User melakukan UNDO / mengembalikan status ke pending/skipped)
  else if (doneTodayCount === 0 && isUpdatedToday) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Rollback streak (tidak boleh minus)
    const revertedStreak = Math.max(0, gamification.currentStreak - 1);
    
    // Catatan: longestStreak tidak di-rollback karena itu adalah rekor historis tertinggi

    await prisma.gamification.update({
      where: { userId },
      data: { 
        currentStreak: revertedStreak, 
        // Jika streak jadi 0, hapus tanggalnya. Jika masih ada, mundurkan ke kemarin
        lastUpdateDate: revertedStreak > 0 ? yesterday : null 
      }
    });
  }
  
  // Jika (doneTodayCount > 0 && isUpdatedToday) -> User mengerjakan task ke-2, ke-3 hari ini (Biarkan saja)
  // Jika (doneTodayCount === 0 && !isUpdatedToday) -> User memang belum mengerjakan apa-apa (Biarkan saja)
};

// Fungsi untuk mengambil data gamifikasi user saat ini
const getGamification = async (userId) => {
  let gamification = await prisma.gamification.findUnique({
    where: { userId },
  });

  // Jika user belum punya data (user lama atau baru daftar), buatkan default-nya
  if (!gamification) {
    gamification = await prisma.gamification.create({
      data: { userId, currentStreak: 0, longestStreak: 0 },
    });
  }

  return gamification;
};

module.exports = { syncTodayStreak, getGamification };