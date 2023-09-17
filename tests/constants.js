// Local files config
// Note: you may need to update the same variable(s) in cron triggers
export const LOGIN_STORAGE_PATH = "local/data/auth.json";
export const PHOTOS_DATA_PATH = "local/data/sync.json";
export const SCREENSHOTS_DIRECTORY = "local/screenshots";
export const LOCAL_PHOTOS_DIRECTORY = "local/photos";

// Sync configuration
export const MAX_PHOTOS_SYNC = 1500;

// Posts configuration
export const MAX_PHOTOS_IN_POST = 1;
export const POSTS_PER_TRIGGER = 5;
export const GAP_BETWEEN_POSTS_SECONDS = 0.125 * 24 * 60 * 60;
