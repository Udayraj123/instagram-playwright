#!/bin/bash

# Debug mode for bash
set -ex

# Config
INSTAGRAM_PLAYWRIGHT_PATH="$HOME/Personals/instagram-playwright"
LOGIN_STORAGE_PATH="local/data/auth.json"
MIN_HOURS_BETWEEN_TRIGGERS="12"

# Note: exclude these paths using .gitignore
SAVE_LOGIN_LOGS_RELATIVE_PATH="cron/yarn-save-login.log"
SAVE_LOGIN_CRON_TRIGGERS_PATH="$INSTAGRAM_PLAYWRIGHT_PATH/cron/save-login-cron-triggers.log"

MIN_SECONDS_FOR_SCRIPT_SUCCESS="20"
LOG_DATE_FORMAT='%Y-%m-%d %H:%M:%S%z'
LOG_CRON_SUCCESS_TIME_PREFIX='Ran save-login cron successfully at: '

# Utility functions
function tee_log_save_login() {
    echo "$1" | tee -a "$SAVE_LOGIN_LOGS_RELATIVE_PATH"
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
    touch $SAVE_LOGIN_LOGS_RELATIVE_PATH
    touch $SAVE_LOGIN_CRON_TRIGGERS_PATH
}

# Init script
init_script

# Trigger -> Run check
LAST_SUCCESSFUL_TIMESTAMP=$(grep "$LOG_CRON_SUCCESS_TIME_PREFIX" "$SAVE_LOGIN_CRON_TRIGGERS_PATH" | tail -n 1 | awk -F"$LOG_CRON_SUCCESS_TIME_PREFIX" '{print $2}')
if [[ "$LAST_SUCCESSFUL_TIMESTAMP" == "" ]]; then
    LAST_SUCCESSFUL_RUN_EPOCH="0"
else
    LAST_SUCCESSFUL_RUN_EPOCH=$(date -jf "$LOG_DATE_FORMAT" "$LAST_SUCCESSFUL_TIMESTAMP" +'%s')
fi
DIFF_HOURS=$(((SCRIPT_START_EPOCH - LAST_SUCCESSFUL_RUN_EPOCH) / 3600))
if [[ "$DIFF_HOURS" -lt "$MIN_HOURS_BETWEEN_TRIGGERS" ]]; then
    echo "[$(date +"$LOG_DATE_FORMAT")] Skipping notifications as not enough time has elapsed before next post." >>"$SAVE_LOGIN_CRON_TRIGGERS_PATH"
    exit 0
else
    echo "Running cron at: $(date +"$LOG_DATE_FORMAT")" >>"$SAVE_LOGIN_CRON_TRIGGERS_PATH"
fi

cd $INSTAGRAM_PLAYWRIGHT_PATH
_sys_notify "Instagram Save Login: triggered" "Date and time: $(date)"

tee_log_save_login ""
tee_log_save_login "[ ]========================= $(date +"$LOG_DATE_FORMAT") =========================== "
tee_log_save_login "Running cron at: $(date +"$LOG_DATE_FORMAT")"

test -e "$LOGIN_STORAGE_PATH" && mv "$LOGIN_STORAGE_PATH" "$LOGIN_STORAGE_PATH.backup"
yarn save-login | tee -a "$SAVE_LOGIN_LOGS_RELATIVE_PATH"
RET=$PIPESTATUS
SCRIPT_END_EPOCH=$(date +%s)
TIME_FOR_SCRIPT=$((SCRIPT_END_EPOCH - SCRIPT_START_EPOCH))

if [[ "$RET" == "0" ]]; then
    if [[ "$TIME_FOR_SCRIPT" -lt "$MIN_SECONDS_FOR_SCRIPT_SUCCESS" ]]; then
        _sys_notify "Instagram Save Login: Ended too soon" "Possibly a login error"
        exit 0
    else
        _sys_notify "Instagram Save Login: Completed" "Date and time: $(date +"$LOG_DATE_FORMAT"). Check logs at $SAVE_LOGIN_LOGS_RELATIVE_PATH"
        # Update successful run date and time-
        echo "$LOG_CRON_SUCCESS_TIME_PREFIX$(date +"$LOG_DATE_FORMAT")" >>"$SAVE_LOGIN_CRON_TRIGGERS_PATH"
    fi
else
    _sys_notify "Instagram Save Login: Error Code: $RET" "Date and time: $(date). Check logs at $SAVE_LOGIN_LOGS_RELATIVE_PATH"
    test -e "$LOGIN_STORAGE_PATH.backup" && mv "$LOGIN_STORAGE_PATH.backup" "$LOGIN_STORAGE_PATH"
fi

tee_log_save_login "[/]========================= $(date +"$LOG_DATE_FORMAT") =========================== "
tee_log_save_login ""
