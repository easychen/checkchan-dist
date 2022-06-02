const puppeteer = require("puppeteer-core");
const fs = require("fs");
const width = process.env.WIN_WIDTH || 1200;
const height = process.env.WIN_HEIGHT || 1000;
const user_data_dir = '/checkchan/data/user_data';
if( !fs.existsSync( user_data_dir ) ) fs.mkdirSync( user_data_dir );

(async () => {
  let extensionPath = "/checkchan/extension/chrome_extension";
  const browser = await puppeteer.launch({
    executablePath:process.env.CHROME_BIN||"/usr/bin/chromium-browser",
    bindAddress: "0.0.0.0",
    headless: false,
    timeout:0,
    defaultViewport: null,
    ignoreDefaultArgs: ["--disable-extensions"],
    dumpio: true, 
    userDataDir: user_data_dir,
    args: [
      `--load-extension=${extensionPath}`,
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=9222",
      "--remote-debugging-address=0.0.0.0",
      "--start-maximized",
      `--window-size=${width},${height}`,
    ]
  });
})();
