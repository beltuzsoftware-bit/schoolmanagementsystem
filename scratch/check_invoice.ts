import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { invoiceNumber: 'PUR-1778467450498-702' },
    include: {
      transactions: true
    }
  });

  console.log(JSON.stringify(invoice, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
