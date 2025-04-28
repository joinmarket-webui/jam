const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/MainWalletView.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find the line with the rescan progress text
const regex = /\{serviceInfo\?\.rescanProgress !== undefined \? t\('current_wallet\.text_rescan_in_progress_with_progress', \{ progress: Math\.round\(serviceInfo\.rescanProgress \* 100\) \}\) : t\('current_wallet\.text_rescan_in_progress'\)\}/g;

// Replace Math.round with Math.floor
const updatedContent = content.replace(regex, '{serviceInfo?.rescanProgress !== undefined ? t(\'current_wallet.text_rescan_in_progress_with_progress\', { progress: Math.floor(serviceInfo.rescanProgress * 100) }) : t(\'current_wallet.text_rescan_in_progress\')}');

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('MainWalletView.tsx updated successfully');
