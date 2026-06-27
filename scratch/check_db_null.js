
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const school = await prisma.school.findFirst();
    if (!school) {
      console.log("No school found");
      return;
    }

    console.log("Attempting direct sale record...");
    // Try to create an invoice with studentId: null
    const invoice = await prisma.accessoryInvoice.create({
      data: {
        schoolId: school.id,
        studentId: null,
        invoiceNumber: "TEST-" + Date.now(),
        items: [],
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        paymentMode: "Cash"
      }
    });
    console.log("Success! studentId: null is supported.");
    await prisma.accessoryInvoice.delete({ where: { id: invoice.id } });
  } catch (err) {
    console.error("FAILED:", err.message);
    if (err.message.includes("Foreign key constraint")) {
      console.log("The database still requires a studentId.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

check();
