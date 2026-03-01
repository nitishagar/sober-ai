const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding default settings...');

  await prisma.settings.upsert({
    where: { key: 'llm_provider' },
    update: {},
    create: { key: 'llm_provider', value: 'ollama_local' }
  });

  await prisma.settings.upsert({
    where: { key: 'ollama_endpoint' },
    update: {},
    create: { key: 'ollama_endpoint', value: 'http://localhost:11434' }
  });

  console.log('[Seed] Done.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
