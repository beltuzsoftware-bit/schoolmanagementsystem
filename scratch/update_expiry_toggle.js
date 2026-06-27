const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/app/school-admin/transport/page.tsx');

let content = fs.readFileSync(file, 'utf8');

// 1. Grid span replace
const targetGrid = `className={cn("text-[11px] font-bold text-slate-800", getExpiryColorClass(drv.licenseExpiry))}`;
const replacementGrid = `className={cn("text-[11px] font-bold text-slate-800", showExpiryHighlight && getExpiryColorClass(drv.licenseExpiry))}`;

if (content.includes(targetGrid)) {
  content = content.replace(targetGrid, replacementGrid);
  console.log("Updated Grid View highlight toggling successfully!");
} else {
  console.log("Grid target not found!");
}

// 2. Table view cell replace
const targetTable = `className={cn("text-[10px] font-black uppercase tracking-tight", getExpiryColorClass(drv.licenseExpiry))}`;
const replacementTable = `className={cn("text-[10px] font-black uppercase tracking-tight", showExpiryHighlight && getExpiryColorClass(drv.licenseExpiry))}`;

if (content.includes(targetTable)) {
  content = content.replace(targetTable, replacementTable);
  console.log("Updated Table View highlight toggling successfully!");
} else {
  console.log("Table target not found!");
}

fs.writeFileSync(file, content, 'utf8');
console.log("File saved!");
