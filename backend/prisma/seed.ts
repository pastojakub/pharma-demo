import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('heslo123', 10);
  const localMspId = process.env.FABRIC_MSP_ID;

  const allUsers = [
    {
      email: 'vyrobca@pharma.sk',
      password: password,
      role: 'manufacturer',
      org: 'VyrobcaMSP',
    },
    {
      email: 'lekaren@pharma.sk',
      password: password,
      role: 'pharmacy',
      org: 'LekarenAMSP',
    },
    {
      email: 'lekarenb@pharma.sk',
      password: password,
      role: 'pharmacy',
      org: 'LekarenBMSP',
    },
    {
      email: 'sukl@pharma.sk',
      password: password,
      role: 'regulator',
      org: 'SUKLMSP',
    },
  ];

  // Only seed the user that belongs to THIS organization's infrastructure
  const userToSeed = allUsers.find(u => u.org === localMspId);

  if (userToSeed) {
    await prisma.user.upsert({
      where: { email: userToSeed.email },
      update: { org: userToSeed.org },
      create: userToSeed,
    });
    console.log(`✔ Seeded sovereign user for ${localMspId}: ${userToSeed.email}`);
  } else {
    console.warn(`⚠ No matching user found to seed for MSP ID: ${localMspId}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
