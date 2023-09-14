import { PHOTOS_DATA_PATH } from "./constants";
import fs from "fs";
export const saveSyncData = (updatedPhotosData) => {
  fs.writeFileSync(
    PHOTOS_DATA_PATH,
    JSON.stringify(updatedPhotosData, null, 2)
  );
  console.log(`written updated photos data to: ${PHOTOS_DATA_PATH}`);
};

export const loadSyncData = async () => {
  if (fs.existsSync(PHOTOS_DATA_PATH)) {
    console.log("Loading existing photos data...");
    return JSON.parse(fs.readFileSync(PHOTOS_DATA_PATH));
  } else {
    console.log("No existing photos data found. Starting fresh...");
    return { syncStatus: {}, meta: {}, photosOrder: [] };
  }
};

export const getDifference = (set1, set2) => {
  const difference = new Set();
  set1.forEach((element) => {
    if (!set2.has(element)) {
      difference.add(element);
    }
  });
  return difference;
};

export const getMimeTypeFromArrayBuffer = (arrayBuffer) => {
  const uint8arr = new Uint8Array(arrayBuffer);

  const len = 4;
  if (uint8arr.length >= len) {
    let signatureArr = new Array(len);
    for (let i = 0; i < len; i++)
      signatureArr[i] = new Uint8Array(arrayBuffer)[i].toString(16);
    const signature = signatureArr.join("").toUpperCase();

    switch (signature) {
      case "89504E47":
        return { ext: "png" };
      case "47494638":
        return { ext: "gif" };
      case "FFD8FFDB":
      case "FFD8FFE0":
        return { ext: "jpeg" };
      default:
        return {};
    }
  }
  return {};
};

export const getRandomTimeout = () => 1000 + Math.round(1000 * Math.random());
