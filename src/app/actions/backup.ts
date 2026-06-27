'use server';

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { revalidatePath } from 'next/cache';

const execPromise = util.promisify(exec);

export interface BackupFile {
    name: string;
    sizeMb: number;
    createdAt: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'backup-config.json');

// 1. Get List of Backup Files
export async function getBackups(): Promise<BackupFile[]> {
    try {
        const rootDir = process.cwd();
        const files = await fs.promises.readdir(rootDir);
        const backupFiles: BackupFile[] = [];

        for (const file of files) {
            if (file.startsWith('KuMMi_Portable_Backup_') && file.endsWith('.zip')) {
                const filePath = path.join(rootDir, file);
                const stats = await fs.promises.stat(filePath);
                backupFiles.push({
                    name: file,
                    sizeMb: parseFloat((stats.size / (1024 * 1024)).toFixed(2)),
                    createdAt: stats.mtime.toISOString(),
                });
            }
        }

        // Sort by creation date descending (newest first)
        return backupFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        console.error('Error fetching backups:', error);
        return [];
    }
}

// 2. Create Portable Backup
export async function createBackup() {
    try {
        // Run create_portable_backup.ps1 using powershell
        // We pipe an empty string into the powershell execution. This automatically satisfies the 'Pause'
        // statement at the end of the script, preventing it from hanging forever in non-interactive environments!
        const command = 'echo "" | powershell -NoProfile -ExecutionPolicy Bypass -File create_portable_backup.ps1';
        
        const { stdout, stderr } = await execPromise(command, { cwd: process.cwd() });
        console.log('Backup Script Output:', stdout);
        
        if (stderr && !stderr.includes('Warning')) {
            console.error('Backup Script Stderr:', stderr);
        }

        revalidatePath('/super-admin/backup');
        return { success: true, message: 'Portable backup created successfully' };
    } catch (error: any) {
        console.error('Failed to create backup:', error);
        return { success: false, error: error.message || 'Backup script execution failed' };
    }
}

// 3. Delete Backup
export async function deleteBackup(filename: string) {
    try {
        if (!filename.startsWith('KuMMi_Portable_Backup_') || !filename.endsWith('.zip')) {
            return { success: false, error: 'Invalid backup file name' };
        }

        const filePath = path.join(process.cwd(), filename);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            revalidatePath('/super-admin/backup');
            return { success: true };
        } else {
            return { success: false, error: 'Backup file not found' };
        }
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to delete backup file' };
    }
}

// 4. Restore Backup
export async function restoreBackup(filename: string) {
    try {
        if (!filename.startsWith('KuMMi_Portable_Backup_') || !filename.endsWith('.zip')) {
            return { success: false, error: 'Invalid backup file name' };
        }

        const rootDir = process.cwd();
        const zipPath = path.join(rootDir, filename);

        if (!fs.existsSync(zipPath)) {
            return { success: false, error: 'Backup file not found' };
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Construct clean PowerShell command sequence to:
        // 1. Create a safety backup of data.json
        // 2. Extract backup zip to a temporary folder
        // 3. Copy files back into the root workspace
        // 4. Run database migration sync
        // 5. Clean up temporary folder
        const psCommand = `
            if (Test-Path "data.json") {
                Copy-Item -Path "data.json" -Destination "data.json.before_restore_${timestamp}.json" -Force
            }
            if (Test-Path "temp_restore") { Remove-Item -Path "temp_restore" -Recurse -Force }
            Expand-Archive -Path "${filename}" -DestinationPath "temp_restore" -Force
            Copy-Item -Path "temp_restore\\*" -Destination "." -Recurse -Force
            Remove-Item -Path "temp_restore" -Recurse -Force
        `.trim().replace(/\n/g, ' ; ');

        console.log('Executing PowerShell Restore Operations...');
        await execPromise(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, { cwd: rootDir });

        console.log('Syncing database tables with restored JSON...');
        if (fs.existsSync(path.join(rootDir, 'scripts', 'migrate-data.cjs'))) {
            const { stdout } = await execPromise('node scripts/migrate-data.cjs', { cwd: rootDir });
            console.log('Database Migration Output:', stdout);
        } else {
            console.warn('migrate-data.cjs script not found during restoration');
        }

        revalidatePath('/super-admin/backup');
        return { success: true, message: 'Restore completed successfully. Please restart your dev server if compilation errors occur.' };
    } catch (error: any) {
        console.error('Restore failed:', error);
        return { success: false, error: error.message || 'Restoration failed' };
    }
}

// 5. Upload Backup File
export async function uploadBackup(formData: FormData) {
    try {
        const file = formData.get('file') as File;
        if (!file || !file.name.endsWith('.zip')) {
            return { success: false, error: 'Please upload a valid ZIP backup file' };
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(process.cwd(), file.name);

        await fs.promises.writeFile(filePath, buffer);
        revalidatePath('/super-admin/backup');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'Upload failed' };
    }
}

// 6. Cron Secret Key Config Management
export async function getCronSecretKey(): Promise<string> {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = await fs.promises.readFile(CONFIG_PATH, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.cronSecretKey || '';
        }
        
        // Generate a new one if not exists
        const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await fs.promises.writeFile(CONFIG_PATH, JSON.stringify({ cronSecretKey: newKey }, null, 2));
        return newKey;
    } catch (error) {
        return '';
    }
}

export async function generateCronSecretKey(): Promise<string> {
    try {
        const newKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await fs.promises.writeFile(CONFIG_PATH, JSON.stringify({ cronSecretKey: newKey }, null, 2));
        return newKey;
    } catch (error) {
        return '';
    }
}
