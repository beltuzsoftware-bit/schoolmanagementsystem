const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/app/school-admin/transport/page.tsx');

let content = fs.readFileSync(file, 'utf8');

const target = `<span className="text-[11px] font-bold text-slate-800">{drv.licenseExpiry || '—'}</span>`;
const replacement = `<span className={cn("text-[11px] font-bold text-slate-800", getExpiryColorClass(drv.licenseExpiry))}>\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t{drv.licenseExpiry || '—'}\n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</span>`;

if (content.includes(target)) {
  console.log("Found target!");
  const occurrences = content.split(target).length - 1;
  console.log("Occurrences:", occurrences);
} else {
  console.log("Target NOT found! Printing close matches:");
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('licenseExpiry') || l.includes('Expiry')) {
      console.log(`${idx + 1}: ${JSON.stringify(l)}`);
    }
  });
}
