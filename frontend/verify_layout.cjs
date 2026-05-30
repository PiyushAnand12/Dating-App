const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate to chat
  await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle2' });
  
  // Wait a bit for React to render
  await new Promise(r => setTimeout(r, 1000));
  
  // Evaluate the layout
  const layout = await page.evaluate(() => {
    const getRect = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, width: r.width, height: r.height, display: window.getComputedStyle(el).display, vis: window.getComputedStyle(el).visibility };
    };
    
    return {
      appContainer: getRect('.app-container'),
      chatPage: getRect('.chat-page'),
      chatWindow: getRect('.chat-window'),
      chatHeader: getRect('.chat-header'),
      messagesArea: getRect('.messages-area'),
      inputContainer: getRect('.input-container')
    };
  });
  
  console.log(JSON.stringify(layout, null, 2));
  await browser.close();
})();
