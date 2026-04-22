import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as mariadb from 'mariadb';

async function main() {
  const connectionString = "mysql://pharma_user:pharma_password@localhost:3306/pharma_db";
  const adapter = new PrismaMariaDb(connectionString);
  const prisma = new PrismaClient({ adapter });

  try {
    const order = await prisma.orderRequest.findUnique({
      where: { requestId: 'REQ-828836' }
    });
    console.log('ORDER:', JSON.stringify(order, null, 2));
    
    const offer = await prisma.priceOffer.findFirst({
      where: { batchID: 'REQ-828836' }
    });
    console.log('OFFER:', JSON.stringify(offer, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
