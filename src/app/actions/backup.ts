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

// 2. Create Portable Backup (Pure Node.js + JSZip, 100% cross-platform)
export async function createBackup() {
    try {
        const rootDir = process.cwd();
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // 1. If scripts/export-db.cjs exists and DATABASE_URL is set, run it using node
        if (fs.existsSync(path.join(rootDir, 'scripts', 'export-db.cjs')) && process.env.DATABASE_URL) {
            try {
                const { exec } = await import('child_process');
                const util = await import('util');
                const execPromise = util.promisify(exec);
                await execPromise('node scripts/export-db.cjs', { cwd: rootDir });
            } catch (err) {
                console.warn('[Backup] Database export script skipped or returned error:', err);
            }
        }

        // 2. Include data.json
        const dataJsonPath = path.join(rootDir, 'data.json');
        if (fs.existsSync(dataJsonPath)) {
            const dataBuffer = await fs.promises.readFile(dataJsonPath);
            zip.file('data.json', dataBuffer);
        } else {
            return { success: false, error: 'data.json not found to backup' };
        }

        // 3. Include data-images directory recursively if present
        const dataImagesPath = path.join(rootDir, 'data-images');
        if (fs.existsSync(dataImagesPath)) {
            const addFolderRecursively = async (currentPath: string, zipFolder: any) => {
                const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    if (entry.isDirectory()) {
                        await addFolderRecursively(fullPath, zipFolder.folder(entry.name));
                    } else {
                        const fileBuffer = await fs.promises.readFile(fullPath);
                        zipFolder.file(entry.name, fileBuffer);
                    }
                }
            };
            await addFolderRecursively(dataImagesPath, zip.folder('data-images'));
        }

        // 4. Include backup config
        if (fs.existsSync(CONFIG_PATH)) {
            zip.file('backup-config.json', await fs.promises.readFile(CONFIG_PATH));
        }

        // 5. Generate ZIP
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        const zipFilename = `KuMMi_Portable_Backup_${dateStr}.zip`;
        const zipFilePath = path.join(rootDir, zipFilename);

        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        await fs.promises.writeFile(zipFilePath, zipBuffer);

        revalidatePath('/super-admin/backup');
        return { success: true, message: `Backup archive created: ${zipFilename}` };
    } catch (error: any) {
        console.error('[Backup] Failed to create backup:', error);
        return { success: false, error: error.message || 'Backup creation failed' };
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

// 4. Restore Backup (Pure Node.js + JSZip)
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

        const JSZip = (await import('jszip')).default;
        const zipData = await fs.promises.readFile(zipPath);
        const zip = await JSZip.loadAsync(zipData);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        // 1. Safety backup of data.json before restore
        const currentDataPath = path.join(rootDir, 'data.json');
        if (fs.existsSync(currentDataPath)) {
            await fs.promises.copyFile(
                currentDataPath,
                path.join(rootDir, `data.json.before_restore_${timestamp}.json`)
            );
        }

        // 2. Extract entries from zip
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            const destPath = path.join(rootDir, relativePath);
            if (zipEntry.dir) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
            } else {
                const parentDir = path.dirname(destPath);
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                const content = await zipEntry.async('nodebuffer');
                await fs.promises.writeFile(destPath, content);
            }
        }

        // 3. Sync database tables if migrate-data.cjs exists
        if (fs.existsSync(path.join(rootDir, 'scripts', 'migrate-data.cjs')) && process.env.DATABASE_URL) {
            try {
                const { exec } = await import('child_process');
                const util = await import('util');
                const execPromise = util.promisify(exec);
                await execPromise('node scripts/migrate-data.cjs', { cwd: rootDir });
            } catch (err) {
                console.warn('[Backup Restore] migrate-data.cjs output:', err);
            }
        }

        revalidatePath('/super-admin/backup');
        return { success: true, message: 'Restore completed successfully.' };
    } catch (error: any) {
        console.error('[Backup] Restore failed:', error);
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
