/**
 * Test Script: Accessories Module — End-to-End Logic Verification
 * 
 * This script directly invokes the Prisma client and data.json functions
 * to verify that the accessories hybrid architecture works correctly.
 * 
 * Run with: node --env-file=.env scratch/test_accessories.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(process.cwd(), 'data.json');

// ─── Helpers ───────────────────────────────────────────────────
function readDataJson() {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}

function pass(label) { console.log(`  ✅ PASS: ${label}`); }
function fail(label, detail) { console.log(`  ❌ FAIL: ${label} — ${detail}`); }
function info(label, detail) { console.log(`  ℹ️  INFO: ${label}${detail ? ' — ' + detail : ''}`); }
function header(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

// ─── Main ──────────────────────────────────────────────────────
async function main() {
    // 1. Connect to Prisma
    header('1. PRISMA CONNECTION TEST');
    let prisma;
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        prisma = new PrismaClient({ adapter });
        await prisma.$connect();
        pass('Connected to PostgreSQL via Prisma');
    } catch (err) {
        fail('Prisma connection', err.message);
        process.exit(1);
    }

    // 2. List all schools in Prisma
    header('2. PRISMA SCHOOLS');
    let prismaSchools;
    try {
        prismaSchools = await prisma.school.findMany({
            select: { id: true, name: true, schoolId: true, accessories: true, accessoryTemplateId: true, currentSession: true }
        });
        info(`Found ${prismaSchools.length} schools in Prisma`);
        prismaSchools.forEach(s => {
            const hasAcc = s.accessories ? 'YES' : 'NO';
            const itemCount = s.accessories?.items?.length || 0;
            const catCount = s.accessories?.categories?.length || 0;
            const fieldCount = s.accessories?.fieldConfig?.length || 0;
            console.log(`    • ${s.name} (${s.id}) — Accessories: ${hasAcc}, Items: ${itemCount}, Categories: ${catCount}, Fields: ${fieldCount}, Template: ${s.accessoryTemplateId || 'none'}, Session: ${s.currentSession || 'none'}`);
        });
        pass('Listed all Prisma schools');
    } catch (err) {
        fail('List Prisma schools', err.message);
    }

    // 3. List schools in data.json
    header('3. DATA.JSON SCHOOLS');
    let dataJson;
    try {
        dataJson = readDataJson();
        const djSchools = dataJson.schools || [];
        info(`Found ${djSchools.length} schools in data.json`);
        djSchools.forEach(s => {
            const hasAcc = s.accessories ? 'YES' : 'NO';
            const itemCount = s.accessories?.items?.length || 0;
            const catCount = s.accessories?.categories?.length || 0;
            console.log(`    • ${s.name} (${s.id}) — Accessories: ${hasAcc}, Items: ${itemCount}, Categories: ${catCount}`);
        });
        pass('Listed all data.json schools');
    } catch (err) {
        fail('Read data.json', err.message);
    }

    // 4. Check accessory templates in data.json
    header('4. ACCESSORY TEMPLATES');
    try {
        const templates = dataJson.accessoryTemplates || [];
        info(`Found ${templates.length} accessory templates`);
        templates.forEach(t => {
            const catCount = t.categories?.length || 0;
            const itemCount = t.defaultItems?.length || 0;
            const fieldCount = t.fieldConfig?.length || 0;
            console.log(`    • ${t.name} (${t.id}) — Default: ${t.isDefault || false}, Categories: ${catCount}, Default Items: ${itemCount}, Fields: ${fieldCount}`);
        });
        pass('Listed all accessory templates');
    } catch (err) {
        fail('List templates', err.message);
    }

    // 5. Pick a test school — prefer one that exists in BOTH Prisma and data.json
    header('5. HYBRID CONSISTENCY CHECK');
    const prismaIds = new Set(prismaSchools.map(s => s.id));
    const djIds = new Set((dataJson.schools || []).map(s => s.id));
    
    const bothIds = [...prismaIds].filter(id => djIds.has(id));
    const prismaOnly = [...prismaIds].filter(id => !djIds.has(id));
    const djOnly = [...djIds].filter(id => !prismaIds.has(id));
    
    info(`Schools in BOTH: ${bothIds.length}`);
    info(`Schools in Prisma ONLY: ${prismaOnly.length}`, prismaOnly.join(', '));
    info(`Schools in data.json ONLY: ${djOnly.length}`, djOnly.join(', '));

    // 6. Test assignAccessoryTemplateToSchool for a Prisma-only school
    header('6. TEMPLATE ASSIGNMENT TEST');
    const templates = dataJson.accessoryTemplates || [];
    const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
    
    if (prismaOnly.length > 0 && defaultTemplate) {
        const testSchoolId = prismaOnly[0];
        const testSchool = prismaSchools.find(s => s.id === testSchoolId);
        info(`Testing with Prisma-only school: ${testSchool?.name} (${testSchoolId})`);
        info(`Using template: ${defaultTemplate.name} (${defaultTemplate.id})`);
        
        // Simulate assignAccessoryTemplateToSchool logic
        try {
            const templateCategories = JSON.parse(JSON.stringify(defaultTemplate.categories));
            const templateItems = defaultTemplate.defaultItems ? JSON.parse(JSON.stringify(defaultTemplate.defaultItems)) : [];
            const DEFAULT_ACCESSORY_FIELDS = [
                { fieldName: 'sku', label: 'SKU', isVisible: true, isRequired: false },
                { fieldName: 'vendorDetails', label: 'Vendor Details', isVisible: true, isRequired: false },
                { fieldName: 'entryDate', label: 'Entry Date', isVisible: true, isRequired: false },
                { fieldName: 'entryQuantity', label: 'Entry Quantity', isVisible: true, isRequired: false },
                { fieldName: 'totalQuantity', label: 'Total Quantity', isVisible: true, isRequired: false },
                { fieldName: 'availableQuantity', label: 'Available Quantity', isVisible: true, isRequired: false },
                { fieldName: 'thresholdQuantity', label: 'Threshold Quantity', isVisible: true, isRequired: false },
                { fieldName: 'buyPrice', label: 'Buy Rate', isVisible: true, isRequired: false },
                { fieldName: 'sellPrice', label: 'Sell Rate', isVisible: true, isRequired: false },
                { fieldName: 'carryForward', label: 'Carry Forward', isVisible: true, isRequired: false }
            ];
            const baseConfig = defaultTemplate.fieldConfig || [];
            const mergedConfig = DEFAULT_ACCESSORY_FIELDS.map(def => {
                const existing = baseConfig.find(eb => eb.fieldName === def.fieldName);
                return existing ? { ...def, isVisible: existing.isVisible } : def;
            });
            const accessories = {
                categories: templateCategories,
                items: templateItems,
                fieldConfig: mergedConfig
            };

            // Try Prisma first
            let existing = await prisma.school.findUnique({ where: { id: testSchoolId } });
            if (!existing) existing = await prisma.school.findUnique({ where: { schoolId: testSchoolId } });

            if (existing) {
                await prisma.school.update({
                    where: { id: existing.id },
                    data: { accessoryTemplateId: defaultTemplate.id, accessories: accessories }
                });
                pass(`Assigned template to Prisma-only school "${testSchool?.name}"`);

                // Verify it was stored correctly
                const updated = await prisma.school.findUnique({
                    where: { id: existing.id },
                    select: { accessories: true, accessoryTemplateId: true }
                });
                const storedAcc = updated?.accessories;
                if (storedAcc && storedAcc.categories && storedAcc.fieldConfig) {
                    pass(`Verified: ${storedAcc.categories.length} categories, ${storedAcc.items?.length || 0} items, ${storedAcc.fieldConfig.length} fields stored in Prisma`);
                } else {
                    fail('Verify stored accessories', 'Accessories data not found after update');
                }
            } else {
                fail('Find school in Prisma', `School ${testSchoolId} not found`);
            }
        } catch (err) {
            fail('Template assignment', err.message);
        }
    } else if (templates.length === 0) {
        info('SKIP: No accessory templates available');
    } else {
        info('SKIP: No Prisma-only schools to test with');
    }

    // 7. Test updateSchoolAccessorySettings
    header('7. SETTINGS UPDATE TEST');
    if (prismaSchools.length > 0) {
        const testSchool = prismaSchools.find(s => s.accessories) || prismaSchools[0];
        info(`Testing settings update on: ${testSchool.name} (${testSchool.id})`);
        
        try {
            const currentAcc = testSchool.accessories || { categories: [], items: [], fieldConfig: [] };
            const testConfig = [
                { fieldName: 'sku', label: 'SKU', isVisible: false, isRequired: false },
                { fieldName: 'vendorDetails', label: 'Vendor Details', isVisible: true, isRequired: false },
                { fieldName: 'buyPrice', label: 'Buy Rate', isVisible: true, isRequired: true },
                { fieldName: 'sellPrice', label: 'Sell Rate', isVisible: true, isRequired: true },
            ];
            
            const updatedAcc = { ...currentAcc, fieldConfig: testConfig };
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: updatedAcc }
            });
            
            // Verify
            const verifySchool = await prisma.school.findUnique({
                where: { id: testSchool.id },
                select: { accessories: true }
            });
            const storedConfig = verifySchool?.accessories?.fieldConfig || [];
            if (storedConfig.length === 4) {
                const skuField = storedConfig.find(f => f.fieldName === 'sku');
                if (skuField && skuField.isVisible === false) {
                    pass('Settings update: SKU field visibility toggled to false');
                } else {
                    fail('Settings verification', 'SKU visibility not updated correctly');
                }
                const buyField = storedConfig.find(f => f.fieldName === 'buyPrice');
                if (buyField && buyField.isRequired === true) {
                    pass('Settings update: buyPrice field set to required');
                } else {
                    fail('Settings verification', 'buyPrice required flag not set');
                }
            } else {
                fail('Settings verification', `Expected 4 fields, got ${storedConfig.length}`);
            }
            
            // Restore original config
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: currentAcc }
            });
            info('Restored original settings after test');
        } catch (err) {
            fail('Settings update', err.message);
        }
    }

    // 8. Test updateSchoolAccessoryCategories
    header('8. CATEGORY UPDATE TEST');
    if (prismaSchools.length > 0) {
        const testSchool = prismaSchools.find(s => s.accessories?.categories?.length > 0) || prismaSchools[0];
        info(`Testing category update on: ${testSchool.name} (${testSchool.id})`);
        
        try {
            const currentAcc = testSchool.accessories || { categories: [], items: [], fieldConfig: [] };
            const originalCategories = currentAcc.categories || [];
            
            // Add a test category
            const testCategories = [
                ...originalCategories,
                { id: `cat_test_${Date.now()}`, name: 'Winter Wear (TEST)' }
            ];
            
            const updatedAcc = { ...currentAcc, categories: testCategories };
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: updatedAcc }
            });
            
            // Verify
            const verifySchool = await prisma.school.findUnique({
                where: { id: testSchool.id },
                select: { accessories: true }
            });
            const storedCats = verifySchool?.accessories?.categories || [];
            const testCat = storedCats.find(c => c.name === 'Winter Wear (TEST)');
            if (testCat) {
                pass(`Category added: "Winter Wear (TEST)" — total ${storedCats.length} categories`);
            } else {
                fail('Category addition', 'Test category not found after update');
            }
            
            // Restore original categories
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: { ...currentAcc, categories: originalCategories } }
            });
            info('Restored original categories after test');
        } catch (err) {
            fail('Category update', err.message);
        }
    }

    // 9. Test item add and stock management
    header('9. ITEM ADD & STOCK MANAGEMENT TEST');
    if (prismaSchools.length > 0) {
        const testSchool = prismaSchools.find(s => s.accessories?.categories?.length > 0) || prismaSchools[0];
        info(`Testing item management on: ${testSchool.name} (${testSchool.id})`);
        
        try {
            const currentAcc = testSchool.accessories || { categories: [], items: [], fieldConfig: [] };
            const sessionId = testSchool.currentSession || '2025-2026';
            
            // Create a test item
            const testItem = {
                id: `acc_test_${Date.now()}`,
                name: 'Test Belt (AUTOMATED)',
                categoryId: currentAcc.categories?.[0]?.id || 'cat_general',
                sku: 'TEST-BELT-001',
                entryQuantity: 50,
                totalQuantity: 50,
                availableQuantity: 50,
                thresholdQuantity: 5,
                buyPrice: 100,
                sellPrice: 150,
                carryForward: true,
                attributes: { gender: 'Unisex', size: 'Standard' },
                sessionData: {
                    [sessionId]: {
                        entryQuantity: 50,
                        totalQuantity: 50,
                        availableQuantity: 50
                    }
                }
            };
            
            const updatedItems = [...(currentAcc.items || []), testItem];
            const updatedAcc = { ...currentAcc, items: updatedItems };
            
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: updatedAcc }
            });
            
            // Verify item was added
            const verifySchool = await prisma.school.findUnique({
                where: { id: testSchool.id },
                select: { accessories: true }
            });
            const storedItems = verifySchool?.accessories?.items || [];
            const addedItem = storedItems.find(i => i.id === testItem.id);
            if (addedItem) {
                pass(`Item added: "${addedItem.name}" — SKU: ${addedItem.sku}, Stock: ${addedItem.availableQuantity}`);
                
                // Simulate selling 3 units (like addAccessorySale would do)
                const soldQty = 3;
                const sessionStats = addedItem.sessionData?.[sessionId];
                if (sessionStats) {
                    sessionStats.availableQuantity -= soldQty;
                    addedItem.availableQuantity -= soldQty;
                    
                    await prisma.school.update({
                        where: { id: testSchool.id },
                        data: { accessories: { ...verifySchool.accessories, items: storedItems } }
                    });
                    
                    // Verify stock was decremented
                    const verifyAfterSale = await prisma.school.findUnique({
                        where: { id: testSchool.id },
                        select: { accessories: true }
                    });
                    const itemAfterSale = verifyAfterSale?.accessories?.items?.find(i => i.id === testItem.id);
                    const stockAfter = itemAfterSale?.sessionData?.[sessionId]?.availableQuantity;
                    if (stockAfter === 47) {
                        pass(`Stock deduction: 50 - ${soldQty} = ${stockAfter} ✓`);
                    } else {
                        fail('Stock deduction', `Expected 47, got ${stockAfter}`);
                    }
                } else {
                    fail('Session data', `No session data found for session "${sessionId}"`);
                }
            } else {
                fail('Item addition', 'Test item not found after insert');
            }
            
            // Clean up: remove the test item
            const cleanedItems = (verifySchool?.accessories?.items || []).filter(i => i.id !== testItem.id);
            await prisma.school.update({
                where: { id: testSchool.id },
                data: { accessories: { ...currentAcc, items: cleanedItems } }
            });
            info('Cleaned up test item');
        } catch (err) {
            fail('Item management', err.message);
        }
    }

    // 10. Check accessory sales in data.json
    header('10. ACCESSORY SALES DATA');
    try {
        const sales = dataJson.accessorySales || [];
        info(`Total sales records in data.json: ${sales.length}`);
        if (sales.length > 0) {
            const recentSales = sales.slice(-3);
            recentSales.forEach(s => {
                console.log(`    • Sale ${s.id}: ${s.studentName} (${s.className}/${s.section}) — Items: ${s.items?.length || 0}, Total: ₹${s.totalAmount}, Mode: ${s.paymentMode}, Date: ${s.date?.split('T')[0]}`);
            });
        }
        pass('Sales data accessible');
    } catch (err) {
        fail('Sales data', err.message);
    }

    // 11. Test getSchool action flow (simulating what the page does)
    header('11. getSchool HYBRID LOOKUP');
    if (prismaSchools.length > 0) {
        const testId = prismaSchools[0].id;
        info(`Testing getSchool with ID: ${testId}`);
        
        try {
            // Prisma lookup
            let school = await prisma.school.findUnique({ where: { id: testId } });
            if (school) {
                pass(`Found in Prisma: "${school.name}"`);
                
                const acc = school.accessories;
                if (acc) {
                    console.log(`    • Categories: ${acc.categories?.length || 0}`);
                    console.log(`    • Items: ${acc.items?.length || 0}`);
                    console.log(`    • Field Config: ${acc.fieldConfig?.length || 0}`);
                    
                    // List items with stock
                    if (acc.items?.length > 0) {
                        const session = school.currentSession || '2025-2026';
                        console.log(`    • Items detail (session: ${session}):`);
                        acc.items.forEach(item => {
                            const sStats = item.sessionData?.[session];
                            const stock = sStats?.availableQuantity ?? item.availableQuantity ?? 0;
                            const total = sStats?.totalQuantity ?? item.totalQuantity ?? 0;
                            const category = acc.categories?.find(c => c.id === item.categoryId);
                            console.log(`      - ${item.name} | Cat: ${category?.name || 'N/A'} | Stock: ${stock}/${total} | Buy: ₹${item.buyPrice || 0} | Sell: ₹${item.sellPrice || 0}`);
                        });
                    }
                    
                    // List field config visibility
                    if (acc.fieldConfig?.length > 0) {
                        console.log(`    • Field Config detail:`);
                        acc.fieldConfig.forEach(f => {
                            const vis = f.isVisible ? '👁️ ' : '🚫';
                            const req = f.isRequired ? ' (REQUIRED)' : '';
                            console.log(`      - ${vis} ${f.label} [${f.fieldName}]${req}`);
                        });
                    }
                    
                    pass('School accessories data retrieved and validated');
                } else {
                    info('No accessories configured for this school');
                }
            } else {
                fail('Prisma lookup', 'School not found');
            }
        } catch (err) {
            fail('getSchool test', err.message);
        }
    }

    // Summary
    header('TEST SUMMARY');
    console.log('  All tests completed. Review results above.\n');

    await prisma.$disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
