import { test } from "@playwright/test";
import fs from "fs";
import {
  GAP_BETWEEN_POSTS_SECONDS,
  LOGIN_STORAGE_PATH,
  MAX_PHOTOS_IN_POST,
  POSTS_PER_TRIGGER,
  SCREENSHOTS_DIRECTORY,
} from "./constants";
import {
  DEFAULT_POST_CAPTION,
  INSTAGRAM_PROFILE_URL,
} from "../local/data/.env";
import {
  loadSyncData,
  saveSyncData,
  downloadPhoto,
  getRandomTimeout,
} from "./utils";
import cloneDeep from "lodash.clonedeep";
test.setTimeout(240000);
test.use({
  storageState: LOGIN_STORAGE_PATH,
});
test("Create a new post", async ({ page }) => {
  for (let postNumber = 0; postNumber < POSTS_PER_TRIGGER; postNumber++) {
    // Note: Every run of this attempt should create a single post with a chunk of 3 images starting from the last posted date
    const currentSyncData = await loadSyncData();
    console.log(`\n\tAttempting post number: ${postNumber}`);
    const {
      meta: currentMeta,
      syncStatus,
      photosOrder,
    } = cloneDeep(currentSyncData);
    const today = new Date();
    const { checkpoints: currentCheckpoints = [], lastPostedOn } = currentMeta;
    const lastCheckpointOn =
      currentCheckpoints.length >= POSTS_PER_TRIGGER
        ? currentCheckpoints[currentCheckpoints.length - POSTS_PER_TRIGGER]
        : null;
    const GAP_BETWEEN_POSTS_HOURS = GAP_BETWEEN_POSTS_SECONDS / (60 * 60);
    if (
      lastCheckpointOn &&
      today - new Date(lastCheckpointOn) < GAP_BETWEEN_POSTS_SECONDS * 1000
    ) {
      console.log(
        `Previous post checkpoint is ${lastCheckpointOn}, less than ${GAP_BETWEEN_POSTS_HOURS}hrs have passed since the checkpoint post.`
      );
      return;
      // throw new Error(`less than ${GAP_BETWEEN_POSTS_HOURS}hrs have passed since the checkpoint post`);
    }
    console.log(
      `Last posted on: ${lastPostedOn}, Previous checkpoint: ${lastCheckpointOn}`
    );
    console.log(`Filtering out unposted photos...`);
    const photosToPost = [];

    for (const photoUrl of photosOrder) {
      const { postedOn, filepath, photoIndex } = syncStatus[photoUrl];
      if (!postedOn && photosToPost.length < MAX_PHOTOS_IN_POST) {
        console.log({ photoUrl, syncStatus: syncStatus[photoUrl] });
        if (filepath === null) {
          console.log(
            `Note: [Unexpected] file not recognized, skipping this post`
          );
          continue;
        }
        photosToPost.push(photoUrl);
        // Download missing files( except error files)
        if (!fs.existsSync(filepath)) {
          console.log(`Note: Photo does not exist locally at: ${filepath}`);
          console.log(`Downloading again from ${photoUrl}`);
          const downloadPath = await downloadPhoto(photoUrl, photoIndex);

          syncStatus[photoUrl].downloadedOn = today;
          if (downloadPath != filepath) {
            console.log(
              `Note: [Unexpected] Updating new filepath for photo: ${filepath} -> ${downloadPath}`
            );
            syncStatus[photoUrl].filepath = downloadPath;
          }
          console.log(`Downloaded photo at ${downloadPath}.`);

          saveSyncData({
            ...currentSyncData,
            syncStatus,
            meta: currentMeta,
          });
        }
      }
    }

    if (photosToPost.length === 0) {
      console.log(`No photos left to post!`);
      return;
    }
    console.log({ photosToPost });

    console.log("Loading instagram profile page...");
    await page.goto(INSTAGRAM_PROFILE_URL);

    await page.waitForLoadState("domcontentloaded");

    // Detect if login storage load was successful
    try {
      await page
        .getByRole("link", { name: "New post Create" })
        .click({ timeout: 3000 });
      console.log(`Create post option visible. Continuing...`);
    } catch (e) {
      console.log(`Login session might have expired. Please login again.`);
      await page.screenshot({
        path: `${SCREENSHOTS_DIRECTORY}/create-post-login-expired.png`,
        fullPage: true,
      });
      return;
    }

    await page.waitForTimeout(getRandomTimeout());
    console.log("Filling post data...");
    // Start waiting for file chooser before clicking. Note no await.
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Select From Computer" }).click();

    const fileChooser = await fileChooserPromise;
    const filesToPost = photosToPost.map(
      (photoUrl) => syncStatus[photoUrl].filepath
    );
    await fileChooser.setFiles(filesToPost);

    await page.waitForTimeout(getRandomTimeout());
    await page.getByRole("button", { name: "Next" }).click();

    await page.waitForTimeout(getRandomTimeout());
    await page.getByRole("button", { name: "Next" }).click();

    await page.waitForTimeout(getRandomTimeout());
    await page.getByRole("paragraph").click();
    await page.getByLabel("Write a caption...").type(DEFAULT_POST_CAPTION, {
      delay: 50,
    });

    await page.waitForTimeout(getRandomTimeout());
    console.log("Submitting the post...");
    await page.getByRole("button", { name: "Share" }).click();

    // Save metadata once Share is clicked
    console.log("Saving updated photos data...");
    photosToPost.forEach((photoUrl) => {
      syncStatus[photoUrl].postedOn = today;
    });
    saveSyncData({
      ...currentSyncData,
      syncStatus,
      meta: {
        ...currentMeta,
        lastPostedOn: today,
        checkpoints: [...currentCheckpoints, today],
      },
    });

    // TODO: updated auth.json is expiring quickly since around 15 Sept 2023 -
    // console.log(`Saving logged in session to: ${LOGIN_STORAGE_PATH}`);
    // await page.context().storageState({
    //   path: LOGIN_STORAGE_PATH,
    // });
    // Case of reverting saved data due to any error
    try {
      const successLocator = page.getByText("Post shared");
      await successLocator.waitFor({ timeout: 10000 });
    } catch (e) {
      console.log("Note: Error finding the success indicator", e);
      console.log(`Check sync status manually for these urls: ${photosToPost}`);
      // include post-time for record keeping
      await page.screenshot({
        path: `${SCREENSHOTS_DIRECTORY}/post-shared-error-${today.toISOString()}.png`,
        fullPage: true,
      });
      // saveSyncData(currentSyncData);
    }

    console.log("Post shared...");
    await page.getByRole("button", { name: "Close" }).click();

    // Save screenshots after posting
    await page.waitForTimeout(getRandomTimeout());
    console.log("Loading instagram profile page...");
    await page.goto(INSTAGRAM_PROFILE_URL);
    await page.waitForLoadState("networkidle");
    console.log(
      `Saving profile screenshot at: ${SCREENSHOTS_DIRECTORY}/profile-after-post.png`
    );

    // Override a shared screenshot location
    await page.screenshot({
      path: `${SCREENSHOTS_DIRECTORY}/profile-after-post.png`,
      fullPage: true,
    });

    // include post-time for record keeping
    await page.screenshot({
      path: `${SCREENSHOTS_DIRECTORY}/profile-${today.toISOString()}.png`,
      fullPage: true,
    });

    await page.waitForTimeout(getRandomTimeout());
  }
});
