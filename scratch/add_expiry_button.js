const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../src/app/school-admin/transport/page.tsx');

let content = fs.readFileSync(file, 'utf8');

const target = `<div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('grid')} className={\`h-8 w-8 p-0 rounded-lg \${driverViewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}\`}><LayoutGrid className=\"h-4 w-4\" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('list')} className={\`h-8 w-8 p-0 rounded-lg \${driverViewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}\`}><List className=\"h-4 w-4\" /></Button>
                                    </div>`;

const replacement = `<div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('grid')} className={\`h-8 w-8 p-0 rounded-lg \${driverViewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}\`}><LayoutGrid className=\"h-4 w-4\" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDriverViewMode('list')} className={\`h-8 w-8 p-0 rounded-lg \${driverViewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}\`}><List className=\"h-4 w-4\" /></Button>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowExpiryHighlight(!showExpiryHighlight)}
                                        className={cn(
                                            "h-10 rounded-xl font-bold gap-2 transition-all border shadow-sm",
                                            showExpiryHighlight 
                                                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700" 
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        Highlight Expiry
                                    </Button>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("Added Highlight Expiry button successfully!");
} else {
  console.log("Target view toggles block not found!");
}

fs.writeFileSync(file, content, 'utf8');
console.log("File saved!");
