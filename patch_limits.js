const fs = require('fs');

// Patch mock-data.ts
let mockContent = fs.readFileSync('src/lib/mock-data.ts', 'utf8');
mockContent = mockContent.replace(
    /admissionFormTemplateId:\s*'tmpl_adm_standard'\s*}/,
    "admissionFormTemplateId: 'tmpl_adm_standard',\n        qrTransactionLimit: 100,\n        transactionRate: 5\n    }"
);
mockContent = mockContent.replace(
    /admissionFormTemplateId:\s*'tmpl_adm_standard'\s*}/,
    "admissionFormTemplateId: 'tmpl_adm_standard',\n        qrTransactionLimit: 500,\n        transactionRate: 0\n    }"
);
mockContent = mockContent.replace(
    /admissionFormTemplateId:\s*'tmpl_adm_standard'\s*}/,
    "admissionFormTemplateId: 'tmpl_adm_standard',\n        qrTransactionLimit: -1,\n        transactionRate: 0\n    }"
);
fs.writeFileSync('src/lib/mock-data.ts', mockContent);
console.log('mock-data.ts patched!');

// Patch data.json
if (fs.existsSync('data.json')) {
    const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    
    // Default patching for active db
    data.packages.forEach(p => {
        if (p.id === 'p1') { p.qrTransactionLimit = 100; p.transactionRate = 5; }
        else if (p.id === 'p2') { p.qrTransactionLimit = 500; p.transactionRate = 0; }
        else if (p.id === 'p3') { p.qrTransactionLimit = -1; p.transactionRate = 0; }
        else {
            if (p.qrTransactionLimit === undefined) p.qrTransactionLimit = 100;
            if (p.transactionRate === undefined) p.transactionRate = 5;
        }
    });

    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log('data.json patched!');
}
