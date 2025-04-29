const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/Navbar.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchText = `                      <WalletPreview
                        wallet={currentWallet}
                        rescanInProgress={rescanInProgress}
                        totalBalance={currentWalletInfo?.balanceSummary.calculatedTotalBalanceInSats}
                        showBalance={settings.showBalance}
                        unit={settings.unit}
                      />`;

const replaceText = `                      <WalletPreview
                        wallet={currentWallet}
                        rescanInProgress={rescanInProgress}
                        rescanProgress={serviceInfo?.rescanProgress}
                        totalBalance={currentWalletInfo?.balanceSummary.calculatedTotalBalanceInSats}
                        showBalance={settings.showBalance}
                        unit={settings.unit}
                      />`;

const updatedContent = content.replace(searchText, replaceText);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Navbar.tsx usage fixed successfully');
