const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  
  let executablePath = null;
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }
  
  if (!executablePath) {
    console.error('Chrome not found locally.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ executablePath, headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const layout = await page.evaluate(() => {
    const getRect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return { 
        top: r.top, 
        left: r.left, 
        width: r.width, 
        height: r.height, 
        display: style.display, 
        visibility: style.visibility,
        zIndex: style.zIndex,
        position: style.position
      };
    };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      appContainer: getRect('.app-container'),
      chatPage: getRect('.chat-page'),
      chatWindow: getRect('.chat-window'),
      chatHeader: getRect('.chat-header'),
      messagesArea: getRect('.messages-area')
    };
  });
  
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
