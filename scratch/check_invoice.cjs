const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const invoice = await prisma.purchaseInvoice.findFirst({
      where: { invoiceNumber: 'PUR-1778467450498-702' }
    });
    console.log('RESULT_START');
    console.log(JSON.stringify(invoice, null, 2));
    console.log('RESULT_END');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
