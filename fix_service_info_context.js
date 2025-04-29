const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/context/ServiceInfoContext.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const searchText = `          // If we get a 404 error, mark the API as not supported
          if (err instanceof Api.JmApiError && err.status === 404) {`;

const replaceText = `          // If we get a 404 error, mark the API as not supported
          if (err instanceof Api.JmApiError && err.response.status === 404) {`;

const updatedContent = content.replace(searchText, replaceText);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('ServiceInfoContext.tsx fixed successfully');
