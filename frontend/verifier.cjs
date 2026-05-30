const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/report') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      console.log('\n================ LAYOUT REPORT ================');
      try {
        const data = JSON.parse(body);
        fs.writeFileSync('layout.json', JSON.stringify(data, null, 2));
        console.log('Saved to layout.json');
      } catch(e) {
        console.log('Failed to parse body');
      }
      console.log('===============================================\n');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.writeHead(200);
      res.end('OK');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(9999, () => {
  console.log('Verifier server running at http://localhost:9999/');
});
