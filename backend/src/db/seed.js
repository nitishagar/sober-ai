const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('testpassword123', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@soberai.com' },
    update: {},
    create: {
      email: 'test@soberai.com',
      password: hashedPassword,
      name: 'Test User',
      company: 'SoberAI Test',
      role: 'USER',
      plan: 'FREE',
      emailVerified: true,
      isActive: true
    }
  });

  console.log('[Seed] Created test user:', testUser.email);

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@soberai.com' },
    update: {},
    create: {
      email: 'admin@soberai.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      emailVerified: true,
      isActive: true
    }
  });

  console.log('[Seed] Created admin user:', adminUser.email);

  console.log('[Seed] Database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: test@soberai.com');
  console.log('  Password: testpassword123');
  console.log('\nAdmin credentials:');
  console.log('  Email: admin@soberai.com');
  console.log('  Password: admin123');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
