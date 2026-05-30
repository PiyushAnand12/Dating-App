const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173/chat');
  await page.waitForTimeout(2000); // Wait for React
  
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
        position: style.position,
        html: el.outerHTML.slice(0, 150) + '...'
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
