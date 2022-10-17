const puppeteer = require("puppeteer");

async function generateSchedule(group) {
  const browser = await puppeteer.launch({
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 700,
  });
  await page.goto("https://dekanat.kubg.edu.ua/cgi-bin/timetable.cgi?n=700");
  await page.$eval("#group", (el, g) => (el.value = g), group);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".hidden-xs");

  let filename = Date.now().toString() + ".png";
  await page.screenshot({ path: filename, fullPage: true });
  browser.close();
  return filename;
}

async function parseNearestDay(group) {}

module.exports = { generateSchedule };
