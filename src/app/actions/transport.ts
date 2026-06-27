'use server';

import { readDb, writeDb } from '@/lib/db';
type TransportRoute = any;
type TransportVehicle = any;
type StudentTransportAllocation = any;
type TransportVehicleType = any;
type TransportDriver = any;
import { revalidatePath } from 'next/cache';

// --- TRANSPORT ROUTES ---

export async function getTransportRoutes(): Promise<TransportRoute[]> {
    const db = readDb();
    return db.transportRoutes || [];
}

export async function saveTransportRoute(route: TransportRoute): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.transportRoutes) db.transportRoutes = [];

    const index = db.transportRoutes.findIndex(r => r.id === route.id);
    if (index !== -1) {
        db.transportRoutes[index] = route;
    } else {
        db.transportRoutes.push(route);
    }

    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport route saved successfully' };
}

export async function deleteTransportRoute(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    db.transportRoutes = (db.transportRoutes || []).filter(r => r.id !== id);
    // Also cleanup allocations? For now, let's just keep them but they'll be orphan
    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport route deleted successfully' };
}

// --- TRANSPORT VEHICLES ---

export async function getTransportVehicles(): Promise<TransportVehicle[]> {
    const db = readDb();
    return db.transportVehicles || [];
}

export async function saveTransportVehicle(vehicle: TransportVehicle): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.transportVehicles) db.transportVehicles = [];

    if (vehicle.vehicleNumber) {
        vehicle.vehicleNumber = vehicle.vehicleNumber.toUpperCase();
    }

    const index = db.transportVehicles.findIndex(v => v.id === vehicle.id);
    if (index !== -1) {
        db.transportVehicles[index] = vehicle;
    } else {
        db.transportVehicles.push(vehicle);
    }

    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport vehicle saved successfully' };
}

export async function deleteTransportVehicle(id: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    db.transportVehicles = (db.transportVehicles || []).filter(v => v.id !== id);
    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport vehicle deleted successfully' };
}

// --- TRANSPORT VEHICLE TYPES ---

export async function getTransportVehicleTypes(): Promise<TransportVehicleType[]> {
    const db = readDb();
    return db.transportVehicleTypes || [];
}

export async function saveTransportVehicleType(type: TransportVehicleType): Promise<{ success: boolean; message: string }> {
    try {
        const db = readDb();
        if (!db.transportVehicleTypes) db.transportVehicleTypes = [];

        const index = db.transportVehicleTypes.findIndex(t => t.id === type.id);
        if (index !== -1) {
            db.transportVehicleTypes[index] = type;
        } else {
            db.transportVehicleTypes.push(type);
        }

        writeDb(db);
        revalidatePath('/school-admin/transport');
        return { success: true, message: 'Vehicle type saved successfully' };
    } catch (error) {
        console.error('Failed to save vehicle type:', error);
        return { success: false, message: 'Failed to save vehicle type' };
    }
}

export async function deleteTransportVehicleType(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const db = readDb();
        db.transportVehicleTypes = (db.transportVehicleTypes || []).filter(t => t.id !== id);
        writeDb(db);
        revalidatePath('/school-admin/transport');
        return { success: true, message: 'Vehicle type deleted successfully' };
    } catch (error) {
        console.error('Failed to delete vehicle type:', error);
        return { success: false, message: 'Failed to delete vehicle type' };
    }
}

// --- TRANSPORT ALLOCATIONS ---

export async function getTransportAllocations(): Promise<StudentTransportAllocation[]> {
    const db = readDb();
    return db.transportAllocations || [];
}

export async function assignTransportToStudents(
    studentIds: string[], 
    routeId: string, 
    stopId: string, 
    direction: 'Both' | 'Pick' | 'Drop',
    schoolId?: string,
    startDate?: string,
    endDate?: string
): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.transportAllocations) db.transportAllocations = [];

    // Get Session Start Month from School Settings (default to 3 for April if not set)
    const school = db.schools?.find(s => s.id === schoolId);
    const sessionStartMonth = school?.sessionStartMonth ?? 3;
    const currentMonth = new Date().getMonth();
    const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Generate the session-ordered months
    const sessionOrderedMonths = [];
    for (let i = 0; i < 12; i++) {
        sessionOrderedMonths.push(allMonths[(sessionStartMonth + i) % 12]);
    }

    // Determine Start and End Months for default selection
    const startMonthIndex = startDate ? new Date(startDate).getMonth() : new Date().getMonth();
    const endMonthIndex = endDate ? new Date(endDate).getMonth() : -1;

    const startMonthName = allMonths[startMonthIndex];
    const startIndexInSession = sessionOrderedMonths.indexOf(startMonthName);

    let defaultActiveMonths: string[] = [];
    
    if (startIndexInSession !== -1) {
        if (endMonthIndex !== -1) {
            const endMonthName = allMonths[endMonthIndex];
            const endIndexInSession = sessionOrderedMonths.indexOf(endMonthName);
            
            // If the end month is found in the session and comes after or is the same as the start month
            if (endIndexInSession !== -1 && endIndexInSession >= startIndexInSession) {
                defaultActiveMonths = sessionOrderedMonths.slice(startIndexInSession, endIndexInSession + 1);
            } else {
                // If end month is earlier than start month (e.g. invalid range) or not specified, 
                // default to rest of session
                defaultActiveMonths = sessionOrderedMonths.slice(startIndexInSession);
            }
        } else {
            // Default to rest of session if no end date provided
            defaultActiveMonths = sessionOrderedMonths.slice(startIndexInSession);
        }
    } else {
        // Fallback to all months if start month not found
        defaultActiveMonths = [...sessionOrderedMonths];
    }

    // Remove existing allocations for these students to prevent duplicates
    db.transportAllocations = db.transportAllocations.filter(a => !studentIds.includes(a.studentId));

    const newAllocations: StudentTransportAllocation[] = studentIds.map(sId => ({
        id: `talloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        studentId: sId,
        routeId,
        stopId,
        direction,
        effectiveFrom: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        effectiveUntil: endDate ? new Date(endDate).toISOString() : undefined,
        activeMonths: defaultActiveMonths
    }));

    db.transportAllocations.push(...newAllocations);
    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: `${studentIds.length} students assigned to transport successfully` };
}

export async function updateTransportAllocation(
    allocationId: string,
    routeId: string,
    stopId: string,
    startDate?: string,
    endDate?: string
): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.transportAllocations) return { success: false, message: 'No allocations found' };

    const index = db.transportAllocations.findIndex(a => a.id === allocationId);
    if (index === -1) return { success: false, message: 'Allocation not found' };

    db.transportAllocations[index].routeId = routeId;
    db.transportAllocations[index].stopId = stopId;
    db.transportAllocations[index].effectiveFrom = startDate ? new Date(startDate).toISOString() : db.transportAllocations[index].effectiveFrom;
    db.transportAllocations[index].effectiveUntil = endDate ? new Date(endDate).toISOString() : undefined;

    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport allocation updated successfully' };
}

export async function updateTransportAllocationMonths(
    allocationId: string,
    months: string[]
): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    if (!db.transportAllocations) return { success: false, message: 'No allocations found' };

    const index = db.transportAllocations.findIndex(a => a.id === allocationId);
    if (index === -1) return { success: false, message: 'Allocation not found' };

    db.transportAllocations[index].activeMonths = months;
    
    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport session calendar updated' };
}

export async function removeTransportAllocation(allocationId: string): Promise<{ success: boolean; message: string }> {
    const db = readDb();
    db.transportAllocations = (db.transportAllocations || []).filter(a => a.id !== allocationId);
    writeDb(db);
    revalidatePath('/school-admin/transport');
    return { success: true, message: 'Transport allocation removed' };
}

// --- TRANSPORT INFO FOR FEE INTEGRATION ---

export interface StudentTransportFeeInfo {
    allocationId: string;
    routeId: string;
    routeName: string;
    stopId: string;
    stopName: string;
    monthlyFee: number;
    direction: string;
    effectiveFrom?: string;
    effectiveUntil?: string;
    lateFineGraceDays?: number;
    lateFineAmount?: number;
    lateFineType?: string;
    lateFineEffectiveDate?: string;
}

export async function getStudentTransportInfo(studentId: string): Promise<StudentTransportFeeInfo | null> {
    const db = readDb();
    const allocation = (db.transportAllocations || []).find(a => a.studentId === studentId);
    if (!allocation) return null;

    const route = (db.transportRoutes || []).find(r => r.id === allocation.routeId);
    if (!route) return null;

    const stop = route.stops.find((s: any) => s.id === allocation.stopId);
    if (!stop || !stop.monthlyFee) return null;

    return {
        allocationId: allocation.id,
        routeId: route.id,
        routeName: route.name,
        stopId: stop.id,
        stopName: stop.name,
        monthlyFee: stop.monthlyFee,
        direction: allocation.direction,
        effectiveFrom: allocation.effectiveFrom,
        effectiveUntil: allocation.effectiveUntil,
        lateFineGraceDays: route.lateFineGraceDays,
        lateFineAmount: route.lateFineAmount,
        lateFineType: route.lateFineType,
        lateFineEffectiveDate: route.lateFineEffectiveDate,
    };
}
// --- TRANSPORT DRIVERS ---
export async function getTransportDrivers(): Promise<TransportDriver[]> {
    const db = readDb();
    return db.transportDrivers || [];
}

export async function saveTransportDriver(driver: TransportDriver): Promise<{ success: boolean; message: string }> {
    try {
        const db = readDb();
        if (!db.transportDrivers) db.transportDrivers = [];

        const index = db.transportDrivers.findIndex(d => d.id === driver.id);
        if (index !== -1) {
            db.transportDrivers[index] = driver;
        } else {
            db.transportDrivers.push(driver);
        }

        writeDb(db);
        revalidatePath('/school-admin/transport');
        return { success: true, message: 'Driver saved successfully' };
    } catch (error) {
        console.error('Failed to save driver:', error);
        return { success: false, message: 'Failed to save driver' };
    }
}

export async function deleteTransportDriver(id: string): Promise<{ success: boolean; message: string }> {
    try {
        const db = readDb();
        db.transportDrivers = (db.transportDrivers || []).filter(d => d.id !== id);
        writeDb(db);
        revalidatePath('/school-admin/transport');
        return { success: true, message: 'Driver deleted successfully' };
    } catch (error) {
        console.error('Failed to delete driver:', error);
        return { success: false, message: 'Failed to delete driver' };
    }
}
