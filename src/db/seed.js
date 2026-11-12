const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding default settings...');

  // S20: fresh databases default to the OpenAI-compatible key path. No key
  // is seeded (there is nothing safe to seed); without one, audits degrade
  // to finding-based fallbacks until a key is configured.
  await prisma.settings.upsert({
    where: { key: 'llm_provider' },
    update: {},
    create: { key: 'llm_provider', value: 'openai' }
  });

  await prisma.settings.upsert({
    where: { key: 'openai_model' },
    update: {},
    create: { key: 'openai_model', value: 'gpt-4o-mini' }
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
