import { test } from "@playwright/test";
import { PHOTOS_ALBUM_PUBLIC_URL } from "../local/data/.env";
import { MAX_PHOTOS_SYNC } from "./constants";
import {
  loadSyncData,
  saveSyncData,
  getDifference,
  downloadPhoto,
} from "./utils";
import cloneDeep from "lodash.clonedeep";
test.setTimeout(10000000);
test("Sync new images from photos album", async ({ page }) => {
  const currentSyncData = await loadSyncData();
  const { photosOrder } = cloneDeep(currentSyncData);

  let scrollY = 0,
    totalPhotoUrlsSet = new Set(photosOrder),
    photoIndex = totalPhotoUrlsSet.size;
  console.log(
    `Loaded current sync data for ${totalPhotoUrlsSet.size}/${MAX_PHOTOS_SYNC} photos`
  );
  if (MAX_PHOTOS_SYNC < totalPhotoUrlsSet.size) {
    console.log(
      `Already loaded more photos than MAX_PHOTOS_SYNC. Please increase the constant value.`
    );
    return;
  }
  console.log("Loading the photos album page...");
  await page.goto(PHOTOS_ALBUM_PUBLIC_URL);

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // get the scroll container height
  const totalScrollY = await page.evaluate(
    () =>
      document
        .querySelector(
          'div[style*="background-image: url(\\"https://lh3.googleusercontent.com/"]'
        )
        .closest('[data-album-layout="1"]').clientHeight
  );
  while (scrollY < totalScrollY && totalPhotoUrlsSet.size < MAX_PHOTOS_SYNC) {
    scrollY += 500;
    console.log(
      `Scrolling page to: ${scrollY}px/${totalScrollY}px (${Math.round(
        (scrollY * 100) / totalScrollY
      )}%)`
    );
    // await page.evaluate(scroll, {direction: "down", speed: "slow", log: console.log});
    // move into a scrollable area
    await page.mouse.move(500, 500);
    // dispatch scroll event
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(500);
    console.log("Waiting for networkidle...");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const backgroundUrls = await page
      .locator(`div[style*="background-image"]`) // div[style*="background-image: url(\\"https://lh3.googleusercontent.com/"]
      .evaluateAll((els) =>
        els.map(
          (el) =>
            el.style?.backgroundImage?.match(/url\(["']?([^"']*)["']?\)/)[1]
        )
      );
    // Filter URLs to include only photos
    const pagePhotoUrls = backgroundUrls
      .filter((url) => url.includes("https://lh3.googleusercontent.com/pw/"))
      .map((photoUrl) => {
        const end = photoUrl.lastIndexOf("=w");
        if (end == -1) return photoUrl;
        // content += '  ' + '\'' + photoUrl + (maxWidth != null || maxHeight != null ? '=' : '' ) + ( maxWidth != null ? ('w' + maxWidth) : '' ) + (maxWidth != null && maxHeight != null ? '-' : '' ) + ( maxHeight != null ? ('h' + maxHeight) : '' ) + '\'';
        return photoUrl.substring(0, end);
      });
    const pagePhotoUrlsSet = new Set(pagePhotoUrls);

    // Get new photo urls
    const newPhotoUrls = [
      ...getDifference(pagePhotoUrlsSet, totalPhotoUrlsSet),
    ];

    // Update global set
    totalPhotoUrlsSet = new Set([...totalPhotoUrlsSet, ...newPhotoUrls]);

    const today = new Date();

    console.log({
      pagePhotoUrls: pagePhotoUrls.length,
      totalPhotoUrls: totalPhotoUrlsSet.size,
      scrollY,
      time: Date.now(),
      today,
    });

    // Prepare to download new photos
    console.log({ newPhotoUrls });

    const currentSyncData = await loadSyncData();
    const { meta, syncStatus, photosOrder } = cloneDeep(currentSyncData);
    console.log("Checking new photos...");

    for (const photoUrl of newPhotoUrls) {
      // Check data presence
      if (syncStatus.hasOwnProperty(photoUrl)) {
        // Check file presence for warning
        console.log(
          `Unexpected: File data already present for photo: ${syncStatus[photoUrl].filepath}`
        );
      } else {
        // Create fresh entry if not locally present
        console.log(`Downloading photo from: ${photoUrl}`);
        try {
          const filepath = await downloadPhoto(photoUrl, photoIndex);
          // Note: order of insertion not maintained here
          syncStatus[photoUrl] = { filepath, downloadedOn: today, photoIndex };
          photoIndex++;
          photosOrder.push(photoUrl);
        } catch (e) {
          console.log(`Error fetching url: ${photoUrl}. Continuing...`);
          console.error(e);
        }
      }
    }
    const orderedSyncStatus = {};
    photosOrder.forEach((photoUrl) => {
      orderedSyncStatus[photoUrl] = syncStatus[photoUrl];
    });

    console.log(
      `Saving updated photos data... Photos count: ${photosOrder.length
      }/${MAX_PHOTOS_SYNC} (${Math.round(
        (100 * photosOrder.length) / MAX_PHOTOS_SYNC
      )}%)`
    );
    saveSyncData({
      ...currentSyncData,
      syncStatus: orderedSyncStatus,
      photosOrder,
      meta: {
        ...meta,
        lastSyncedOn: today,
      },
    });
  }
});
