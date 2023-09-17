import { test } from "@playwright/test";
import { LOGIN_STORAGE_PATH, SCREENSHOTS_DIRECTORY } from "./constants";
import { INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD } from "../local/data/.env";
import { getRandomTimeout } from "./utils";
import fs from "fs";
test.setTimeout(240000);

test("Login to instagram", async ({ page }) => {
  if (fs.existsSync(LOGIN_STORAGE_PATH)) {
    console.log(
      `Login session already exists at ${LOGIN_STORAGE_PATH}. Remove the file to update login session`
    );
    return;
  }

  console.log("Loading instagram...");
  await page.goto("https://www.instagram.com/");
  await page.waitForLoadState("networkidle");

  await page.waitForTimeout(getRandomTimeout());
  await page.locator("[name=username]").click();
  await page
    .locator("[name=username]")
    .type(INSTAGRAM_USERNAME, { delay: 100 });

  await page.waitForTimeout(getRandomTimeout());
  await page.locator("[name=password]").click();
  await page
    .locator("[name=password]")
    .type(INSTAGRAM_PASSWORD, { delay: 100 });

  await page.waitForTimeout(getRandomTimeout());
  await page.getByRole("button", { name: "Log in", exact: true }).click();

  const today = new Date();
  try {
    await page.waitForURL("**/challenge/**", { timeout: 3000 });
    await page.screenshot({
      path: `${SCREENSHOTS_DIRECTORY}/login-captcha.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `${SCREENSHOTS_DIRECTORY}/login-captcha-${today.toISOString()}.png`,
      fullPage: true,
    });
    console.log(`Captcha page detected. Aborting...`);
    return;
  } catch (e) {
    console.log(`No Captcha page detected. Continuing...`);
  }

  await page.waitForURL("**/accounts/onetap/**");
  await page.waitForTimeout(getRandomTimeout());

  console.log(`Saving logged in session to: ${LOGIN_STORAGE_PATH}`);
  // storing login state in context to re-use at other logins
  await page.context().storageState({
    path: LOGIN_STORAGE_PATH,
  });
  let promptCount = 2;
  while (promptCount > 0) {
    try {
      const button = page.getByRole("button", {
        name: "Not now",
        exact: false,
      });
      await button.waitFor({ timeout: 1000 });
      await page.waitForTimeout(getRandomTimeout());
      await button.click();
    } catch {
      promptCount -= 1;
    }
  }
  await page.waitForLoadState("networkidle");

  // Override a shared screenshot location
  await page.screenshot({
    path: `${SCREENSHOTS_DIRECTORY}/login.png`,
    fullPage: true,
  });

  // One more screenshot with timestamp for record keeping
  await page.screenshot({
    path: `${SCREENSHOTS_DIRECTORY}/login-${today.toISOString()}.png`,
    fullPage: true,
  });
  console.log("All done, check the screenshot. ✨");
});
