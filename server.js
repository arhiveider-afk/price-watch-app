/* Local development server. LAN use only: add authentication before exposing it to the Internet. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const port = Number(process.env.PORT || 8787);
const deliveryLocation = 'Ростов-на-Дону';
const root = __dirname;
const dataDir = path.join(root, 'data');
const storeFile = path.join(dataDir, 'watchlist.json');
const mime = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8' };

fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(storeFile)) fs.writeFileSync(storeFile, JSON.stringify({ items: [], lastCheck: null }, null, 2));
const readStore = () => JSON.parse(fs.readFileSync(storeFile, 'utf8'));
const writeStore = data => fs.writeFileSync(storeFile, JSON.stringify(data, null, 2));
const json = (res, status, payload) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*' }); res.end(JSON.stringify(payload)); };
const readBody = req => new Promise((resolve, reject) => { let body=''; req.on('data', c => body += c); req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Некорректный JSON')); } }); });

// Replace this with an approved Ozon adapter. It must return a region-specific public price,
// availability and a canonical URL, never rely on a user browser session or account cookies.
async function checkItem(item) {
  return { ...item, checkedAt: new Date().toISOString(), status: 'waiting_for_ozon_adapter' };
}
async function runChecks() {
  const store = readStore();
  store.items = await Promise.all(store.items.filter(x => !x.paused).map(checkItem).concat(store.items.filter(x => x.paused)));
  store.lastCheck = new Date().toISOString();
  writeStore(store);
  console.log(`[check] ${store.lastCheck}; ${store.items.length} subscriptions`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' }); return res.end(); }
  try {
    if (url.pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok:true, lastCheck:readStore().lastCheck });
    if (url.pathname === '/api/profile' && req.method === 'GET') return json(res, 200, { deliveryLocation });
    if (url.pathname === '/api/items' && req.method === 'GET') return json(res, 200, readStore());
    if (url.pathname === '/api/items' && req.method === 'POST') { const item = await readBody(req); if (!item.name || !Number(item.limit)) return json(res, 400, { error:'Нужны name и limit' }); const store=readStore(); const record={ id:Date.now(), name:item.name, region:deliveryLocation, limit:Number(item.limit), inStock:false, price:null, paused:false, notifyStock:true, notifyPrice:true, notifyDrops:false, createdAt:new Date().toISOString() }; store.items.unshift(record); writeStore(store); return json(res, 201, record); }
    if (url.pathname === '/api/check' && req.method === 'POST') { await runChecks(); return json(res, 200, readStore()); }
    const filePath = path.normalize(path.join(root, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return json(res, 404, { error:'Не найдено' });
    res.writeHead(200, { 'Content-Type':mime[path.extname(filePath)] || 'application/octet-stream' }); fs.createReadStream(filePath).pipe(res);
  } catch (error) { json(res, 500, { error:error.message }); }
});

server.listen(port, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(x => x && x.family === 'IPv4' && !x.internal).map(x => x.address);
  console.log(`Price Watch server started: http://localhost:${port}`);
  ips.forEach(ip => console.log(`LAN address: http://${ip}:${port}`));
  runChecks();
});
setInterval(runChecks, 10 * 60 * 1000);
