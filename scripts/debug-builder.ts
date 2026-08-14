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
  const logs: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (m.type() === "error" || m.type() === "warning")
      logs.push(`${m.type()}: ${t.slice(0, 400)}`);
  });
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message.slice(0, 500)}`));
  page.on("response", async (r) => {
    const u = r.url();
    if (u.includes("/_serverFn") && r.request().method() === "POST") {
      let body = "";
      try {
        body = await r.text();
      } catch (e) {
        body = `ERR ${(e as Error).message}`;
      }
      logs.push(`POST ${r.status()} ${u.slice(0, 60)}\n  LEN=${body.length} BODY: ${body.slice(0, 400)}`);
    }
  });

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "lecturer@test.edu");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app", { timeout: 15000 });

  // create the two questions via UI (mirror e2e steps)
  await page.goto(`${BASE}/app/questions`, { waitUntil: "networkidle" });
  await page.click('text=New question');
  await page.fill("textarea", "What is 2 + 2?");
  await page.locator('button[title="Mark correct"]').nth(1).click();
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(0).fill("3");
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(1).fill("4");
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(2).fill("5");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=What is 2 + 2?", { timeout: 10000 });
  await page.click("text=New question");
  await page.click('button:has-text("subjective")');
  await page.fill("textarea", "Explain the water cycle.");
  await page.locator("div").filter({ hasText: "Rubric criteria" }).locator("input").nth(0).fill("Accuracy");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=Explain the water cycle.", { timeout: 10000 });
  console.log("questions created");

  await page.goto(`${BASE}/app/exams`, { waitUntil: "networkidle" });
  await page.click("text=New exam");
  await page.fill("input", "Demo Exam");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=Demo Exam", { timeout: 10000 });
  await page.click("text=Manage");
  await page.waitForURL("**/app/exam-builder/**", { timeout: 10000 });
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  console.log("checkboxes:", checkboxes.length);
  for (const c of checkboxes) await c.check();
  await page.click('button:has-text("Add to exam")');
  await page.waitForTimeout(4000);
  console.log(
    "Publish disabled now:",
    await page.locator('button:has-text("Publish to live")').isDisabled().catch(() => "err"),
  );
  const body = (await page.textContent("body")) ?? "";
  console.log("has 'Untitled section':", body.includes("Untitled section"));
  console.log("has 'What is 2 + 2?':", body.includes("What is 2 + 2?"));
  for (const l of logs) console.log("LOG:", l);
  await browser.close();
}
main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});