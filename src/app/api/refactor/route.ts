import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const filesToUpdate = [
        'src/app/school-admin/academics/subjects/page.tsx',
        'src/app/school-admin/academics/subjects/settings/page.tsx',
        'src/app/school-admin/academics/curriculum/page.tsx'
    ];

    try {
        filesToUpdate.forEach(file => {
            const filePath = path.join(process.cwd(), file);
            if (!fs.existsSync(filePath)) return;
            
            let content = fs.readFileSync(filePath, 'utf8');

            // 1. Rename types and actions
            content = content.replace(/SubjectCategory/g, 'SubjectGroupType');
            content = content.replace(/subjectCategories/g, 'subjectGroupTypes');
            content = content.replace(/setSubjectCategories/g, 'setSubjectGroupTypes');
            content = content.replace(/getSubjectCategories/g, 'getSubjectGroupTypes');
            content = content.replace(/saveSubjectCategory/g, 'saveSubjectGroupType');
            content = content.replace(/deleteSubjectCategory/g, 'deleteSubjectGroupType');

            // 2. Rename object property
            content = content.replace(/\.category/g, '.groupType');
            content = content.replace(/name="category"/g, 'name="groupType"');
            content = content.replace(/category ===/g, 'groupType ===');
            content = content.replace(/category:/g, 'groupType:');
            
            // 3. Any stragglers in destructuring or state
            content = content.replace(/const category =/g, 'const groupType =');

            fs.writeFileSync(filePath, content);
        });
        
        return NextResponse.json({ success: true, message: 'Files refactored successfully' });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) });
    }
}
