const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/Navbar.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Update the component parameters to include rescanProgress
const searchText = `const WalletPreview = ({ wallet, rescanInProgress, totalBalance, unit, showBalance = false }: WalletPreviewProps) => {`;
const replaceText = `const WalletPreview = ({ wallet, rescanInProgress, rescanProgress, totalBalance, unit, showBalance = false }: WalletPreviewProps) => {`;

// Update the component to use rescanProgress instead of serviceInfo
const searchText2 = `            <div className="cursor-wait">
              {serviceInfo?.rescanProgress !== undefined
                ? t('navbar.text_rescan_in_progress_with_progress', { progress: Math.floor(serviceInfo.rescanProgress * 100) })
                : t('navbar.text_rescan_in_progress')}
            </div>`;
const replaceText2 = `            <div className="cursor-wait">
              {rescanProgress !== undefined
                ? t('navbar.text_rescan_in_progress_with_progress', { progress: Math.floor(rescanProgress * 100) })
                : t('navbar.text_rescan_in_progress')}
            </div>`;

let updatedContent = content.replace(searchText, replaceText);
updatedContent = updatedContent.replace(searchText2, replaceText2);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Navbar.tsx component fixed successfully');
