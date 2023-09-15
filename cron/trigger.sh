#!/bin/bash

# Debug mode for bash
set -ex

# Config
INSTAGRAM_PLAYWRIGHT_PATH="$HOME/Personals/instagram-playwright"
OSA_SCRIPT_PROFILE_AFTER_POST_PATH="Macintosh HD:Users:$USER:Personals:instagram-playwright:photos:profile-after-post.png"

# Note: exclude these paths using .gitignore
CREATE_POST_LOGS_RELATIVE_PATH="cron/create-post.log"
CRON_TRIGGERS_PATH="$INSTAGRAM_PLAYWRIGHT_PATH/cron/cron-triggers.log"

MIN_HOURS_BETWEEN_TRIGGERS="4"
MIN_SECONDS_FOR_SCRIPT_SUCCESS="20"
LOG_DATE_FORMAT='%Y-%m-%d %H:%M:%S%z'
LOG_CRON_SUCCESS_TIME_PREFIX='Ran cron successfully at: '

# Utility functions
function tee_log_create_post() {
    echo "$1" | tee -a "$CREATE_POST_LOGS_RELATIVE_PATH"
}

# Note: MacOS specific function
function _sys_notify() {
    local notification_command="display notification \"$2\" with title \"$1\" sound name \"Frog\""
    osascript -e "$notification_command"
}

function init_script() {
    # Script start
    SCRIPT_START_EPOCH=$(date +%s)
    # Create log files if not present
    cd $INSTAGRAM_PLAYWRIGHT_PATH
    touch $CREATE_POST_LOGS_RELATIVE_PATH
    touch $CRON_TRIGGERS_PATH
}

# Init script
init_script

# Trigger -> Run check
LAST_SUCCESSFUL_TIMESTAMP=$(grep "$LOG_CRON_SUCCESS_TIME_PREFIX" "$CRON_TRIGGERS_PATH" | tail -n 1 | awk -F"$LOG_CRON_SUCCESS_TIME_PREFIX" '{print $2}')
if [[ "$LAST_SUCCESSFUL_TIMESTAMP" == "" ]]; then
    LAST_SUCCESSFUL_RUN_EPOCH="0"
else
    LAST_SUCCESSFUL_RUN_EPOCH=$(date -jf "$LOG_DATE_FORMAT" "$LAST_SUCCESSFUL_TIMESTAMP" +'%s')
fi
DIFF_HOURS=$(((SCRIPT_START_EPOCH - LAST_SUCCESSFUL_RUN_EPOCH) / 3600))
if [[ "$DIFF_HOURS" -lt "$MIN_HOURS_BETWEEN_TRIGGERS" ]]; then
    echo "[$(date +"$LOG_DATE_FORMAT")] Skipping notifications as not enough time has elapsed before next post." >>"$CRON_TRIGGERS_PATH"
    exit 0
else
    echo "Running cron at: $(date +"$LOG_DATE_FORMAT")" >>"$CRON_TRIGGERS_PATH"
fi

cd $INSTAGRAM_PLAYWRIGHT_PATH
_sys_notify "Instagram Job: triggered" "Date and time: $(date)"

tee_log_create_post ""
tee_log_create_post "[ ]========================= $(date +"$LOG_DATE_FORMAT") =========================== "
tee_log_create_post "Running cron at: $(date +"$LOG_DATE_FORMAT")"

yarn create-post | tee -a "$CREATE_POST_LOGS_RELATIVE_PATH"
RET=$PIPESTATUS
SCRIPT_END_EPOCH=$(date +%s)
TIME_FOR_SCRIPT=$((SCRIPT_END_EPOCH - SCRIPT_START_EPOCH))

if [[ "$RET" == "0" ]]; then
    if [[ "$TIME_FOR_SCRIPT" -lt "$MIN_SECONDS_FOR_SCRIPT_SUCCESS" ]]; then
        _sys_notify "Instagram Job: Already Posted or Login Error"
        exit 0
    else
        _sys_notify "Instagram Job: Completed" "Date and time: $(date +"$LOG_DATE_FORMAT"). Check logs at $CREATE_POST_LOGS_RELATIVE_PATH"
        osascript -e 'tell application "Finder"' -e "open file \"$OSA_SCRIPT_PROFILE_AFTER_POST_PATH\"" -e 'end tell'
        # Update successful run date and time-
        echo "$LOG_CRON_SUCCESS_TIME_PREFIX$(date +"$LOG_DATE_FORMAT")" >>"$CRON_TRIGGERS_PATH"
    fi
else
    _sys_notify "Instagram Job: Error Code: $RET" "Date and time: $(date). Check logs at $CREATE_POST_LOGS_RELATIVE_PATH"
fi

tee_log_create_post "[/]========================= $(date +"$LOG_DATE_FORMAT") =========================== "
tee_log_create_post ""
