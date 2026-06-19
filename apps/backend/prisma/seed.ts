import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** Seed mínimo de Fase 1: un usuario admin de ejemplo. */
async function main() {
  const email = 'admin@clickpass.app';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Seed: admin ya existe, nada que hacer.');
    return;
  }
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash('admin12345', 12),
      firstName: 'Admin',
      lastName: 'Clickpass',
      role: 'ADMIN',
    },
  });
  console.log(`Seed: creado ${email} (password: admin12345)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
