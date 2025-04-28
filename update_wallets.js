const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/Wallets.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchText = `        {serviceInfo?.rescanning === true && (
          <rb.Alert variant="info" data-testid="alert-rescanning">
            {t('app.alert_rescan_in_progress')}
          </rb.Alert>
        )}`;

const replaceText = `        {serviceInfo?.rescanning === true && (
          <rb.Alert variant="info" data-testid="alert-rescanning">
            {serviceInfo.rescanProgress !== undefined
              ? t('app.alert_rescan_in_progress_with_progress', { progress: Math.floor(serviceInfo.rescanProgress * 100) })
              : t('app.alert_rescan_in_progress')}
          </rb.Alert>
        )}`;

const updatedContent = content.replace(searchText, replaceText);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Wallets.tsx updated successfully');
