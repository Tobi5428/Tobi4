const fs = require('fs');
const lines = fs.readFileSync('node_modules/react-router-dom/dist/react-router-dom.development.js', 'utf8').split('\n').slice(400, 440);
lines.forEach((line, idx) => console.log(`${401 + idx}: ${line}`));
