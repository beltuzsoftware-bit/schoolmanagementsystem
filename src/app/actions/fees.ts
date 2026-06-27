'use server';

import { readDb, writeDb } from '@/lib/db';
import prisma from '@/lib/prisma';
import { FeeGroup, Transaction as FeeTransaction } from '@/types/fees';
import { revalidatePath } from 'next/cache';

export async function getFeeGroups(schoolId: string) {
    const db = readDb();
    if (!db.feeGroups) return [];
    return db.feeGroups.filter((g: FeeGroup) => g.schoolId === schoolId);
}

export async function addFeeGroup(group: FeeGroup) {
    const db = readDb();
    if (!db.feeGroups) db.feeGroups = [];
    db.feeGroups.push(group);
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function updateFeeGroup(id: string, data: Partial<FeeGroup>) {
    const db = readDb();
    if (!db.feeGroups) return { success: false, error: 'Database error' };

    const index = db.feeGroups.findIndex((g: FeeGroup) => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };

    db.feeGroups[index] = { ...db.feeGroups[index], ...data };
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function deleteFeeGroup(id: string) {
    const db = readDb();
    if (!db.feeGroups) return { success: false, error: 'Database error' };

    const index = db.feeGroups.findIndex((g: FeeGroup) => g.id === id);
    if (index === -1) return { success: false, error: 'Group not found' };

    db.feeGroups.splice(index, 1);
    writeDb(db);
    revalidatePath('/school-admin/fees');
    return { success: true };
}

export async function getFeeTransactions(schoolId: string, studentId?: string) {
    const db = readDb();
    if (!db.feeTransactions) return [];
    return db.feeTransactions.filter((t: FeeTransaction) =>
        t.schoolId === schoolId &&
        (!studentId || t.studentId === studentId)
    );
}

export async function addFeeTransaction(transaction: FeeTransaction) {
    const db = readDb();
    if (!db.feeTransactions) db.feeTransactions = [];
    try {
        db.feeTransactions.push(transaction);
        writeDb(db);
        revalidatePath('/school-admin/fees', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Failed to add fee transaction:', error);
        return { success: false, error: 'Failed to save transaction to database' };
    }
}

export async function addFeeTransactionsBatch(transactions: FeeTransaction[]) {
    if (!transactions.length) return { success: false, error: 'No transactions' };

    const db = readDb();
    if (!db.feeTransactions) db.feeTransactions = [];

    const schoolId = transactions[0].schoolId;
    let invoiceNo = transactions[0].invoiceNo;

    if (!invoiceNo) {
        invoiceNo = `TXN-${Date.now()}`;
        if (!db.invoiceSettings) db.invoiceSettings = {};
        const settings = db.invoiceSettings[schoolId];

        if (settings) {
            const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { feeCollectionTemplate: true } });
            const template = school?.feeCollectionTemplate || 'template_1';
            
            let prefix = settings.prefix;
            if (template === 'template_1' && settings.template1Prefix) {
                prefix = settings.template1Prefix;
            } else if (template === 'template_2' && settings.template2Prefix) {
                prefix = settings.template2Prefix;
            }

            const nextSeq = Math.max(settings.startFrom, settings.currentSequence + 1);
            invoiceNo = `${prefix}${nextSeq.toString().padStart(settings.padding, '0')}`;
            settings.currentSequence = nextSeq;
        }
    }

    try {
        const updatedTxns = transactions.map(t => ({
            ...t,
            id: t.id || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            invoiceNo: invoiceNo
        }));

        updatedTxns.forEach(t => db.feeTransactions.push(t));

        writeDb(db);
        revalidatePath('/school-admin/fees', 'layout');
        return { success: true, invoiceNo, transactions: updatedTxns };
    } catch (error) {
        console.error('Failed to add fee transactions batch:', error);
        return { success: false, error: 'Failed to save transactions to database' };
    }
}

export async function revertFeeTransaction(id: string, reason: string = 'User requested revert') {
    const db = readDb();
    if (!db.feeTransactions) return { success: false, error: 'Database error' };

    const primaryTxn = db.feeTransactions.find((t: any) => t.id === id);
    if (!primaryTxn) return { success: false, error: 'Transaction not found' };

    const transactionsToRevert = primaryTxn.invoiceNo 
        ? db.feeTransactions.filter((t: any) => t.invoiceNo === primaryTxn.invoiceNo)
        : [primaryTxn];

    const revertIds = transactionsToRevert.map(t => t.id);

    if (!db.revertedTransactions) db.revertedTransactions = [];
    db.revertedTransactions.push({
        transactionId: id,
        invoiceNo: primaryTxn.invoiceNo,
        revertedAt: new Date().toISOString(),
        reason,
        deletedRecords: transactionsToRevert
    });

    db.feeTransactions = db.feeTransactions.filter((t: any) => !revertIds.includes(t.id));

    writeDb(db);
    revalidatePath('/school-admin/fees', 'layout');
    return { success: true, count: transactionsToRevert.length };
}

export async function getInvoiceSettings(schoolId: string) {
    const db = readDb();
    return db.invoiceSettings[schoolId] || null;
}

export async function updateInvoiceSettings(schoolId: string, settings: any) {
    const db = readDb();
    if (!db.invoiceSettings) db.invoiceSettings = {};
    db.invoiceSettings[schoolId] = settings;

    writeDb(db);
    revalidatePath('/school-admin/settings');
    return { success: true };
}
