import zipfile
import json
import shutil
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

zip_path = r"d:\kummi-school-system\KuMMi_Portable_Backup_2026-05-29_0052.zip"
target_snapshot = "data.json.before_restore_2026-05-20.json"
active_db_path = r"d:\kummi-school-system\data.json"
safety_backup_path = r"d:\kummi-school-system\data.json.before_recovery.json"

print("Step 1: Creating safety backup of active data.json...")
if os.path.exists(active_db_path):
    shutil.copyfile(active_db_path, safety_backup_path)
    print(f" -> Active data.json backed up to {safety_backup_path}")
else:
    print(" -> No active data.json found; skipping backup.")

print(f"\nStep 2: Extracting historical snapshot '{target_snapshot}' from backup ZIP...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    with zip_ref.open(target_snapshot) as f:
        db = json.load(f)

print(f" -> Loaded snapshot. Schools defined: {len(db.get('schools', []))}, Students: {len(db.get('students', []))}")

print("\nStep 3: Patching missing 4th School definition (s_1778721678173)...")
schools = db.get("schools", [])

# Construct school object for s_1778721678173
sample_school = schools[0] # Use JSI as base template for configurations
tuscany_school = {
    "id": "s_1778721678173",
    "name": "Perched on a tufa ridge in southern Tuscany",
    "schoolId": "Ban1-1002",
    "code": "Ban1-1002",
    "address": "MANIKKOL, BONGAON, SHIMULIA, GOPALNAGAR, NORTH 24 PARGANAS, 743262",
    "contactNumber": "9622632518",
    "email": "bani@gmail.com",
    "logo": "/logo_placeholder.png",
    "packageId": "p_1776494538371",
    "studentCount": 37,
    "isActive": True,
    "admins": ["bani@gmail.com"],
    "tagline": "Its ME!",
    "contactPerson": "Perched on a tufa ridge in southern Tuscany Admin",
    "whatsapp": "9622632518",
    "city": "gopalnagar",
    "state": "west bengal",
    "pincode": "743262",
    "currentSession": "2026-2027",
    "defaultPaymentMode": "Cash",
    "weekOff": "Sunday",
    "upiId": "9883077898@ybl.com",
    "useCustomClasses": True,
    "useCustomSections": False,
    "useCustomHouses": False,
    "useCustomIdSettings": False,
    "useCustomDisableReasons": True,
    "useCustomReligions": False,
    "useCustomCategories": False,
    "useCustomStreams": False,
    "classes": sample_school.get("classes"),
    "sections": ["A", "B", "C", "D"],
    "houses": [],
    "disableReasons": ["Parent Request", "Transfer", "Fees Pending", "Other"],
    "religions": ["Hinduism", "Islam", "Christianity", "Sikhism", "Buddhism", "Jainism", "Other"],
    "categories": ["General", "OBC", "SC", "ST", "EWS"],
    "streams": ["N/A", "Science", "Commerce", "Arts"],
    "regNoSettings": sample_school.get("regNoSettings"),
    "enrollNoSettings": sample_school.get("enrollNoSettings"),
    "apaarIdSettings": sample_school.get("apaarIdSettings"),
    "penNoSettings": sample_school.get("penNoSettings"),
    "srNoSettings": sample_school.get("srNoSettings"),
    "genRegNoSettings": sample_school.get("genRegNoSettings"),
    "rollNoSettings": sample_school.get("rollNoSettings"),
    "admissionPaymentEnabled": False,
    "admissionFeeAmount": 0,
    "requireAdmissionDocs": False,
    "admissionFieldOverrides": sample_school.get("admissionFieldOverrides"),
    "sessions": [
        {
            "id": "sess_1778721678174",
            "name": "2026-2027",
            "startDate": "2026-04-01",
            "endDate": "2027-03-31",
            "isCurrent": True,
            "isActive": True,
            "status": "Active"
        }
    ]
}

# Append if not exists
if not any(s.get("id") == tuscany_school["id"] for s in schools):
    schools.append(tuscany_school)
    db["schools"] = schools
    print(" -> Formally added 'Perched on a tufa ridge in southern Tuscany' (ID: s_1778721678173) to schools list!")
else:
    print(" -> School already defined in schools list; skipping addition.")

print("\nStep 4: Merging complete user list from latest backups...")
users = db.get("users", [])

# Let's define the complete set of 10 users to import
target_users = [
    {"id": "usr_sa_001", "name": "Super Admin", "email": "superadmin", "password": "admin", "role": "SUPER_ADMIN", "schoolId": None},
    {"id": "usr_rt_002", "name": "Saraswati", "email": "Saraswati", "password": "root", "role": "ROOT", "schoolId": None},
    {"id": "usr_jsi_admin", "name": "JSI Admin", "email": "admin@jsi.com", "password": "password123", "role": "SCHOOL_ADMIN", "schoolId": "s_1776494594378"},
    {"id": "usr_jsi_sec", "name": "JSI Admin 2", "email": "jsi@jsi.com", "password": "password123", "role": "SCHOOL_ADMIN", "schoolId": "s_1776494594378"},
    {"id": "usr_krits_admin", "name": "Krits Admin", "email": "admin@krits.com", "password": "password123", "role": "SCHOOL_ADMIN", "schoolId": "s_1778731188434"},
    {"id": "usr_hms_admin", "name": "Heritage Admin", "email": "admin@hms.com", "password": "password123", "role": "SCHOOL_ADMIN", "schoolId": "s_1779079515458"},
    {"id": "usr_hms_co", "name": "Heritage Staff", "email": "admin@hms.co", "password": "password123", "role": "SCHOOL_ADMIN", "schoolId": "s_1779079515458"},
    {"id": "ca1155a0-89b7-450b-9508-be77e69779c9", "name": "Perched on a tufa ridge in southern Tuscany Admin", "email": "bani@gmail.com", "password": "123456", "role": "SCHOOL_ADMIN", "schoolId": "s_1778721678173"},
    {"id": "a07ea21a-eb68-47e1-9326-2c8abb29fc1f", "name": "NAUSAD HUSSAIN", "email": "nausad.kol@gmail.com", "password": "6543210", "role": "STAFF", "schoolId": "s_1778721678173"},
    {"id": "0d712b85-aa0e-4a85-98f9-7c357e5f3980", "name": "NAUSAD HUSSAIN", "email": "admin@admin.com", "password": "6543210", "role": "STAFF", "schoolId": "s_1778721678173"}
]

# Re-initialize users list to contain the complete, correct set of users
db["users"] = target_users
print(f" -> Formatted users table. Total logins defined: {len(db['users'])}")

print("\nStep 5: Writing patched database back to data.json...")
with open(active_db_path, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)
print(" -> Successfully wrote patched data.json!")

print("\nStep 6: Executing Prisma migration (migrate-data.cjs)...")
try:
    result = subprocess.run(["node", "scripts/migrate-data.cjs"], capture_output=True, text=True, check=True)
    print(" -> Migration output:\n", result.stdout)
    print("🎉 SUCCESS! Database migration completed successfully.")
except subprocess.CalledProcessError as e:
    print("❌ ERROR: Database migration failed!")
    print("Error output:\n", e.stderr)
    print("Standard output:\n", e.stdout)
    sys.exit(1)
