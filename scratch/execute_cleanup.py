import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

workspace_dir = r"d:\kummi-school-system"

folders_to_delete = [
    "temp_backup_inspect"
]

files_to_delete = [
    "build_output.txt",
    "build_output_2.txt",
    "build_output_utf8.txt",
    "build_output_utf8_2.txt",
    "error.txt",
    "eslint-errors.txt",
    "typescript-errors.txt",
    "compare_keys.py",
    "extract_keys.py",
    "data.json.before_recovery.json",
    "data.json.before_june2_restore.json",
]

# Find data.json.before_restore_*.json files
for f in os.listdir(workspace_dir):
    if f.startswith("data.json.before_restore_") and f.endswith(".json"):
        if "2026-05-20" not in f:
            files_to_delete.append(f)

print("Starting cleanup of redundant files and folders...")

# 1. Delete Folders
for folder in folders_to_delete:
    folder_path = os.path.join(workspace_dir, folder)
    if os.path.exists(folder_path):
        try:
            shutil.rmtree(folder_path)
            print(f" -> Successfully deleted folder: {folder}")
        except Exception as e:
            print(f" ❌ Error deleting folder {folder}: {e}")
    else:
        print(f" -> Folder {folder} not found; skipping.")

# 2. Delete Files
for file in files_to_delete:
    file_path = os.path.join(workspace_dir, file)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f" -> Successfully deleted file: {file}")
        except Exception as e:
            print(f" ❌ Error deleting file {file}: {e}")
    else:
        print(f" -> File {file} not found; skipping.")

print("\n🏁 Cleanup completed successfully!")
