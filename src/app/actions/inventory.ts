'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// --- HELPERS ---

async function getSchoolAccessories(schoolId: string) {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { accessories: true }
    });
    let acc: any = school?.accessories || {};
    if (typeof acc !== 'object') acc = {};
    return acc;
}

async function updateSchoolAccessories(schoolId: string, updates: any) {
    const currentAcc = await getSchoolAccessories(schoolId);
    await prisma.school.update({
        where: { id: schoolId },
        data: {
            accessories: {
                ...currentAcc,
                ...updates
            }
        }
    });
}

// --- SETTINGS ---


export async function getInventorySettings(schoolId: string) {
    if (!schoolId) return null;
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { accessories: true }
    });
    const acc = (school?.accessories as any) || {};
    return acc.inventorySettings || null;
}

export async function saveInventorySettings(schoolId: string, settings: any) {
    if (!schoolId) return { success: false, error: "School ID required" };
    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { accessories: true }
        });
        const currentAcc: any = school?.accessories || {};
        await prisma.school.update({
            where: { id: schoolId },
            data: {
                accessories: {
                    ...currentAcc,
                    inventorySettings: settings
                }
            }
        });
        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.error('Failed to save inventory settings:', error);
        return { success: false };
    }
}


export async function deleteInventoryProduct(schoolId: string, productId: string) {
    try {
        await prisma.$transaction(async (tx: any) => {
            // Delete related transactions first
            await tx.stockTransaction.deleteMany({
                where: { productId }
            });

            // Delete the product
            await tx.inventoryProduct.delete({
                where: { id: productId }
            });
        });

        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.warn("Prisma deleteInventoryProduct failed, falling back to JSON storage", error);
        try {
            const currentAcc = await getSchoolAccessories(schoolId);
            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];

            const filteredProducts = products.filter((p: any) => p.id !== productId);
            const filteredTransactions = transactions.filter((t: any) => t.productId !== productId);

            await updateSchoolAccessories(schoolId, {
                inventoryProducts: filteredProducts,
                stockTransactions: filteredTransactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true };
        } catch (e: any) {
            console.error("Failed to delete product in fallback:", e);
            return { success: false, error: "Failed to delete product. " + e.message };
        }
    }
}

export async function deleteVendor(schoolId: string, vendorId: string) {
    try {
        if ((prisma as any).vendor) {
            await (prisma as any).vendor.delete({
                where: { id: vendorId }
            });
        } else {
            // Fallback for school.accessories
            const school = await prisma.school.findUnique({
                where: { id: schoolId },
                select: { accessories: true }
            });
            let currentAcc: any = school?.accessories || {};
            const vendors = Array.isArray(currentAcc.vendors) ? [...currentAcc.vendors] : [];
            const filtered = vendors.filter((v: any) => v.id !== vendorId);
            
            await prisma.school.update({
                where: { id: schoolId },
                data: {
                    accessories: {
                        ...currentAcc,
                        vendors: filtered
                    }
                }
            });
        }
        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.error("Failed to delete vendor:", error);
        return { success: false };
    }
}

export async function getInventoryProducts(schoolId: string) {
    try {
        const products = await prisma.inventoryProduct.findMany({
            where: { schoolId },
            include: {
                transactions: {
                    where: { type: 'INWARD' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { name: 'asc' }
        });

        let vendors: any[] = [];
        try {
            if ((prisma as any).vendor) {
                vendors = await (prisma as any).vendor.findMany({
                    where: { schoolId }
                });
            }
        } catch (e) {
            console.warn("Vendor table not found, falling back to transactions");
        }

        return products.map((p: any) => {
            const uniqueVendors = Array.from(new Set(
                p.transactions
                    .map((t: any) => t.entityName)
                    .filter((name: any): name is string => !!name && name.trim() !== '' && name !== 'Opening Stock')
            ));

            const lastVendorName = p.transactions[0]?.entityName;
            const vendorDetails = vendors.find(v => v.name === lastVendorName);
            
            return {
                ...p,
                vendorName: lastVendorName || null,
                allVendors: uniqueVendors,
                vendorPhone: vendorDetails?.phone || null,
                vendorEmail: vendorDetails?.email || null
            };
        });
    } catch (dbError) {
        console.warn("Prisma inventoryProduct findMany failed, falling back to school.accessories JSON storage", dbError);
        try {
            const acc = await getSchoolAccessories(schoolId);
            const products = Array.isArray(acc.inventoryProducts) ? acc.inventoryProducts : [];
            const transactions = Array.isArray(acc.stockTransactions) ? acc.stockTransactions : [];
            const vendors = Array.isArray(acc.vendors) ? acc.vendors : [];

            const mappedProducts = products.map((p: any) => {
                const productTransactions = transactions
                    .filter((t: any) => t.productId === p.id && t.type === 'INWARD')
                    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                const uniqueVendors = Array.from(new Set(
                    productTransactions
                        .map((t: any) => t.entityName)
                        .filter((name: any): name is string => !!name && name.trim() !== '' && name !== 'Opening Stock')
                ));

                const lastVendorName = productTransactions[0]?.entityName;
                const vendorDetails = vendors.find((v: any) => v.name === lastVendorName);

                return {
                    ...p,
                    vendorName: lastVendorName || null,
                    allVendors: uniqueVendors,
                    vendorPhone: vendorDetails?.phone || null,
                    vendorEmail: vendorDetails?.email || null
                };
            });

            return mappedProducts.sort((a: any, b: any) => a.name.localeCompare(b.name));
        } catch (e) {
            console.error("Failed to load inventory products from JSON fallback:", e);
            return [];
        }
    }
}

export async function getVendors(schoolId: string) {
    let vendors: any[] = [];
    try {
        if ((prisma as any).vendor) {
            vendors = await (prisma as any).vendor.findMany({
                where: { schoolId },
                orderBy: { name: 'asc' }
            });
            if (vendors.length > 0) return vendors;
        }
    } catch (e) {
        console.warn("Vendor table not found or empty");
    }

    try {
        // Fallback: Get from school.accessories
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { accessories: true }
        });

        if (school?.accessories && typeof school.accessories === 'object') {
            const acc = school.accessories as any;
            if (acc.vendors && Array.isArray(acc.vendors)) {
                return acc.vendors;
            }
        }
    } catch (e) {
        console.warn("School accessories query failed in getVendors");
    }

    try {
        // Secondary Fallback: Names from transactions
        const transactions = await prisma.stockTransaction.findMany({
            where: { schoolId, type: 'INWARD', entityName: { not: null } },
            select: { entityName: true },
            distinct: ['entityName']
        });
        return transactions.map((t: any) => ({ id: t.entityName, name: t.entityName }));
    } catch (e) {
        // Tertiary Fallback: from JSON accessories transactions
        try {
            const acc = await getSchoolAccessories(schoolId);
            const transactions = Array.isArray(acc.stockTransactions) ? acc.stockTransactions : [];
            const uniqueNames = Array.from(new Set(
                transactions
                    .filter((t: any) => t.type === 'INWARD' && t.entityName)
                    .map((t: any) => t.entityName)
            )) as string[];
            return uniqueNames.map(name => ({ id: name, name }));
        } catch (innerErr) {
            return [];
        }
    }
}

export async function addVendor(data: {
    schoolId: string;
    name: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    gstNo?: string;
    notes?: string;
}) {
    try {
        if ((prisma as any).vendor) {
            const vendor = await (prisma as any).vendor.create({ data });
            return { success: true, vendor };
        }
    } catch (e) {
        console.warn("Falling back to school accessories for vendor storage");
    }

    // Zero-migration fallback: Store in school.accessories
    const school = await prisma.school.findUnique({
        where: { id: data.schoolId },
        select: { accessories: true }
    });

    let currentAcc: any = school?.accessories || {};
    if (typeof currentAcc !== 'object') currentAcc = {};
    
    const newVendor = {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        createdAt: new Date().toISOString()
    };

    const vendors = Array.isArray(currentAcc.vendors) ? [...currentAcc.vendors] : [];
    
    // Update if exists by name, otherwise add
    const existingIndex = vendors.findIndex((v: any) => v.name?.toLowerCase() === data.name.toLowerCase());
    if (existingIndex >= 0) {
        vendors[existingIndex] = { ...vendors[existingIndex], ...newVendor };
    } else {
        vendors.push(newVendor);
    }

    await prisma.school.update({
        where: { id: data.schoolId },
        data: {
            accessories: {
                ...currentAcc,
                vendors: vendors
            }
        }
    });

    return { success: true, vendor: newVendor };
}


export async function updateVendor(schoolId: string, vendorId: string, data: any) {
    try {
        if ((prisma as any).vendor) {
            await (prisma as any).vendor.update({
                where: { id: vendorId },
                data
            });
            return { success: true };
        }
    } catch (e) {
        console.warn("Falling back to school accessories for vendor update");
    }

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { accessories: true }
    });

    let currentAcc: any = school?.accessories || {};
    if (typeof currentAcc !== 'object') currentAcc = {};
    
    const vendors = Array.isArray(currentAcc.vendors) ? [...currentAcc.vendors] : [];
    const index = vendors.findIndex((v: any) => v.id === vendorId);

    if (index !== -1) {
        vendors[index] = { ...vendors[index], ...data };
        
        await prisma.school.update({
            where: { id: schoolId },
            data: {
                accessories: {
                    ...currentAcc,
                    vendors: vendors
                }
            }
        });
        return { success: true };
    }

    return { success: false, error: "Supplier not found" };
}

export async function getSchoolStockTransactions(schoolId: string) {
    try {
        // 1. Fetch all stock transactions
        const transactions = await prisma.stockTransaction.findMany({
            where: { schoolId },
            include: { product: true },
            orderBy: { date: 'desc' }
        });

        // 2. Optimization: Batch fetch all potentially related Accessory Invoices (Sales)
        const saleTxIds = transactions
            .filter((tx: any) => tx.type === 'OUTWARD' && tx.referenceId)
            .map((tx: any) => tx.referenceId) as string[];
        
        let saleInvoices: any[] = [];
        if (saleTxIds.length > 0) {
            saleInvoices = await prisma.accessoryInvoice.findMany({
                where: { id: { in: saleTxIds } },
                include: { student: true }
            });
        }

        // 3. Optimization: Batch fetch/prepare all Purchase Invoices (Purchases)
        let purchaseInvoices: any[] = [];
        try {
            if ((prisma as any).purchaseInvoice) {
                purchaseInvoices = await (prisma as any).purchaseInvoice.findMany({
                    where: { schoolId }
                });
            }
        } catch (e) {}

        // Get fallback invoices from school.accessories
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { accessories: true }
        });
        const acc: any = school?.accessories || {};
        const fallbackInvoices = Array.isArray(acc.purchaseInvoices) ? acc.purchaseInvoices : [];
        const allPurchaseInvoices = [...purchaseInvoices, ...fallbackInvoices];

        // 4. Enrich transactions with pre-fetched data
        const enriched = transactions.map((tx: any) => {
            // Enrich OUTWARD (Sales)
            if (tx.type === 'OUTWARD' && tx.referenceId) {
                const invoice = saleInvoices.find(inv => inv.id === tx.referenceId);
                if (invoice) {
                    return {
                        ...tx,
                        invoice,
                        discount: (invoice as any).discount || 0,
                        paymentMode: (invoice as any).paymentMode || null,
                        subtotal: (invoice as any).subtotal || tx.totalAmount,
                        student: (invoice as any).student || null
                    };
                }
            }
            
            // Enrich INWARD (Purchases)
            if (tx.type === 'INWARD') {
                let invNo = null;
                const invMatch = tx.notes?.match(/\[INV: (PUR-.*?)\]/);
                if (invMatch) invNo = invMatch[1];

                const invoice = allPurchaseInvoices.find((inv: any) => 
                    inv.id === tx.purchaseInvoiceId || 
                    (invNo && inv.invoiceNumber === invNo) ||
                    (tx.referenceId && inv.invoiceNumber === tx.referenceId) ||
                    (inv.vendorName === tx.entityName && Math.abs((inv.totalAmount || 0) - (tx.totalAmount || 0)) < 0.1)
                );

                if (invoice) return { ...tx, invoice };
            }

            return tx;
        });

        return enriched;
    } catch (error) {
        console.warn("Prisma getSchoolStockTransactions failed, falling back to JSON storage", error);
        try {
            const acc = await getSchoolAccessories(schoolId);
            const transactions = Array.isArray(acc.stockTransactions) ? acc.stockTransactions : [];
            const products = Array.isArray(acc.inventoryProducts) ? acc.inventoryProducts : [];
            const saleInvoices = Array.isArray(acc.accessoryInvoices) ? acc.accessoryInvoices : [];
            const allPurchaseInvoices = Array.isArray(acc.purchaseInvoices) ? acc.purchaseInvoices : [];

            const enriched = transactions.map((tx: any) => {
                const product = products.find((p: any) => p.id === tx.productId);
                const enrichedTx = {
                    ...tx,
                    product
                };

                // Enrich OUTWARD (Sales)
                if (tx.type === 'OUTWARD' && tx.referenceId) {
                    const invoice = saleInvoices.find((inv: any) => inv.id === tx.referenceId || inv.invoiceNumber === tx.referenceId);
                    if (invoice) {
                        return {
                            ...enrichedTx,
                            invoice,
                            discount: invoice.discount || 0,
                            paymentMode: invoice.paymentMode || null,
                            subtotal: invoice.subtotal || tx.totalAmount,
                            student: invoice.student || null
                        };
                    }
                }

                // Enrich INWARD (Purchases)
                if (tx.type === 'INWARD') {
                    let invNo = null;
                    const invMatch = tx.notes?.match(/\[INV: (PUR-.*?)\]/);
                    if (invMatch) invNo = invMatch[1];

                    const invoice = allPurchaseInvoices.find((inv: any) => 
                        inv.id === tx.purchaseInvoiceId || 
                        (invNo && inv.invoiceNumber === invNo) ||
                        (tx.referenceId && inv.invoiceNumber === tx.referenceId) ||
                        (inv.vendorName === tx.entityName && Math.abs((inv.totalAmount || 0) - (tx.totalAmount || 0)) < 0.1)
                    );

                    if (invoice) return { ...enrichedTx, invoice };
                }

                return enrichedTx;
            });

            return enriched.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
        } catch (e) {
            console.error("Failed to load school stock transactions from JSON fallback:", e);
            return [];
        }
    }
}

export async function addInventoryProduct(data: {
    schoolId: string;
    name: string;
    category: string;
    sku?: string;
    hsnCode?: string;
    description?: string;
    unit?: string;
    buyPrice?: number;
    sellPrice?: number;
    taxRate?: number;
    minStockThreshold?: number;
    openingStock?: number;
    vendorName?: string;
    // New Purchase Heads for Opening Stock
    invoiceNumber?: string;      // Vendor Bill #
    internalReceiptNo?: string;  // School Voucher #
    paidAmount?: number;
    paymentMode?: string;
    paymentTiming?: string;
    date?: string;
    recordedBy?: string;
}) {
    const { openingStock, vendorName, invoiceNumber, internalReceiptNo, paidAmount, paymentMode, paymentTiming, date, recordedBy, ...rest } = data;
    
    try {
        const result = await prisma.$transaction(async (tx: any) => {
            const product = await tx.inventoryProduct.create({
                data: {
                    ...rest,
                    currentStock: openingStock || 0
                }
            });

            if (openingStock && openingStock > 0) {
                const totalAmount = (openingStock) * (data.buyPrice || 0);
                const paidAmt = paidAmount || 0;
                const pStatus = paidAmt >= totalAmount ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Due');
                const internalNo = internalReceiptNo || `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                
                let invoiceId: string | undefined;
                const items = [{
                    name: product.name,
                    quantity: openingStock,
                    rate: data.buyPrice || 0,
                    unit: product.unit
                }];

                try {
                    // Try creating a formal PurchaseInvoice
                    const initialPaymentLog = paidAmt > 0 ? [{
                        id: `${internalNo}-1`,
                        amount: paidAmt,
                        date: date || new Date().toISOString(),
                        mode: paymentMode || 'Cash',
                        notes: 'Opening Stock Payment'
                    }] : [];

                    const invoice = await (tx as any).purchaseInvoice.create({
                        data: {
                            schoolId: data.schoolId,
                            vendorName: vendorName || 'Opening Stock',
                            invoiceNumber: internalNo,
                            vendorInvoiceNumber: invoiceNumber,
                            items: items as any,
                            totalAmount,
                            paidAmount: paidAmt,
                            paymentStatus: pStatus,
                            paymentMode: paymentMode || 'Cash',
                            notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                            date: date || new Date().toISOString(),
                            recordedBy
                        }
                    });
                    invoiceId = invoice.id;
                } catch (e) {
                    // Fallback to JSON storage if table missing
                    const school = await tx.school.findUnique({
                        where: { id: data.schoolId },
                        select: { accessories: true }
                    });
                    let currentAcc: any = school?.accessories || {};
                    const initialPaymentLog = paidAmt > 0 ? [{
                        id: `${internalNo}-1`,
                        amount: paidAmt,
                        date: date || new Date().toISOString(),
                        mode: paymentMode || 'Cash',
                        notes: 'Opening Stock Payment'
                    }] : [];

                    const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
                    invoices.push({
                        id: internalNo,
                        schoolId: data.schoolId,
                        vendorName: vendorName || 'Opening Stock',
                        invoiceNumber: internalNo,
                        vendorInvoiceNumber: invoiceNumber,
                        items,
                        totalAmount,
                        paidAmount: paidAmt,
                        paymentStatus: pStatus,
                        paymentMode: paymentMode || 'Cash',
                        notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                        paymentHistory: initialPaymentLog,
                        date: date || new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        recordedBy
                    });

                    await tx.school.update({
                        where: { id: data.schoolId },
                        data: {
                            accessories: { ...currentAcc, purchaseInvoices: invoices }
                        }
                    });
                }

                // Create the Stock Transaction linked to the invoice
                await tx.stockTransaction.create({
                    data: {
                        schoolId: data.schoolId,
                        productId: product.id,
                        type: 'INWARD',
                        quantity: openingStock,
                        rate: data.buyPrice || 0,
                        totalAmount,
                        entityName: vendorName || 'Opening Stock',
                        referenceId: invoiceNumber,
                        notes: `[INV: ${internalNo}]\nInitial opening stock`,
                        purchaseInvoiceId: invoiceId,
                        recordedBy
                    } as any
                });
            }

            return product;
        });

        revalidatePath('/school-admin/inventory');
        return { success: true, product: result };
    } catch (error: any) {
        console.warn("Prisma addInventoryProduct failed, falling back to JSON storage", error);
        try {
            const newProduct = {
                id: Math.random().toString(36).substr(2, 9),
                schoolId: data.schoolId,
                name: rest.name,
                category: rest.category,
                sku: rest.sku || null,
                hsnCode: rest.hsnCode || null,
                description: rest.description || null,
                unit: rest.unit || "pcs",
                buyPrice: rest.buyPrice || 0,
                sellPrice: rest.sellPrice || 0,
                taxRate: rest.taxRate || 0,
                minStockThreshold: rest.minStockThreshold || 0,
                currentStock: openingStock || 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const currentAcc = await getSchoolAccessories(data.schoolId);
            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];

            products.push(newProduct);

            if (openingStock && openingStock > 0) {
                const totalAmount = (openingStock) * (data.buyPrice || 0);
                const paidAmt = paidAmount || 0;
                const pStatus = paidAmt >= totalAmount ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Due');
                const internalNo = internalReceiptNo || `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                const initialPaymentLog = paidAmt > 0 ? [{
                    id: `${internalNo}-1`,
                    amount: paidAmt,
                    date: date || new Date().toISOString(),
                    mode: paymentMode || 'Cash',
                    notes: 'Opening Stock Payment'
                }] : [];

                const newInvoice = {
                    id: internalNo,
                    schoolId: data.schoolId,
                    vendorName: vendorName || 'Opening Stock',
                    invoiceNumber: internalNo,
                    vendorInvoiceNumber: invoiceNumber,
                    items: [{
                        name: newProduct.name,
                        quantity: openingStock,
                        rate: data.buyPrice || 0,
                        unit: newProduct.unit
                    }],
                    totalAmount,
                    paidAmount: paidAmt,
                    paymentStatus: pStatus,
                    paymentMode: paymentMode || 'Cash',
                    notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                    paymentHistory: initialPaymentLog,
                    date: date || new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    recordedBy
                };

                const newTransaction = {
                    id: Math.random().toString(36).substr(2, 9),
                    schoolId: data.schoolId,
                    productId: newProduct.id,
                    type: 'INWARD',
                    quantity: openingStock,
                    rate: data.buyPrice || 0,
                    totalAmount,
                    entityName: vendorName || 'Opening Stock',
                    referenceId: invoiceNumber,
                    notes: `[INV: ${internalNo}]\nInitial opening stock`,
                    purchaseInvoiceId: internalNo,
                    recordedBy,
                    createdAt: new Date().toISOString(),
                    date: date || new Date().toISOString()
                };

                invoices.push(newInvoice);
                transactions.push(newTransaction);
            }

            await updateSchoolAccessories(data.schoolId, {
                inventoryProducts: products,
                purchaseInvoices: invoices,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true, product: newProduct };
        } catch (e: any) {
            console.error("Failed to add product in fallback:", e);
            return { success: false, error: e.message || "Failed to add product" };
        }
    }
}

export async function updateInventoryProduct(id: string, data: any) {
    const { vendorName, ...rest } = data;
    
    try {
        await prisma.$transaction(async (tx: any) => {
            // 1. Update product details
            await tx.inventoryProduct.update({
                where: { id },
                data: rest
            });

            // 2. If vendorName is provided, update or create the latest inward transaction
            if (vendorName) {
                const latestTransaction = await tx.stockTransaction.findFirst({
                    where: { productId: id, type: 'INWARD' },
                    orderBy: { createdAt: 'desc' }
                });

                if (latestTransaction) {
                    await tx.stockTransaction.update({
                        where: { id: latestTransaction.id },
                        data: { entityName: vendorName }
                    });
                } else {
                    // If no inward transaction exists, create a dummy one to store the vendor
                    const product = await tx.inventoryProduct.findUnique({ where: { id } });
                    await tx.stockTransaction.create({
                        data: {
                            schoolId: product?.schoolId || '',
                            productId: id,
                            type: 'INWARD',
                            quantity: 0,
                            rate: 0,
                            totalAmount: 0,
                            entityName: vendorName,
                            notes: 'Vendor updated'
                        }
                    });
                }
            }
        });

        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.warn("Prisma updateInventoryProduct failed, falling back to JSON storage", error);
        try {
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let targetSchoolId: string | null = null;
            let currentAcc: any = null;
            let productIndex = -1;

            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.inventoryProducts)) {
                    const idx = acc.inventoryProducts.findIndex((p: any) => p.id === id);
                    if (idx !== -1) {
                        targetSchoolId = s.id;
                        currentAcc = acc;
                        productIndex = idx;
                        break;
                    }
                }
            }

            if (!targetSchoolId || !currentAcc || productIndex === -1) {
                return { success: false, error: "Product not found" };
            }

            const products = [...currentAcc.inventoryProducts];
            products[productIndex] = {
                ...products[productIndex],
                ...rest,
                updatedAt: new Date().toISOString()
            };

            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];
            if (vendorName) {
                const latestTransactionIndex = transactions
                    .map((t: any, idx: number) => ({ ...t, idx }))
                    .filter((t: any) => t.productId === id && t.type === 'INWARD')
                    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())[0]?.idx;

                if (latestTransactionIndex !== undefined) {
                    transactions[latestTransactionIndex] = {
                        ...transactions[latestTransactionIndex],
                        entityName: vendorName
                    };
                } else {
                    transactions.push({
                        id: Math.random().toString(36).substr(2, 9),
                        schoolId: targetSchoolId,
                        productId: id,
                        type: 'INWARD',
                        quantity: 0,
                        rate: 0,
                        totalAmount: 0,
                        entityName: vendorName,
                        notes: 'Vendor updated',
                        createdAt: new Date().toISOString()
                    });
                }
            }

            await updateSchoolAccessories(targetSchoolId, {
                inventoryProducts: products,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true };
        } catch (e: any) {
            console.error("Failed to update product in fallback:", e);
            return { success: false, error: e.message || "Failed to update product" };
        }
    }
}

// --- STOCK TRANSACTIONS (PURCHASES / INWARD) ---

export async function recordStockInward(data: {
    schoolId: string;
    productId: string;
    quantity: number;
    rate: number;
    entityName?: string; // Vendor Name
    referenceId?: string; // Purchase Order / Bill No
    internalReceiptNo?: string; // School's internal #
    notes?: string;
    paidAmount?: number;
    paymentMode?: string;
    recordedBy?: string;
}) {
    const totalAmount = data.quantity * data.rate;
    const paidAmount = data.paidAmount || 0;
    
    let paymentStatus = 'Due';
    if (paidAmount >= totalAmount) paymentStatus = 'Paid';
    else if (paidAmount > 0) paymentStatus = 'Partial';

    // Generate a unique internal number if not provided
    const internalNo = data.internalReceiptNo || `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // Fetch product name for the invoice record and snapshotting
            const product = await tx.inventoryProduct.findUnique({
                where: { id: data.productId },
                select: { name: true, category: true, unit: true }
            });

            // Create a snapshot to preserve data even if product is deleted
            const productSnapshot = `[ITEM: ${product?.name || 'Unknown'} | CAT: ${product?.category || 'N/A'} | UNIT: ${product?.unit || 'pcs'}]`;


            const items = [{
                name: product?.name || 'Inventory Item',
                quantity: data.quantity,
                rate: data.rate
            }];

            let invoiceId: string | undefined = undefined;
            let invoice: any = null;

            try {
                const initialPaymentLog = paidAmount > 0 ? [{
                    id: `${internalNo}-1`,
                    amount: paidAmount,
                    date: new Date().toISOString(),
                    mode: data.paymentMode || 'Cash',
                    notes: 'Initial Payment'
                }] : [];

                invoice = await (tx as any).purchaseInvoice.create({
                    data: {
                        schoolId: data.schoolId,
                        vendorName: data.entityName || 'General Vendor',
                        invoiceNumber: internalNo, // Our internal #
                        vendorInvoiceNumber: data.referenceId, // Their #
                        items: items as any,
                        totalAmount,
                        paidAmount,
                        paymentStatus,
                        paymentMode: data.paymentMode,
                        notes: data.notes ? `${data.notes}\n\nPAYMENTS: ${JSON.stringify(initialPaymentLog)}` : `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                        recordedBy: data.recordedBy
                    }
                });
                invoiceId = invoice.id;
            } catch (e) {
                console.warn("PurchaseInvoice table not found, falling back to school accessories storage");
                
                // Fallback: Store in school.accessories JSON
                const school = await tx.school.findUnique({
                    where: { id: data.schoolId },
                    select: { accessories: true }
                });
                
                let currentAcc: any = school?.accessories || {};
                if (typeof currentAcc !== 'object') currentAcc = {};
                
                const initialPaymentLog = paidAmount > 0 ? [{
                    id: `${internalNo}-1`,
                    amount: paidAmount,
                    date: new Date().toISOString(),
                    mode: data.paymentMode || 'Cash',
                    notes: 'Initial Payment'
                }] : [];

                invoice = {
                    id: internalNo,
                    schoolId: data.schoolId,
                    vendorName: data.entityName || 'General Vendor',
                    invoiceNumber: internalNo,
                    vendorInvoiceNumber: data.referenceId,
                    items: items,
                    totalAmount,
                    paidAmount,
                    paymentStatus,
                    paymentMode: data.paymentMode,
                    notes: data.notes ? `${data.notes}\n\nPAYMENTS: ${JSON.stringify(initialPaymentLog)}` : `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                    paymentHistory: initialPaymentLog,
                    date: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    recordedBy: data.recordedBy
                };

                const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
                invoices.push(invoice);

                await tx.school.update({
                    where: { id: data.schoolId },
                    data: {
                        accessories: {
                            ...currentAcc,
                            purchaseInvoices: invoices
                        }
                    }
                });
            }

            // 2. Create Stock Transaction Record
            const st = await tx.stockTransaction.create({
                data: {
                    schoolId: data.schoolId,
                    productId: data.productId,
                    type: 'INWARD',
                    quantity: data.quantity,
                    rate: data.rate,
                    totalAmount,
                    entityName: data.entityName || 'General Vendor',
                    referenceId: data.referenceId,
                    notes: `${productSnapshot}\n[INV: ${internalNo}]\n${data.notes || ''}`.trim(),
                    purchaseInvoiceId: invoiceId,
                    recordedBy: data.recordedBy
                } as any
            });

            // 3. Increment Stock level
            await tx.inventoryProduct.update({
                where: { id: data.productId },
                data: {
                    currentStock: { increment: data.quantity }
                }
            });

            return { invoice, st };
        });

        revalidatePath('/school-admin/inventory');
        return { success: true, ...result };
    } catch (error) {
        console.warn("Prisma recordStockInward failed, falling back to JSON storage", error);
        try {
            const currentAcc = await getSchoolAccessories(data.schoolId);
            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];

            const productIndex = products.findIndex((p: any) => p.id === data.productId);
            if (productIndex === -1) {
                return { success: false, error: "Product not found" };
            }

            const product = products[productIndex];
            const productSnapshot = `[ITEM: ${product.name || 'Unknown'} | CAT: ${product.category || 'N/A'} | UNIT: ${product.unit || 'pcs'}]`;

            const items = [{
                name: product.name || 'Inventory Item',
                quantity: data.quantity,
                rate: data.rate
            }];

            const initialPaymentLog = paidAmount > 0 ? [{
                id: `${internalNo}-1`,
                amount: paidAmount,
                date: new Date().toISOString(),
                mode: data.paymentMode || 'Cash',
                notes: 'Initial Payment'
            }] : [];

            const invoice = {
                id: internalNo,
                schoolId: data.schoolId,
                vendorName: data.entityName || 'General Vendor',
                invoiceNumber: internalNo,
                vendorInvoiceNumber: data.referenceId,
                items: items,
                totalAmount,
                paidAmount,
                paymentStatus,
                paymentMode: data.paymentMode,
                notes: data.notes ? `${data.notes}\n\nPAYMENTS: ${JSON.stringify(initialPaymentLog)}` : `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                paymentHistory: initialPaymentLog,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                recordedBy: data.recordedBy
            };

            const st = {
                id: Math.random().toString(36).substr(2, 9),
                schoolId: data.schoolId,
                productId: data.productId,
                type: 'INWARD',
                quantity: data.quantity,
                rate: data.rate,
                totalAmount,
                entityName: data.entityName || 'General Vendor',
                referenceId: data.referenceId,
                notes: `${productSnapshot}\n[INV: ${internalNo}]\n${data.notes || ''}`.trim(),
                purchaseInvoiceId: internalNo,
                recordedBy: data.recordedBy,
                createdAt: new Date().toISOString(),
                date: new Date().toISOString()
            };

            // Increment stock level
            products[productIndex] = {
                ...product,
                currentStock: (product.currentStock || 0) + data.quantity,
                updatedAt: new Date().toISOString()
            };

            invoices.push(invoice);
            transactions.push(st);

            await updateSchoolAccessories(data.schoolId, {
                inventoryProducts: products,
                purchaseInvoices: invoices,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true, invoice, st };
        } catch (e: any) {
            console.error("Failed to record stock inward in fallback:", e);
            return { success: false, error: e.message || "Failed to record stock inward" };
        }
    }
}

export async function getProductPurchaseHistory(productId: string) {
    try {
        return await prisma.stockTransaction.findMany({
            where: { 
                productId,
                type: 'INWARD'
            },
            orderBy: { date: 'desc' },
            take: 20
        });
    } catch (error) {
        console.warn("Prisma getProductPurchaseHistory failed, falling back to JSON storage", error);
        try {
            // Find the school that owns this product
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let transactions: any[] = [];
            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.stockTransactions)) {
                    const found = acc.stockTransactions.some((t: any) => t.productId === productId);
                    if (found) {
                        transactions = acc.stockTransactions;
                        break;
                    }
                }
            }
            return transactions
                .filter((t: any) => t.productId === productId && t.type === 'INWARD')
                .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
                .slice(0, 20);
        } catch (e) {
            return [];
        }
    }
}

export async function getProductTransactions(productId: string) {
    try {
        return await prisma.stockTransaction.findMany({
            where: { productId },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.warn("Prisma getProductTransactions failed, falling back to JSON storage", error);
        try {
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let transactions: any[] = [];
            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.stockTransactions)) {
                    const found = acc.stockTransactions.some((t: any) => t.productId === productId);
                    if (found) {
                        transactions = acc.stockTransactions;
                        break;
                    }
                }
            }
            return transactions
                .filter((t: any) => t.productId === productId)
                .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
        } catch (e) {
            return [];
        }
    }
}

export async function updateStockTransaction(id: string, data: {
    quantity?: number;
    rate?: number;
    entityName?: string;
    referenceId?: string;
    notes?: string;
}) {
    try {
        const oldTransaction = await prisma.stockTransaction.findUnique({
            where: { id },
            include: { product: true }
        });

        if (!oldTransaction) throw new Error("Transaction not found");

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. If quantity changed, adjust product stock
            if (data.quantity !== undefined && data.quantity !== oldTransaction.quantity) {
                const diff = data.quantity - oldTransaction.quantity;
                // For INWARD: increment means adding more stock
                // For OUTWARD: increment means selling more (decrementing stock)
                const adjustment = oldTransaction.type === 'INWARD' ? diff : -diff;
                
                await tx.inventoryProduct.update({
                    where: { id: oldTransaction.productId },
                    data: {
                        currentStock: { increment: adjustment }
                    }
                });
            }

            // 2. Calculate new total amount if needed
            const newQuantity = data.quantity !== undefined ? data.quantity : oldTransaction.quantity;
            const newRate = data.rate !== undefined ? data.rate : oldTransaction.rate;
            const totalAmount = newQuantity * newRate;

            // 3. Update the transaction
            return await tx.stockTransaction.update({
                where: { id },
                data: {
                    ...data,
                    totalAmount
                }
            });
        });

        revalidatePath('/school-admin/inventory');
        return { success: true, transaction: result };
    } catch (error) {
        console.warn("Prisma updateStockTransaction failed, falling back to JSON storage", error);
        try {
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let targetSchoolId: string | null = null;
            let currentAcc: any = null;
            let transactionIndex = -1;

            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.stockTransactions)) {
                    const idx = acc.stockTransactions.findIndex((t: any) => t.id === id);
                    if (idx !== -1) {
                        targetSchoolId = s.id;
                        currentAcc = acc;
                        transactionIndex = idx;
                        break;
                    }
                }
            }

            if (!targetSchoolId || !currentAcc || transactionIndex === -1) {
                return { success: false, error: "Transaction not found" };
            }

            const transactions = [...currentAcc.stockTransactions];
            const oldTransaction = transactions[transactionIndex];

            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const productIndex = products.findIndex((p: any) => p.id === oldTransaction.productId);

            if (productIndex !== -1 && data.quantity !== undefined && data.quantity !== oldTransaction.quantity) {
                const diff = data.quantity - oldTransaction.quantity;
                const adjustment = oldTransaction.type === 'INWARD' ? diff : -diff;
                products[productIndex] = {
                    ...products[productIndex],
                    currentStock: (products[productIndex].currentStock || 0) + adjustment,
                    updatedAt: new Date().toISOString()
                };
            }

            const newQuantity = data.quantity !== undefined ? data.quantity : oldTransaction.quantity;
            const newRate = data.rate !== undefined ? data.rate : oldTransaction.rate;
            const totalAmount = newQuantity * newRate;

            transactions[transactionIndex] = {
                ...oldTransaction,
                ...data,
                totalAmount
            };

            await updateSchoolAccessories(targetSchoolId, {
                inventoryProducts: products,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true, transaction: transactions[transactionIndex] };
        } catch (e: any) {
            console.error("Failed to update stock transaction in fallback:", e);
            return { success: false, error: e.message || "Failed to update transaction" };
        }
    }
}

export async function deleteStockTransaction(id: string) {
    try {
        const transaction = await prisma.stockTransaction.findUnique({
            where: { id }
        });

        if (!transaction) throw new Error("Transaction not found");

        await prisma.$transaction([
            // 1. Reverse stock adjustment
            prisma.inventoryProduct.update({
                where: { id: transaction.productId },
                data: {
                    currentStock: {
                        [transaction.type === 'INWARD' ? 'decrement' : 'increment']: transaction.quantity
                    }
                }
            }),
            // 2. Delete transaction
            prisma.stockTransaction.delete({
                where: { id }
            })
        ]);

        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.warn("Prisma deleteStockTransaction failed, falling back to JSON storage", error);
        try {
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let targetSchoolId: string | null = null;
            let currentAcc: any = null;
            let transactionIndex = -1;

            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.stockTransactions)) {
                    const idx = acc.stockTransactions.findIndex((t: any) => t.id === id);
                    if (idx !== -1) {
                        targetSchoolId = s.id;
                        currentAcc = acc;
                        transactionIndex = idx;
                        break;
                    }
                }
            }

            if (!targetSchoolId || !currentAcc || transactionIndex === -1) {
                return { success: false, error: "Transaction not found" };
            }

            const transactions = [...currentAcc.stockTransactions];
            const transaction = transactions[transactionIndex];

            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const productIndex = products.findIndex((p: any) => p.id === transaction.productId);

            if (productIndex !== -1) {
                const adjustment = transaction.type === 'INWARD' ? -transaction.quantity : transaction.quantity;
                products[productIndex] = {
                    ...products[productIndex],
                    currentStock: (products[productIndex].currentStock || 0) + adjustment,
                    updatedAt: new Date().toISOString()
                };
            }

            const filteredTransactions = transactions.filter((t: any) => t.id !== id);

            await updateSchoolAccessories(targetSchoolId, {
                inventoryProducts: products,
                stockTransactions: filteredTransactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true };
        } catch (e: any) {
            console.error("Failed to delete stock transaction in fallback:", e);
            return { success: false, error: e.message || "Failed to delete transaction" };
        }
    }
}

// --- SALES (OUTWARD) ---

export async function recordAccessorySale(data: {
    schoolId: string;
    studentId: string | null;
    items: Array<{ productId: string; quantity: number; rate: number; name: string }>;
    paymentMode: string;
    discount?: number;
    notes?: string;
    recordedBy?: string;
    invoiceNumber?: string;
}) {
    const subtotal = data.items.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const taxAmount = 0; // Simplified for now
    const totalAmount = subtotal + taxAmount - (data.discount || 0);
    
    const finalInvoiceNumber = data.invoiceNumber || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            let finalStudentId = data.studentId;

            // If direct sale, find or create the placeholder student
            if (!finalStudentId) {
                const directSaleStudent = await tx.student.findFirst({
                    where: { 
                        schoolId: data.schoolId,
                        admissionNumber: 'DIRECT-SALE'
                    }
                });

                if (directSaleStudent) {
                    finalStudentId = directSaleStudent.id;
                } else {
                    const newDirectStudent = await tx.student.create({
                        data: {
                            schoolId: data.schoolId,
                            name: 'Direct Sale Customer',
                            firstName: 'Direct Sale',
                            lastName: 'Customer',
                            admissionNumber: 'DIRECT-SALE',
                            className: 'N/A',
                            section: 'N/A',
                            rollNumber: '0',
                            status: 'Active',
                        }
                    });
                    finalStudentId = newDirectStudent.id;
                }
            }

            // 1. Create the Invoice
            const invoice = await tx.accessoryInvoice.create({
                data: {
                    schoolId: data.schoolId,
                    studentId: finalStudentId,
                    invoiceNumber: finalInvoiceNumber,
                    items: data.items as any,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    notes: data.notes || (data.studentId ? undefined : 'System-generated Direct Sale'),
                }
            });

            // 2. Create Stock Transactions and decrement stock for each item
            for (const item of data.items) {
                await tx.stockTransaction.create({
                    data: {
                        schoolId: data.schoolId,
                        productId: item.productId,
                        type: 'OUTWARD',
                        quantity: item.quantity,
                        rate: item.rate,
                        totalAmount: item.quantity * item.rate,
                        referenceId: invoice.id,
                        notes: finalStudentId ? `Sale to Student: ${finalStudentId}` : 'Direct Sale (No student linked)',
                    }
                });

                await tx.inventoryProduct.update({
                    where: { id: item.productId },
                    data: {
                        currentStock: { decrement: item.quantity }
                    }
                });
            }

            return invoice;
        });

        revalidatePath('/school-admin/inventory');
        revalidatePath('/school-admin/fees');
        return { success: true, invoice: result };
    } catch (error) {
        console.warn("Prisma recordAccessorySale failed, falling back to JSON storage", error);
        try {
            const currentAcc = await getSchoolAccessories(data.schoolId);
            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const invoices = Array.isArray(currentAcc.accessoryInvoices) ? [...currentAcc.accessoryInvoices] : [];
            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];

            let finalStudentId = data.studentId;
            let student = null;
            if (finalStudentId) {
                try {
                    student = await prisma.student.findUnique({ where: { id: finalStudentId } });
                } catch (e) {}
            }

            const invoiceId = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const invoice = {
                id: invoiceId,
                schoolId: data.schoolId,
                studentId: finalStudentId,
                student: student,
                invoiceNumber: finalInvoiceNumber,
                items: data.items,
                subtotal,
                taxAmount,
                totalAmount,
                paymentMode: data.paymentMode,
                notes: data.notes || (finalStudentId ? undefined : 'System-generated Direct Sale'),
                date: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            for (const item of data.items) {
                const productIndex = products.findIndex((p: any) => p.id === item.productId);
                if (productIndex !== -1) {
                    products[productIndex] = {
                        ...products[productIndex],
                        currentStock: Math.max(0, (products[productIndex].currentStock || 0) - item.quantity),
                        updatedAt: new Date().toISOString()
                    };
                }

                transactions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    schoolId: data.schoolId,
                    productId: item.productId,
                    type: 'OUTWARD',
                    quantity: item.quantity,
                    rate: item.rate,
                    totalAmount: item.quantity * item.rate,
                    referenceId: invoiceId,
                    notes: finalStudentId ? `Sale to Student: ${finalStudentId}` : 'Direct Sale (No student linked)',
                    createdAt: new Date().toISOString(),
                    date: new Date().toISOString()
                });
            }

            invoices.push(invoice);

            await updateSchoolAccessories(data.schoolId, {
                inventoryProducts: products,
                accessoryInvoices: invoices,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            revalidatePath('/school-admin/fees');
            return { success: true, invoice };
        } catch (e: any) {
            console.error("Failed to record accessory sale in fallback:", e);
            return { success: false, error: e.message || "Failed to record sale" };
        }
    }
}

export async function deleteAccessoryInvoice(invoiceId: string) {
    try {
        const invoice = await prisma.accessoryInvoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) throw new Error("Invoice not found");

        const items = (invoice.items as any) || [];

        await prisma.$transaction(async (tx: any) => {
            // 1. Restore Stock (Increment back what was sold)
            for (const item of items) {
                if (item.productId) {
                    await tx.inventoryProduct.update({
                        where: { id: item.productId },
                        data: {
                            currentStock: { increment: item.quantity || 0 }
                        }
                    });
                }
            }

            // 2. Delete associated stock transactions
            await tx.stockTransaction.deleteMany({
                where: { referenceId: invoiceId }
            });

            // 3. Delete the invoice itself
            await tx.accessoryInvoice.delete({
                where: { id: invoiceId }
            });
        });

        revalidatePath('/school-admin/inventory');
        return { success: true };
    } catch (error) {
        console.warn("Prisma deleteAccessoryInvoice failed, falling back to JSON storage", error);
        try {
            const schools = await prisma.school.findMany({ select: { id: true, accessories: true } });
            let targetSchoolId: string | null = null;
            let currentAcc: any = null;
            let invoiceIndex = -1;

            for (const s of schools) {
                const acc = s.accessories as any;
                if (acc && Array.isArray(acc.accessoryInvoices)) {
                    const idx = acc.accessoryInvoices.findIndex((inv: any) => inv.id === invoiceId);
                    if (idx !== -1) {
                        targetSchoolId = s.id;
                        currentAcc = acc;
                        invoiceIndex = idx;
                        break;
                    }
                }
            }

            if (!targetSchoolId || !currentAcc || invoiceIndex === -1) {
                return { success: false, error: "Invoice not found" };
            }

            const invoices = [...currentAcc.accessoryInvoices];
            const invoice = invoices[invoiceIndex];
            const items = (invoice.items as any) || [];

            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            for (const item of items) {
                const productIndex = products.findIndex((p: any) => p.id === item.productId);
                if (productIndex !== -1) {
                    products[productIndex] = {
                        ...products[productIndex],
                        currentStock: (products[productIndex].currentStock || 0) + (item.quantity || 0),
                        updatedAt: new Date().toISOString()
                    };
                }
            }

            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];
            const filteredTransactions = transactions.filter((t: any) => t.referenceId !== invoiceId && t.referenceId !== invoice.id);
            const filteredInvoices = invoices.filter((inv: any) => inv.id !== invoiceId);

            await updateSchoolAccessories(targetSchoolId, {
                inventoryProducts: products,
                accessoryInvoices: filteredInvoices,
                stockTransactions: filteredTransactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true };
        } catch (e: any) {
            console.error("Failed to delete accessory invoice in fallback:", e);
            return { success: false, error: e.message || "Failed to delete invoice" };
        }
    }
}

export async function getAccessoryInvoices(schoolId: string) {
    try {
        return await prisma.accessoryInvoice.findMany({
            where: { schoolId },
            include: { student: true },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.warn("Prisma getAccessoryInvoices failed, falling back to JSON storage", error);
        try {
            const acc = await getSchoolAccessories(schoolId);
            const invoices = Array.isArray(acc.accessoryInvoices) ? acc.accessoryInvoices : [];
            
            const enriched = [];
            for (const inv of invoices) {
                let student = inv.student;
                if (inv.studentId && !student) {
                    try {
                        student = await prisma.student.findUnique({ where: { id: inv.studentId } });
                    } catch (e) {}
                }
                enriched.push({
                    ...inv,
                    student
                });
            }

            return enriched.sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
        } catch (e) {
            return [];
        }
    }
}

export async function getPurchaseInvoices(schoolId: string) {
    if (!schoolId) return [];
    try {
        if ((prisma as any).purchaseInvoice) {
            const invoices = await (prisma as any).purchaseInvoice.findMany({
                where: { schoolId },
                include: { transactions: true },
                orderBy: { date: 'desc' }
            });
            if (invoices.length > 0) return invoices;
        }
    } catch (e) {
        console.warn("PurchaseInvoice table not found or empty, checking fallback storage");
    }

    // Fallback: Get from school.accessories
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { accessories: true }
    });

    if (school?.accessories && typeof school.accessories === 'object') {
        const acc = school.accessories as any;
        if (acc.purchaseInvoices && Array.isArray(acc.purchaseInvoices)) {
            return acc.purchaseInvoices.sort((a: any, b: any) => 
                new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
        }
    }

    return [];
}

export async function updatePurchaseInvoicePayment(id: string, data: {
    schoolId: string;
    paidAmount: number;
    paymentMode?: string;
    notes?: string;
}) {
    try {
        if ((prisma as any).purchaseInvoice) {
            const invoice = await (prisma as any).purchaseInvoice.findUnique({
                where: { id }
            });

            if (invoice) {
                const currentNotes = invoice.notes || '';
                let payments = [];
                try {
                    const match = currentNotes.match(/PAYMENTS: (\[.*\])/);
                    if (match) payments = JSON.parse(match[1]);
                } catch (e) {}

                const nextPaymentNo = payments.length + 1;
                const paymentId = `${invoice.invoiceNumber}-${nextPaymentNo}`;
                
                const newPayment = {
                    id: paymentId,
                    amount: data.paidAmount,
                    date: new Date().toISOString(),
                    mode: data.paymentMode || 'Cash',
                    notes: data.notes || 'Subsequent Payment'
                };
                payments.push(newPayment);

                const newPaidAmount = invoice.paidAmount + data.paidAmount;
                let paymentStatus = 'Due';
                if (newPaidAmount >= invoice.totalAmount) paymentStatus = 'Paid';
                else if (newPaidAmount > 0) paymentStatus = 'Partial';

                // Update notes with updated payment log
                const cleanNotes = currentNotes.replace(/PAYMENTS: \[.*\]/, '').trim();
                const updatedNotes = `${cleanNotes}\n\nPAYMENTS: ${JSON.stringify(payments)}`.trim();

                await (prisma as any).purchaseInvoice.update({
                    where: { id },
                    data: {
                        paidAmount: newPaidAmount,
                        paymentStatus,
                        paymentMode: data.paymentMode || invoice.paymentMode,
                        notes: updatedNotes
                    }
                });
                revalidatePath('/school-admin/inventory');
                return { success: true, paymentId };
            } else {
                // Not found? Check if it's a Transaction ID we need to convert to an Invoice
                const st = await prisma.stockTransaction.findUnique({
                    where: { id },
                    include: { product: true }
                });

                if (st && st.type === 'INWARD') {
                    const internalNo = st.referenceId || `PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    const paymentStatus = data.paidAmount >= st.totalAmount ? 'Paid' : 'Partial';
                    const initialPaymentLog = [{
                        id: `${internalNo}-1`,
                        amount: data.paidAmount,
                        date: new Date().toISOString(),
                        mode: data.paymentMode || 'Cash',
                        notes: data.notes || 'Payment against Transaction'
                    }];

                    const newInv = await (prisma as any).purchaseInvoice.create({
                        data: {
                            schoolId: data.schoolId,
                            vendorName: st.entityName || 'General Vendor',
                            invoiceNumber: internalNo,
                            totalAmount: st.totalAmount,
                            paidAmount: data.paidAmount,
                            paymentStatus,
                            paymentMode: data.paymentMode,
                            notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`
                        }
                    });

                    // Link the transaction to the new invoice
                    await prisma.stockTransaction.update({
                        where: { id: st.id },
                        data: { purchaseInvoiceId: newInv.id }
                    });

                    revalidatePath('/school-admin/inventory');
                    return { success: true, paymentId: initialPaymentLog[0].id };
                }
            }
        }
    } catch (e) {
        console.warn("PurchaseInvoice table not found, updating fallback storage");
    }

    // Fallback Update
    const school = await prisma.school.findUnique({
        where: { id: data.schoolId },
        select: { accessories: true }
    });

    let currentAcc: any = school?.accessories || {};
    const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
    const index = invoices.findIndex((inv: any) => inv.id === id || inv.invoiceNumber === id);

    if (index !== -1) {
        const invoice = invoices[index];
        const payments = Array.isArray(invoice.paymentHistory) ? [...invoice.paymentHistory] : [];
        
        const nextPaymentNo = payments.length + 1;
        const paymentId = `${invoice.invoiceNumber}-${nextPaymentNo}`;
        
        const newPayment = {
            id: paymentId,
            amount: data.paidAmount,
            date: new Date().toISOString(),
            mode: data.paymentMode || invoice.paymentMode,
            notes: data.notes || 'Subsequent Payment'
        };
        payments.push(newPayment);

        const newPaidAmount = (invoice.paidAmount || 0) + data.paidAmount;
        let paymentStatus = 'Due';
        if (newPaidAmount >= invoice.totalAmount) paymentStatus = 'Paid';
        else if (newPaidAmount > 0) paymentStatus = 'Partial';

        invoices[index] = {
            ...invoice,
            paidAmount: newPaidAmount,
            paymentStatus,
            paymentMode: data.paymentMode || invoice.paymentMode,
            paymentHistory: payments,
            notes: `${invoice.notes || ''}\n\nPAYMENTS: ${JSON.stringify(payments)}`.trim()
        };

        await prisma.school.update({
            where: { id: data.schoolId },
            data: {
                accessories: {
                    ...currentAcc,
                    purchaseInvoices: invoices
                }
            }
        });
        revalidatePath('/school-admin/inventory');
        return { success: true, paymentId };
    }

    return { success: false };
}

export async function revertPurchasePayment(invoiceId: string, paymentId: string, schoolId: string) {
    try {
        // 1. Try Prisma
        if ((prisma as any).purchaseInvoice) {
            const invoice = await (prisma as any).purchaseInvoice.findUnique({
                where: { id: invoiceId }
            });

            if (invoice) {
                const currentNotes = invoice.notes || '';
                let payments = [];
                try {
                    const match = currentNotes.match(/PAYMENTS: (\[.*\])/);
                    if (match) payments = JSON.parse(match[1]);
                } catch (e) {}

                const paymentToRemove = payments.find((p: any) => p.id === paymentId);
                if (paymentToRemove) {
                    const updatedPayments = payments.filter((p: any) => p.id !== paymentId);
                    const removedAmount = paymentToRemove.amount || 0;
                    const newPaidAmount = Math.max(0, invoice.paidAmount - removedAmount);

                    let paymentStatus = 'Due';
                    if (newPaidAmount >= invoice.totalAmount) paymentStatus = 'Paid';
                    else if (newPaidAmount > 0) paymentStatus = 'Partial';

                    const cleanNotes = currentNotes.replace(/PAYMENTS: \[.*\]/, '').trim();
                    const updatedNotes = updatedPayments.length > 0 
                        ? `${cleanNotes}\n\nPAYMENTS: ${JSON.stringify(updatedPayments)}`.trim()
                        : cleanNotes;

                    await (prisma as any).purchaseInvoice.update({
                        where: { id: invoiceId },
                        data: {
                            paidAmount: newPaidAmount,
                            paymentStatus,
                            notes: updatedNotes
                        }
                    });

                    revalidatePath('/school-admin/inventory');
                    return { success: true };
                }
            }
        }

        // 2. Fallback to JSON
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { accessories: true }
        });

        if (school?.accessories && typeof school.accessories === 'object') {
            const currentAcc = school.accessories as any;
            const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
            const index = invoices.findIndex((inv: any) => inv.id === invoiceId || inv.invoiceNumber === invoiceId);

            if (index !== -1) {
                const invoice = invoices[index];
                const payments = Array.isArray(invoice.paymentHistory) ? [...invoice.paymentHistory] : [];
                const paymentToRemove = payments.find((p: any) => p.id === paymentId);

                if (paymentToRemove) {
                    const updatedPayments = payments.filter((p: any) => p.id !== paymentId);
                    const newPaidAmount = Math.max(0, (invoice.paidAmount || 0) - (paymentToRemove.amount || 0));

                    let paymentStatus = 'Due';
                    if (newPaidAmount >= invoice.totalAmount) paymentStatus = 'Paid';
                    else if (newPaidAmount > 0) paymentStatus = 'Partial';

                    invoices[index] = {
                        ...invoice,
                        paidAmount: newPaidAmount,
                        paymentStatus,
                        paymentHistory: updatedPayments,
                        notes: updatedPayments.length > 0 
                            ? `${invoice.notes?.replace(/PAYMENTS: \[.*\]/, '').trim()}\n\nPAYMENTS: ${JSON.stringify(updatedPayments)}`.trim()
                            : invoice.notes?.replace(/PAYMENTS: \[.*\]/, '').trim()
                    };

                    await prisma.school.update({
                        where: { id: schoolId },
                        data: {
                            accessories: {
                                ...currentAcc,
                                purchaseInvoices: invoices
                            }
                        }
                    });

                    revalidatePath('/school-admin/inventory');
                    return { success: true };
                }
            }
        }

        return { success: false, error: "Payment record not found" };
    } catch (error: any) {
        console.error("Revert failed:", error);
        return { success: false, error: error.message || "Failed to revert payment" };
    }
}

export async function recordBulkStockInward(data: {
    schoolId: string;
    items: {
        productId: string;
        quantity: number;
        rate: number;
        name: string;
        unit?: string;
    }[];
    entityName: string;
    referenceId?: string;       // Vendor Bill #
    internalReceiptNo?: string; // School Voucher #
    notes?: string;
    paidAmount: number;
    paymentMode?: string;
    date?: string;
    recordedBy?: string;
}) {
    if (!data.schoolId) return { success: false, error: "School ID required" };
    
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const paidAmt = data.paidAmount || 0;
    const pStatus = paidAmt >= totalAmount ? 'Paid' : (paidAmt > 0 ? 'Partial' : 'Due');
    const internalNo = data.internalReceiptNo || `PUR-${Date.now()}`;

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Purchase Invoice
            let invoiceId: string | undefined;
            const initialPaymentLog = paidAmt > 0 ? [{
                id: `${internalNo}-1`,
                amount: paidAmt,
                date: data.date || new Date().toISOString(),
                mode: data.paymentMode || 'Cash',
                notes: 'Initial Payment'
            }] : [];

            const invoiceItems = data.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                rate: item.rate,
                unit: item.unit
            }));

            try {
                const invoice = await (tx as any).purchaseInvoice.create({
                    data: {
                        schoolId: data.schoolId,
                        vendorName: data.entityName,
                        invoiceNumber: internalNo,
                        vendorInvoiceNumber: data.referenceId,
                        items: invoiceItems as any,
                        totalAmount,
                        paidAmount: paidAmt,
                        paymentStatus: pStatus,
                        paymentMode: data.paymentMode || 'Cash',
                        notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                        date: data.date || new Date().toISOString(),
                        recordedBy: data.recordedBy
                    }
                });
                invoiceId = invoice.id;
            } catch (e) {
                // Fallback to JSON
                const school = await tx.school.findUnique({
                    where: { id: data.schoolId },
                    select: { accessories: true }
                });
                let currentAcc: any = school?.accessories || {};
                const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
                invoices.push({
                    id: internalNo,
                    schoolId: data.schoolId,
                    vendorName: data.entityName,
                    invoiceNumber: internalNo,
                    vendorInvoiceNumber: data.referenceId,
                    items: invoiceItems,
                    totalAmount,
                    paidAmount: paidAmt,
                    paymentStatus: pStatus,
                    paymentMode: data.paymentMode || 'Cash',
                    notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                    paymentHistory: initialPaymentLog,
                    date: data.date || new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    recordedBy: data.recordedBy
                });

                await tx.school.update({
                    where: { id: data.schoolId },
                    data: {
                        accessories: { ...currentAcc, purchaseInvoices: invoices }
                    }
                });
            }

            // 2. Create Stock Transactions and Update Stocks
            for (const item of data.items) {
                await tx.stockTransaction.create({
                    data: {
                        schoolId: data.schoolId,
                        productId: item.productId,
                        type: 'INWARD',
                        quantity: item.quantity,
                        rate: item.rate,
                        totalAmount: item.quantity * item.rate,
                        entityName: data.entityName,
                        referenceId: data.referenceId,
                        notes: `[INV: ${internalNo}]\n${data.notes || ''}`,
                        purchaseInvoiceId: invoiceId,
                        recordedBy: data.recordedBy
                    } as any
                });

                await tx.inventoryProduct.update({
                    where: { id: item.productId },
                    data: {
                        currentStock: { increment: item.quantity }
                    }
                });
            }

            // Re-fetch the invoice if created in DB to return it
            if (invoiceId) {
                return await (tx as any).purchaseInvoice.findUnique({
                    where: { id: invoiceId }
                });
            } else {
                // Return a synthesized object for the receipt
                return {
                    id: internalNo,
                    invoiceNumber: internalNo,
                    vendorInvoiceNumber: data.referenceId,
                    vendorName: data.entityName,
                    items: invoiceItems,
                    totalAmount,
                    paidAmount: paidAmt,
                    paymentStatus: pStatus,
                    paymentMode: data.paymentMode || 'Cash',
                    date: data.date || new Date().toISOString()
                };
            }
        });

        revalidatePath('/school-admin/inventory');
        return { success: true, invoice: result };
    } catch (error: any) {
        console.warn("Prisma recordBulkStockInward failed, falling back to JSON storage", error);
        try {
            const currentAcc = await getSchoolAccessories(data.schoolId);
            const products = Array.isArray(currentAcc.inventoryProducts) ? [...currentAcc.inventoryProducts] : [];
            const invoices = Array.isArray(currentAcc.purchaseInvoices) ? [...currentAcc.purchaseInvoices] : [];
            const transactions = Array.isArray(currentAcc.stockTransactions) ? [...currentAcc.stockTransactions] : [];

            const initialPaymentLog = paidAmt > 0 ? [{
                id: `${internalNo}-1`,
                amount: paidAmt,
                date: data.date || new Date().toISOString(),
                mode: data.paymentMode || 'Cash',
                notes: 'Initial Payment'
            }] : [];

            const invoiceItems = data.items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                rate: item.rate,
                unit: item.unit
            }));

            const invoice = {
                id: internalNo,
                schoolId: data.schoolId,
                vendorName: data.entityName,
                invoiceNumber: internalNo,
                vendorInvoiceNumber: data.referenceId,
                items: invoiceItems,
                totalAmount,
                paidAmount: paidAmt,
                paymentStatus: pStatus,
                paymentMode: data.paymentMode || 'Cash',
                notes: `PAYMENTS: ${JSON.stringify(initialPaymentLog)}`,
                paymentHistory: initialPaymentLog,
                date: data.date || new Date().toISOString(),
                createdAt: new Date().toISOString(),
                recordedBy: data.recordedBy
            };

            for (const item of data.items) {
                const productIndex = products.findIndex((p: any) => p.id === item.productId);
                if (productIndex !== -1) {
                    products[productIndex] = {
                        ...products[productIndex],
                        currentStock: (products[productIndex].currentStock || 0) + item.quantity,
                        updatedAt: new Date().toISOString()
                    };
                }

                transactions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    schoolId: data.schoolId,
                    productId: item.productId,
                    type: 'INWARD',
                    quantity: item.quantity,
                    rate: item.rate,
                    totalAmount: item.quantity * item.rate,
                    entityName: data.entityName,
                    referenceId: data.referenceId,
                    notes: `[INV: ${internalNo}]\n${data.notes || ''}`,
                    purchaseInvoiceId: internalNo,
                    recordedBy: data.recordedBy,
                    createdAt: new Date().toISOString(),
                    date: data.date || new Date().toISOString()
                });
            }

            invoices.push(invoice);

            await updateSchoolAccessories(data.schoolId, {
                inventoryProducts: products,
                purchaseInvoices: invoices,
                stockTransactions: transactions
            });

            revalidatePath('/school-admin/inventory');
            return { success: true, invoice };
        } catch (e: any) {
            console.error("Bulk purchase fallback failed:", e);
            return { success: false, error: e.message || "Failed to record bulk purchase" };
        }
    }
}

export async function syncSimpleCatalogToInventory(schoolId: string) {
    if (!schoolId) return { success: false, error: 'School ID required' };
    try {
        const acc = await getSchoolAccessories(schoolId);
        
        // Simple catalog items
        const simpleItems = Array.isArray(acc.items) ? acc.items : [];
        
        // Advanced catalog items
        const advancedProducts = Array.isArray(acc.inventoryProducts) ? [...acc.inventoryProducts] : [];
        const vendors = Array.isArray(acc.vendors) ? [...acc.vendors] : [];
        const stockTransactions = Array.isArray(acc.stockTransactions) ? [...acc.stockTransactions] : [];
        
        let importCount = 0;
        let vendorCount = 0;

        for (const item of simpleItems) {
            // Check if product already exists in advanced catalog (case-insensitive)
            const exists = advancedProducts.some(p => p.name.toLowerCase() === item.name.toLowerCase());
            if (!exists) {
                const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Add product
                advancedProducts.push({
                    id: productId,
                    schoolId,
                    name: item.name,
                    category: item.category || 'General',
                    sku: item.sku || `SKU-${item.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
                    buyPrice: item.buyRate || 0,
                    sellPrice: item.sellRate || 0,
                    currentStock: item.availableQuantity || item.totalQuantity || 0,
                    minStockThreshold: item.thresholdQuantity || 5,
                    unit: 'Pcs',
                    description: item.description || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                importCount++;

                // Record opening stock transaction if stock > 0
                const qty = item.availableQuantity || item.totalQuantity || 0;
                if (qty > 0) {
                    stockTransactions.push({
                        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        schoolId,
                        productId,
                        type: 'INWARD',
                        quantity: qty,
                        rate: item.buyRate || 0,
                        totalAmount: qty * (item.buyRate || 0),
                        entityName: item.vendorDetails || 'Opening Stock',
                        notes: 'Imported from Simple Catalog',
                        createdAt: new Date().toISOString(),
                        recordedBy: 'SYSTEM'
                    });
                }

                // Add Vendor if listed
                if (item.vendorDetails && item.vendorDetails.trim() !== '') {
                    const vendorExists = vendors.some(v => v.name.toLowerCase() === item.vendorDetails.toLowerCase());
                    if (!vendorExists) {
                        vendors.push({
                            id: `vend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            schoolId,
                            name: item.vendorDetails,
                            contactPerson: '',
                            phone: '',
                            email: '',
                            address: '',
                            createdAt: new Date().toISOString()
                        });
                        vendorCount++;
                    }
                }
            }
        }

        if (importCount > 0) {
            await updateSchoolAccessories(schoolId, {
                inventoryProducts: advancedProducts,
                vendors,
                stockTransactions
            });
            revalidatePath('/school-admin/inventory');
        }

        return { 
            success: true, 
            importedCount: importCount, 
            importedVendorsCount: vendorCount 
        };
    } catch (e: any) {
        console.error("Failed to sync simple catalog to inventory:", e);
        return { success: false, error: e.message || 'Unknown error' };
    }
}

