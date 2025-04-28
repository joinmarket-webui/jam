const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/Navbar.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchText = `            <div className="cursor-wait">{t('navbar.text_rescan_in_progress')}</div>`;

const replaceText = `            <div className="cursor-wait">
              {rescanProgress !== undefined
                ? t('navbar.text_rescan_in_progress_with_progress', { progress: Math.floor(rescanProgress * 100) })
                : t('navbar.text_rescan_in_progress')}
            </div>`;

const updatedContent = content.replace(searchText, replaceText);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Navbar.tsx updated successfully');
