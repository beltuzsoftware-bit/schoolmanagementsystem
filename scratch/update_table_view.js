const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/app/school-admin/transport/page.tsx');

let content = fs.readFileSync(file, 'utf8');

// 1. Update TableHeader
const targetHeader = `<TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License No.</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Experience</TableHead>`;

const replacementHeader = `<TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License No.</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License Expiry</TableHead>
                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Experience</TableHead>`;

if (content.includes(targetHeader)) {
  content = content.replace(targetHeader, replacementHeader);
  console.log("Updated TableHeader successfully!");
} else {
  // Let's try direct search
  const regex = /<TableHead className="py-6 text-\[10px\] font-black uppercase text-slate-400 tracking-widest">License No\.\<\/TableHead\>\s*<TableHead className="py-6 text-\[10px\] font-black uppercase text-slate-400 tracking-widest">Experience\<\/TableHead\>/;
  if (regex.test(content)) {
    content = content.replace(regex, `<TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License No.</TableHead>\n                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">License Expiry</TableHead>\n                                                <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Experience</TableHead>`);
    console.log("Updated TableHeader via regex successfully!");
  } else {
    console.log("TableHeader target not found!");
  }
}

// 2. Update TableBody
const targetBody = `<TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{drv.licenseNumber || '—'}</TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{drv.experience || '—'}</TableCell>`;

const replacementBody = `<TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{drv.licenseNumber || '—'}</TableCell>
                                                        <TableCell className={cn("text-[10px] font-black uppercase tracking-tight", getExpiryColorClass(drv.licenseExpiry))}>{drv.licenseExpiry || '—'}</TableCell>
                                                        <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{drv.experience || '—'}</TableCell>`;

if (content.includes(targetBody)) {
  content = content.replace(targetBody, replacementBody);
  console.log("Updated TableBody successfully!");
} else {
  const regexBody = /<TableCell className="text-\[10px\] font-black text-indigo-600 uppercase tracking-tight">\{drv\.licenseNumber \|\| '—'\}\<\/TableCell\>\s*<TableCell className="text-\[10px\] font-black text-slate-400 uppercase tracking-tight">\{drv\.experience \|\| '—'\}\<\/TableCell\>/;
  if (regexBody.test(content)) {
    content = content.replace(regexBody, `<TableCell className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{drv.licenseNumber || '—'}</TableCell>\n                                                        <TableCell className={cn("text-[10px] font-black uppercase tracking-tight", getExpiryColorClass(drv.licenseExpiry))}>{drv.licenseExpiry || '—'}</TableCell>\n                                                        <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{drv.experience || '—'}</TableCell>`);
    console.log("Updated TableBody via regex successfully!");
  } else {
    console.log("TableBody target not found!");
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log("File saved!");
