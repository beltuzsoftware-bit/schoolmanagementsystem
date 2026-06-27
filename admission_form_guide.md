# Admission Form Template Guide

This guide explains how to manage student admission form templates, from creation in the Super Admin dashboard to assignment for individual schools.

---

## 🏗️ 1. Creating an Admission Form Template
*Role: Super Admin*

Templates define which fields are visible, which are mandatory, and how the form is laid out.

1.  **Navigate to Admissions CRM**: Go to the **Admissions Module** in the Super Admin dashboard (`/super-admin/modules/admissions`).
2.  **Create New Template**: Click the **"Create Admission Template"** button.
3.  **Configure Fields**:
    *   Use the **Rules Editor** on the left to toggle field visibility.
    *   Mark fields as **Required** as needed.
    *   Set **Conditional Logic** (e.g., only show "RTE Details" if "Is RTE?" is set to "Yes").
4.  **Layout Settings**: Configure grid columns for each section (e.g., 2-column or 3-column layouts).
5.  **Preview & Save**: Verify the design using the **Live WYSIWYG Preview** and click **"Save Template"**.

---

## 🔗 2. Assigning Templates to Schools
*Role: Super Admin or School Admin*

There are two ways to assign a template to a school.

### Method A: Via SaaS Packages (Bulk Assignment)
Recommended for managing standardized tiers (e.g., Basic, Pro, Enterprise).

1.  Go to **SaaS Packages** (`/super-admin/packages`).
2.  **Edit** a package.
3.  In the **"Admission Form Template"** dropdown, select your newly created template.
4.  **Save Package**: All schools currently linked to this package will instantly receive the new form configuration.

### Method B: School-Specific Override (Individual Assignment)
Used when a specific school requires a unique form design different from their package default.

1.  Logged in as a School Admin, go to **Student Settings** (`/school-admin/students/settings`).
2.  Open the **"Admission Form"** tab.
3.  Select the desired design from the available templates.
4.  Click **"Save Changes"**.

---

> [!TIP]
> **Real-time Updates**: Changes to templates are propagated instantly. If you modify a template's fields, any school using that template will see the changes the next time they open the registration form.

> [!IMPORTANT]
> **Default Template**: If a school is not assigned a template via its package or a direct override, the system will fall back to the "Standard Default" template.
