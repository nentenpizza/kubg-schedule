const puppeteer = require("puppeteer");

const browserConfig = {
  defaultViewport: null,
};

async function runBrowser() {
  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 700,
  });
    return { page, browser };
}

async function generateSchedule(group) {
  let {page, browser} = await runBrowser();
  await page.goto("https://dekanat.kubg.edu.ua/cgi-bin/timetable.cgi?n=700");
  await page.$eval("#group", (el, g) => (el.value = g), group);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".hidden-xs");

  let filename = Date.now().toString() + ".png";
  await page.screenshot({ path: filename, fullPage: true });
  browser.close();
  return filename;
}

async function parseNearestDay(group, current) {
    let { page, browser } = await runBrowser();
  await page.goto("https://dekanat.kubg.edu.ua/cgi-bin/timetable.cgi?n=700");
  await page.$eval("#group", (el, g) => (el.value = g), group);
  await page.click('button[type="submit"]');
  await page.waitForSelector(".hidden-xs");
  let finalText = "";
  let element = await page.$("div.jumbotron");
  const container = await element.$("div.container");
  element = await container.$$("div.col-md-6");
  if (current) {
    element = element[0];
  } else {
    element = element[1];
  }
  const h4 = await element.$("h4");
  const title = await h4.evaluate((el) => el.textContent, h4);
  finalText += title;

  const tbody = await element.$$("tbody > tr");
  for (let i = 0; i < tbody.length - 1; i++) {
    const textContent = await tbody[i].evaluate((el) => el.textContent, tbody);
    finalText += "\n" + textContent;
  }
    browser.close()
  return finalText;
}

module.exports = { generateSchedule, parseNearestDay };
