const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.orderRequest.findUnique({
    where: { requestId: 'REQ-828836' }
  });
  console.log(JSON.stringify(order, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
