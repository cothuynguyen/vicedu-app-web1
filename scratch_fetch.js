const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/PADLET_API_KEY=(.*)/);
const apiKey = match[1].replace(/['"]/g, '').trim();

fetch('https://api.padlet.dev/v1/boards/xfwg8s60i54dy566?include=posts,sections', {
  headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }
})
.then(res => res.json())
.then(data => {
  fs.writeFileSync('padlet_debug.json', JSON.stringify(data, null, 2));
  console.log('Saved to padlet_debug.json');
})
.catch(err => console.error(err));
