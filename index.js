// This code refactors a script to scrape LinkedIn profile details. It requires the 'fs', 'path', and 'puppeteer' modules.
const fs = require("fs");
const { resolve } = require("path");
const puppeteer = require("puppeteer");
const {stringify} = require('csv-stringify/sync');
require("dotenv").config();

(async () => {
  // Launch a browser and create a new page
  const browser = await puppeteer.launch({
    headless: true,
    devtools: false,
    slowMo: 0,
    args: ["--window-size=1920,1080"],
  });
  const page = await browser.newPage();
  await page._client.send("Emulation.clearDeviceMetricsOverride");

  // Navigate to LinkedIn home page
  await page.goto("https://www.linkedin.com/home");
  await page.setViewport({ width: 1680, height: 866 });
  await page.waitForSelector("#session_key");
  await page.click("#session_key");
  await page.type("#session_key", process.env.LINKEDIN_USERNAME);
  await page.waitForSelector("#session_password");
  await page.click("#session_password");
  await page.type("#session_password", process.env.LINKEDIN_PASSWORD);
  await page.waitForSelector(
    ".section > .self-start > .sign-in-form-container > .sign-in-form > .sign-in-form__submit-button"
  );
  await page.click(
    ".section > .self-start > .sign-in-form-container > .sign-in-form > .sign-in-form__submit-button"
  );
  await page.waitForSelector(".feed-identity-module__member-bg-image");

  // Read profile URLs from file
  const profileUrls = fs.readFileSync(
    resolve(process.cwd(), "urls.txt"),
    "utf8"
  );

  // Iterate over profile URLs and scrape profile details
  const profiles = [];
  for (const profileUrl of profileUrls.split("\n").filter(Boolean)) {
    console.time("LinkedIn scraper");
    const profile = await extractProfileDetails(page, profileUrl);
    profiles.push(profile);
    console.timeEnd("LinkedIn scraper");
  }

  // Write profile details to a JSON file
  fs.writeFileSync(`./results.json`, JSON.stringify(profiles, null, 2));
  const csv = stringify(profiles, { delimiter: ',', quote: '"', header: true });
  console.log(csv);  
  fs.writeFileSync(`./results.csv`, csv);
  process.exit(0);
})();

// Helper function to extract profile details from a given URL
async function extractProfileDetails(page, profileUrl) {
  console.log("Get profile details at URL " + profileUrl);

  try {
    await page.goto(profileUrl);
  } catch (e) {
    console.error("page goto", e);
    throw new Error("Error connecting");
  }

  console.log("Page loaded");

  // Extract profile details
  const [name] = await extractText({
    selectorPath: ".pv-text-details__left-panel > div > h1",
  });
  console.log("name", name);
  const [title] = await extractText({
    selectorPath: ".pv-text-details__left-panel > .text-body-medium",
  });
  console.log("title", title);
  const [company] = await extractHref({
    selectorPath: '[data-field="experience_company_logo"]',
  });
  console.log("company", company);

  return { company, name, title };

  // Helper function to extract text from a given selector
  async function extractText({ xpath, selectorPath }) {
    try {
      xpath
        ? await page.waitForXPath(xpath, { timeout: 1000 })
        : await page.waitForSelector(selectorPath, { timeout: 1000 });
      const handles = xpath
        ? await page.$x(xpath)
        : await page.$$(selectorPath);
      return await Promise.all(
        handles.map((cellHandle) =>
          page.evaluate(
            (cell) => cell.textContent?.replace(/\s\s+/g, " ").trim(),
            cellHandle
          )
        )
      );
    } catch (e) {
      console.error(`extractText timeout ${{ xpath, selectorPath }}`, e);
    }
  }

  // Helper function to extract href from a given selector
  async function extractHref({ xpath, selectorPath }) {
    try {
      xpath
        ? await page.waitForXPath(xpath, { timeout: 10000 })
        : await page.waitForSelector(selectorPath, { timeout: 10000 });
      const cellHandles = xpath
        ? await page.$x(xpath)
        : await page.$$(selectorPath);
      return await Promise.all(
        cellHandles.map((cellHandle) =>
          page.evaluate((cell) => cell.getAttribute("href"), cellHandle)
        )
      );
    } catch (e) {
      console.error(`extractHref timeout ${{ xpath, selectorPath }}`, e);
    }
  }
}
