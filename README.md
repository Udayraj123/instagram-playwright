# Instagram Playwright

> TODO: Introduction and project brief 

_Note: Some features may work only on MacOS._

### Instructions

- Install dependencies: `yarn install`
- Install supported browsers: `npx playwright install`
- Copy env file:
```
cd instagram-playwright
cp local/data/.env.example.js local/data/.env.js
```
- Update your profile details and credentials in the `.env.js` file.
- Run yarn save-login to save your auth.json file
- Customize your syncing/posting configuration in the test/constants.js file
- Run yarn sync-photos to sync your photos locally and to update the photos metadata in a json.
- Run yarn create-post to manually trigger creation of a new post from the album.
- (Optional) setup cron jobs to trigger your scripts automatically

#### Crontab cofiguration

- Update your paths in the cron/save-login-trigger.sh file
    - INSTAGRAM_PLAYWRIGHT_PATH
    - LOGIN_STORAGE_PATH
    - MIN_HOURS_BETWEEN_TRIGGERS
- Update your paths in the cron/create-post-trigger.sh file
    - INSTAGRAM_PLAYWRIGHT_PATH
    - MIN_HOURS_BETWEEN_TRIGGERS
    - OSA_SCRIPT_PROFILE_AFTER_POST_PATH
- To run the trigger command every 30 minutes, update your crontab -
```bash
crontab -e

# Paste below cron entries
*/30 * * * * BASH_ENV=~/.bashrc bash -l -c /path/to/cron/create-post-trigger.sh >> /path/to/cron/create-post-cron-runs.log 2>&1
*/30 * * * * BASH_ENV=~/.bashrc bash -l -c /path/to/cron/save-login-trigger.sh >> /path/to/cron/save-login-cron-runs.log 2>&1
# Note: We are passing BASH_ENV as we need PATH variable to make sure that executable commands like `yarn` are found. 
# It loads your .bashrc file as a generic solution
```
Note: As cron jobs don't execute when your device is sleeping or shutdown, We set the trigger to execute every 30 minutes so that it runs when you turn on your device.
The actual posts will happen based on the information provided in your configuration files i.e. the *-trigger.sh and tests/constants.js files.

### Debugging/Visuals
Pass the --headed flag to your command for seeing the bot in action, for example -
```
yarn sync-photos --headed
```

For debugging the tests you can pass the --ui flag, for example -
```
yarn create-post --ui
```
