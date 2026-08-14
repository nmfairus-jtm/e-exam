import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let notFoundWarns = 0;
  page.on("console", (m) => {
    if (m.text().includes("notFoundError")) notFoundWarns++;
  });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "lecturer@test.edu");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  console.log("clicked submit");
  await page.waitForURL("**/app**", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log("FINAL URL:", page.url());
  console.log("notFound warnings:", notFoundWarns);
  await browser.close();
}
main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});