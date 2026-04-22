import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('heslo123', 10);

  // 1. Výrobca (Manufacturer)
  await prisma.user.upsert({
    where: { email: 'vyrobca@pharma.sk' },
    update: { org: 'VyrobcaMSP' },
    create: {
      email: 'vyrobca@pharma.sk',
      password: password,
      role: 'manufacturer',
      org: 'VyrobcaMSP',
    },
  });

  // 2. Lekáreň A (Pharmacy A)
  await prisma.user.upsert({
    where: { email: 'lekaren@pharma.sk' },
    update: { org: 'LekarenAMSP' },
    create: {
      email: 'lekaren@pharma.sk',
      password: password,
      role: 'pharmacy',
      org: 'LekarenAMSP',
    },
  });

  // 2b. Lekáreň B (Pharmacy B)
  await prisma.user.upsert({
    where: { email: 'lekarenb@pharma.sk' },
    update: { org: 'LekarenBMSP' },
    create: {
      email: 'lekarenb@pharma.sk',
      password: password,
      role: 'pharmacy',
      org: 'LekarenBMSP',
    },
  });

  // 3. Regulačný orgán (ŠÚKL / Regulator)
  await prisma.user.upsert({
    where: { email: 'sukl@pharma.sk' },
    update: { org: 'SUKLMSP' },
    create: {
      email: 'sukl@pharma.sk',
      password: password,
      role: 'regulator',
      org: 'SUKLMSP',
    },
  });

  console.log('✔ Seedovanie používateľov dokončené.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
