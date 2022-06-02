const puppeteer = require("puppeteer");
const width = process.env.WIN_WIDTH || 1200;
const height = process.env.WIN_HEIGHT || 1000;

(async () => {
  let extensionPath = "/home/chrome/checkchan";
  
  const browser = await puppeteer.launch({
    executablePath:"/usr/bin/chromium-browser",
    bindAddress: "0.0.0.0",
    headless: false,
    timeout:0,
    defaultViewport: null,
    ignoreDefaultArgs: ["--disable-extensions"],
    dumpio: true, 
    userDataDir: '/home/chrome/user_data',
    args: [
      `--load-extension=${extensionPath}`,
      "--disable-gpu",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=9222",
      "--remote-debugging-address=0.0.0.0",
      "--start-maximized",
      `--window-size=${width},${height}`,
    ]
  });
})();
