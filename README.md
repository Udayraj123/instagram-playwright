# Instagram Playwright

> TODO: Introduction and project brief 

Note: Some features may work only on MacOS.

### Instructions
- Create a .env.js file
```
cd instagram-playwright
cp .env.example.js .env.js
```
- Update your profile details and credentials in the `.env.js` file.
- Configure your schedule etc in the test/constants.js file
- Run yarn sync-photos to sync your photos locally and to create the data.json file
- Run yarn save-login to save your auth.json file
- Run yarn create-post to manually trigger creation of a new post from the album.

#### Crontab command

- Update your paths in the cron/trigger.sh file
    - INSTAGRAM_PLAYWRIGHT_PATH
    - OSA_SCRIPT_PROFILE_AFTER_POST_PATH
- To run the trigger command every 30 minutes -
```bash
crontab -e

# Paste below cron entry
* * * * * BASH_ENV=~/.bashrc bash -l -c /path/to/cron/trigger.sh >> /path/to/cron/cron-runs.log 2>&1
# Note: We are passing BASH_ENV as we need PATH variable to make sure that executable commands like `yarn` are found. 
# It loads your .bashrc file as a generic solution
```
<!-- crontab -l | { cat; echo "* * * * * BASH_ENV=~/.bashrc bash -l -c /path/to/cron/trigger.sh >> /path/to/cron/cron-runs.log 2>&1; } | crontab - -->

### Debugging/Visuals
Pass the --headed flag to your command for seeing the bot in action
```
yarn sync-photos --headed
```

For debugging the tests you can pass the --ui flag
```
yarn create-post --ui
```
