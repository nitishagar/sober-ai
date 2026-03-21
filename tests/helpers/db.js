const { PrismaClient } = require('@prisma/client');

let prisma;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
  }
  return prisma;
}

async function truncateAll() {
  const db = getPrisma();
  // Order matters for FK constraints — delete children before parents
  await db.report.deleteMany();
  await db.settings.deleteMany();
}

async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

module.exports = { getPrisma, truncateAll, disconnect };
