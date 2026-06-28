import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readDb, writeDb } from './db';

// Only run on server
const isServer = typeof window !== 'undefined';

// Locked to local database mode permanently to ensure database stability
let useMockClient = true;

if (!isServer) {
    console.log(`[Prisma] Database Client Mode: OFFLINE (Local data.json) [FORCED]`);
}

// Emulate Prisma Client using local JSON DB
function getCollectionName(modelName: string): string {
    const map: Record<string, string> = {
        school: 'schools',
        student: 'students',
        user: 'users',
        saaspackage: 'packages',
        session: 'sessions',
        studentdocument: 'studentDocuments',
        feetransaction: 'feeTransactions',
        admissionformtemplate: 'admissionFormTemplates',
        idcardtemplate: 'idCardTemplates',
        staffformtemplate: 'staffFormTemplates',
        studentprofiletemplate: 'studentProfileTemplates'
    };
    const lower = modelName.toLowerCase();
    return map[lower] || (modelName + 's');
}

function matchWhere(item: any, where: any): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
        if (value === undefined) return true;
        
        let itemValue = item[key];
        
        if (value && typeof value === 'object') {
            const val = value as any;
            if ('equals' in val) return itemValue === val.equals;
            if ('in' in val) return Array.isArray(val.in) && val.in.includes(itemValue);
            if ('notIn' in val) return Array.isArray(val.notIn) && !val.notIn.includes(itemValue);
            if ('not' in val) return itemValue !== val.not;
            if ('contains' in val) {
                return typeof itemValue === 'string' && itemValue.toLowerCase().includes(String(val.contains).toLowerCase());
            }
            if ('startsWith' in val) {
                return typeof itemValue === 'string' && itemValue.startsWith(String(val.startsWith));
            }
            if ('gt' in val) return itemValue > val.gt;
            if ('gte' in val) return itemValue >= val.gte;
            if ('lt' in val) return itemValue < val.lt;
            if ('lte' in val) return itemValue <= val.lte;
            if ('contains' in val || 'startsWith' in val) return true;
        }
        
        if (key === 'OR') {
            return Array.isArray(value) && value.some(w => matchWhere(item, w));
        }
        if (key === 'AND') {
            return Array.isArray(value) && value.every(w => matchWhere(item, w));
        }
        if (key === 'NOT') {
            return Array.isArray(value) ? !value.some(w => matchWhere(item, w)) : !matchWhere(item, value);
        }
        
        return itemValue === value;
    });
}

function resolveRelations(item: any, modelName: string, db: any, include: any): any {
    if (!include || !item) return item;
    const copy = { ...item };
    const collectionName = getCollectionName(modelName);
    
    Object.entries(include).forEach(([key, val]) => {
        if (!val) return;
        
        if (collectionName === 'schools') {
            if (key === 'sessions') {
                copy.sessions = item.sessions || [];
            }
            if (key === 'users') {
                copy.users = (db.users || []).filter((u: any) => u.schoolId === item.id);
            }
            if (key === 'students') {
                copy.students = (db.students || []).filter((s: any) => s.schoolId === item.id);
            }
            if (key === '_count') {
                copy._count = {
                    students: (db.students || []).filter((s: any) => s.schoolId === item.id).length,
                    users: (db.users || []).filter((u: any) => u.schoolId === item.id).length,
                    sessions: (item.sessions || []).length
                };
            }
        }
        
        if (collectionName === 'students') {
            if (key === 'school') {
                copy.school = (db.schools || []).find((s: any) => s.id === item.schoolId);
            }
            if (key === 'transactions') {
                copy.transactions = (db.feeTransactions || []).filter((t: any) => t.studentId === item.id);
            }
            if (key === 'documents') {
                copy.documents = (db.studentDocuments || []).filter((d: any) => d.studentId === item.id);
            }
        }
        
        if (collectionName === 'feeTransactions') {
            if (key === 'student') {
                copy.student = (db.students || []).find((s: any) => s.id === item.studentId);
            }
        }
        
        if (collectionName === 'users') {
            if (key === 'school') {
                copy.school = (db.schools || []).find((s: any) => s.id === item.schoolId);
            }
        }

        if (collectionName === 'inventoryProducts') {
            if (key === 'transactions') {
                copy.transactions = (db.stockTransactions || []).filter((t: any) => t.productId === item.id);
            }
        }

        if (collectionName === 'purchaseInvoices') {
            if (key === 'transactions') {
                copy.transactions = (db.stockTransactions || []).filter((t: any) => t.purchaseInvoiceId === item.id);
            }
        }
    });
    
    return copy;
}

function getCollectionItems(collectionName: string, db: any): any[] {
    if (collectionName === 'sessions') {
        const list: any[] = [];
        (db.schools || []).forEach((s: any) => {
            if (s.sessions && Array.isArray(s.sessions)) {
                s.sessions.forEach((sess: any) => {
                    list.push({ ...sess, schoolId: s.id });
                });
            }
        });
        return list;
    }
    return db[collectionName] || [];
}

function saveCollectionItems(collectionName: string, items: any[], db: any) {
    if (collectionName === 'sessions') {
        const schoolMap: Record<string, any[]> = {};
        items.forEach((sess: any) => {
            const { schoolId, ...sessionData } = sess;
            if (schoolId) {
                if (!schoolMap[schoolId]) schoolMap[schoolId] = [];
                schoolMap[schoolId].push(sessionData);
            }
        });
        db.schools = (db.schools || []).map((s: any) => {
            if (schoolMap[s.id]) {
                return { ...s, sessions: schoolMap[s.id] };
            }
            return s;
        });
        return;
    }
    db[collectionName] = items;
}

function makeMockModel(modelName: string) {
    const collectionName = getCollectionName(modelName);
    
    return {
        findMany: async (args: any = {}) => {
            const db = readDb();
            let items = getCollectionItems(collectionName, db);
            
            if (args.where) {
                items = items.filter(item => matchWhere(item, args.where));
            }
            
            let resolved = items.map(item => resolveRelations(item, modelName, db, args.include));
            
            if (args.orderBy) {
                const [field, direction] = Object.entries(args.orderBy)[0] as [string, 'asc' | 'desc'];
                resolved.sort((a, b) => {
                    const valA = a[field];
                    const valB = b[field];
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            
            if (args.skip) {
                resolved = resolved.slice(args.skip);
            }
            if (args.take) {
                resolved = resolved.slice(0, args.take);
            }
            
            return JSON.parse(JSON.stringify(resolved));
        },
        
        findUnique: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const item = items.find(item => matchWhere(item, args.where));
            if (!item) return null;
            const resolved = resolveRelations(item, modelName, db, args.include);
            return JSON.parse(JSON.stringify(resolved));
        },
        
        findFirst: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const item = items.find(item => matchWhere(item, args.where));
            if (!item) return null;
            const resolved = resolveRelations(item, modelName, db, args.include);
            return JSON.parse(JSON.stringify(resolved));
        },
        
        create: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            
            const newItem = {
                id: args.data.id || `${modelName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...args.data
            };
            
            items.push(newItem);
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            const resolved = resolveRelations(newItem, modelName, db, args.include);
            return JSON.parse(JSON.stringify(resolved));
        },
        
        createMany: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const newItems = (args.data || []).map((d: any) => ({
                id: d.id || `${modelName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...d
            }));
            
            items.push(...newItems);
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            return { count: newItems.length };
        },
        
        update: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const index = items.findIndex(item => matchWhere(item, args.where));
            if (index === -1) {
                throw new Error(`Record to update not found in mock ${modelName}`);
            }
            
            const updatedItem = {
                ...items[index],
                ...args.data,
                updatedAt: new Date().toISOString()
            };
            
            items[index] = updatedItem;
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            const resolved = resolveRelations(updatedItem, modelName, db, args.include);
            return JSON.parse(JSON.stringify(resolved));
        },
        
        updateMany: async (args: any = {}) => {
            const db = readDb();
            let items = getCollectionItems(collectionName, db);
            let count = 0;
            
            items = items.map(item => {
                if (matchWhere(item, args.where)) {
                    count++;
                    return {
                        ...item,
                        ...args.data,
                        updatedAt: new Date().toISOString()
                    };
                }
                return item;
            });
            
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            return { count };
        },
        
        upsert: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const index = items.findIndex(item => matchWhere(item, args.where));
            
            let item;
            if (index !== -1) {
                item = {
                    ...items[index],
                    ...args.update,
                    updatedAt: new Date().toISOString()
                };
                items[index] = item;
            } else {
                item = {
                    id: args.where.id || `${modelName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...args.create
                };
                items.push(item);
            }
            
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            const resolved = resolveRelations(item, modelName, db, args.include);
            return JSON.parse(JSON.stringify(resolved));
        },
        
        delete: async (args: any = {}) => {
            const db = readDb();
            const items = getCollectionItems(collectionName, db);
            const index = items.findIndex(item => matchWhere(item, args.where));
            if (index === -1) {
                throw new Error(`Record to delete not found in mock ${modelName}`);
            }
            
            const deletedItem = items.splice(index, 1)[0];
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            return JSON.parse(JSON.stringify(deletedItem));
        },
        
        deleteMany: async (args: any = {}) => {
            const db = readDb();
            let items = getCollectionItems(collectionName, db);
            const beforeLength = items.length;
            
            if (args.where) {
                items = items.filter(item => !matchWhere(item, args.where));
            } else {
                items = [];
            }
            
            const count = beforeLength - items.length;
            saveCollectionItems(collectionName, items, db);
            writeDb(db);
            
            return { count };
        },
        
        count: async (args: any = {}) => {
            const db = readDb();
            let items = getCollectionItems(collectionName, db);
            if (args.where) {
                items = items.filter(item => matchWhere(item, args.where));
            }
            return items.length;
        }
    };
}

const mockPrismaClient: any = new Proxy({}, {
    get(target, prop) {
        if (prop === '$transaction') {
            return async (arg: any) => {
                if (typeof arg === 'function') {
                    return arg(mockPrismaClient);
                }
                return Promise.all(arg);
            };
        }
        if (prop === '$disconnect') {
            return async () => {};
        }
        
        const modelName = prop as string;
        return makeMockModel(modelName);
    }
});

const prismaClientSingleton = () => {
    if (typeof window !== 'undefined') return null as any;
    
    if (useMockClient) {
        return mockPrismaClient;
    }
    
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        return new PrismaClient({ adapter });
    } catch (err) {
        console.warn('[Prisma] Client initialization failed. Using data.json mock client.', err);
        return mockPrismaClient;
    }
};

declare global {
    var prisma: undefined | any;
}

const prisma = new Proxy({}, {
    get(target, prop) {
        if (typeof window !== 'undefined') return null as any;
        
        if (useMockClient) {
            return mockPrismaClient[prop];
        }
        
        const activeClient = globalThis.prisma;
        if (activeClient) {
            return activeClient[prop];
        }
        
        const client = prismaClientSingleton();
        globalThis.prisma = client;
        return client[prop];
    }
});

export default prisma as any;
