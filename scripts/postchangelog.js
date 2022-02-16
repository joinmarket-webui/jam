const replace = require('replace')

replace({ regex: /###\s(\w+)/, replacement: '#### $1', paths: ['./CHANGELOG.md'] })
replace({ regex: /\n\n\n/, replacement: '\n\n', paths: ['./CHANGELOG.md'] })
