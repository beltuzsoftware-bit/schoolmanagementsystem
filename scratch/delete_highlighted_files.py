import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

workspace_dir = r"d:\kummi-school-system"
files_to_delete = [
    "backup_db_2026-04-26T05-24-55-291Z.json",
    "backup_db_2026-04-26T05-29-15-662Z.json",
    "backup_db_2026-04-26T05-53-43-954Z.json",
    "backup_db_2026-06-02T18-21-54-205Z.json"
]

print("Deleting the 4 highlighted database export files...")

for file in files_to_delete:
    filepath = os.path.join(workspace_dir, file)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
            print(f" -> Successfully deleted: {file}")
        except Exception as e:
            print(f" ❌ Error deleting {file}: {e}")
    else:
        print(f" -> File {file} not found; skipping.")

print("\n🏁 Deletion completed successfully!")
