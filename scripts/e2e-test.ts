import { chromium, type Page } from "playwright-core";

const BASE = "http://localhost:3000";

async function gotoReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => {
      const f = document.querySelector("form");
      return !f || Object.keys(f).some((k) => k.startsWith("__reactProps"));
    },
    { timeout: 15000 },
  );
}

async function main() {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const ctx = await browser.newContext();

  const log = (s: string) => console.log(s);

  // ---- Lecturer signs in ----
  let page = await ctx.newPage();
  await gotoReady(page, `${BASE}/login`);
  await page.fill('input[type="email"]', "lecturer@test.edu");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app", { timeout: 15000 });
  log("1. lecturer signed in, landed on /app");

  // ---- Create an objective question ----
  await gotoReady(page, `${BASE}/app/questions`);
  await page.click('text=New question');
  await page.fill("textarea", "What is 2 + 2?");
  await page.waitForTimeout(300);
  const optionInputs = await page.locator('input[class*="rounded-lg"]').count();
  log(`2. question form open, option inputs: ${optionInputs}`);
  // mark second option correct by clicking the circle button
  await page.locator('button[title="Mark correct"]').nth(1).click();
  // fill option labels
  // The options are inputs in the options block. Fill them by index.
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(0).fill("3");
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(1).fill("4");
  await page.locator("div").filter({ hasText: "Options" }).locator("input").nth(2).fill("5");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=What is 2 + 2?", { timeout: 10000 });
  log("3. objective question created and listed");

  // ---- Create a subjective question ----
  await page.click("text=New question");
  await page.click('button:has-text("subjective")');
  await page.fill("textarea", "Explain the water cycle.");
  // fill rubric criteria label
  await page.locator("div").filter({ hasText: "Rubric criteria" }).locator("input").nth(0).fill("Accuracy");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=Explain the water cycle.", { timeout: 10000 });
  log("4. subjective question created and listed");

  // ---- Create an exam ----
  await gotoReady(page, `${BASE}/app/exams`);
  await page.click("text=New exam");
  await page.fill("input", "Demo Exam");
  await page.click('button:has-text("Create")');
  await page.waitForSelector("text=Demo Exam", { timeout: 10000 });
  log("5. exam created");

  // ---- Add questions to exam ----
  await page.click("text=Manage");
  await page.waitForURL("**/app/exam-builder/**", { timeout: 10000 });
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
  const checkboxes = await page.locator('input[type="checkbox"]').all();
  for (const c of checkboxes) {
    await c.check();
  }
  await page.click('button:has-text("Add to exam")');
  await page.waitForSelector("text=What is 2 + 2?", { timeout: 10000 });
  log("6. both questions added to exam (2 sections)");

  // ---- Publish ----
  await page.click('button:has-text("Publish to live")');
  await page.waitForSelector("text=live", { timeout: 10000 });
  log("7. exam published to live");

  // ---- Distribute to students ----
  await page.waitForSelector("text=Distribute to students", { timeout: 10000 });
  await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
  const distCheckboxes = await page.locator('input[type="checkbox"]').all();
  for (const c of distCheckboxes) {
    await c.check();
  }
  await page.click('button:has-text("Distribute")');
  await page.waitForTimeout(1000);
  log("8. exam distributed to all students");

  // ---- Student takes the exam ----
  const studentCtx = await browser.newContext();
  const studentPage = await studentCtx.newPage();
  await gotoReady(studentPage, `${BASE}/login`);
  await studentPage.fill('input[type="email"]', "student@test.edu");
  await studentPage.fill('input[type="password"]', "password123");
  await studentPage.click('button[type="submit"]');
  await studentPage.waitForURL("**/app", { timeout: 15000 });
  await studentPage.waitForSelector("text=Demo Exam", { timeout: 10000 });
  log("9. student sees Demo Exam on dashboard");

  await studentPage.click("text=Take exam");
  await studentPage.waitForURL("**/app/exam-read/**", { timeout: 10000 });
  await studentPage.waitForSelector("text=What is 2 + 2?", { timeout: 10000 });
  // answer the objective: click option "4"
  await studentPage.locator("button", { hasText: /^4$/ }).click();
  // answer the subjective: fill the textarea
  await studentPage.locator("textarea").fill("Water evaporates, forms clouds, rains.");
  await studentPage.click('button:has-text("Save draft")');
  await studentPage.waitForSelector("text=Draft saved.", { timeout: 10000 });
  log("10. student answered both questions and saved draft");

  await studentPage.on("dialog", (d) => d.accept());
  await studentPage.click('button:has-text("Submit")');
  await studentPage.waitForTimeout(1000);
  log("11. student submitted exam");

  // ---- Lecturer grades ----
  await gotoReady(page, `${BASE}/app/exams`);
  await page.waitForSelector("text=Demo Exam", { timeout: 10000 });
  await page.click("text=Manage");
  await page.waitForURL("**/app/exam-builder/**", { timeout: 10000 });
  await page.waitForSelector("text=Grading", { timeout: 10000 });
  await page.waitForTimeout(1500);
  log("12. grading panel visible");
  const approveButtons = await page.locator('button:has-text("Approve")').count();
  log(`13. subjective approve buttons found: ${approveButtons}`);

  if (approveButtons > 0) {
    await page.locator('button:has-text("Approve")').first().click();
    await page.waitForTimeout(800);
  }

  // ---- Close exam ----
  await page.click('button:has-text("Close exam")');
  await page.waitForTimeout(1000);
  log("14. close exam clicked");

  // ---- Release results ----
  await page.click('button:has-text("Release results")');
  await page.waitForTimeout(1000);
  log("15. release results clicked");

  // ---- Student views result ----
  await gotoReady(studentPage, `${BASE}/app`);
  await studentPage.waitForSelector("text=Demo Exam", { timeout: 10000 });
  // use a native click: Playwright's synthetic click isn't picked up by the router Link
  await studentPage.locator('a:has-text("Result")').first().evaluate((a: HTMLAnchorElement) => a.click());
  await studentPage.waitForFunction(
    () => window.location.pathname.startsWith("/app/exam/"),
    { timeout: 10000 },
  );
  await studentPage.waitForTimeout(1500);
  const body = (await studentPage.textContent("body")) ?? "";
  const hasScore = body.includes("Score");
  const hasCorrect = body.includes("Correct");
  log(`16. student result page — has score: ${hasScore}, has correct objective badge: ${hasCorrect}`);

  await browser.close();
  await studentCtx.close();
  log("DONE");
}

main().catch((e) => {
  console.error("E2E FAILED:", e.message);
  process.exit(1);
});