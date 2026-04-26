#!/usr/bin/env bash

# ============================================================
#  watch-errors.sh — PH App full-spectrum error watcher
#  Catches EVERYTHING: crashes, JS errors, navigation bugs,
#  native exceptions, warnings, redirect mismatches, all of it
# ============================================================

PACKAGE="com.clientreachai.phperformance"
LOG_FILE="$HOME/ph_error_log.txt"
SEEN_HASHES_FILE="/tmp/ph_seen_hashes.txt"

BOLD="\033[1m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
MAGENTA="\033[0;35m"
RESET="\033[0m"

# ── Every possible way an Expo/RN app can fail ───────────────
#
# Level-based: catch all E (error) and F (fatal) lines
# Pattern-based: catch specific things logcat tags as W (warn) too
#
LEVEL_PATTERN="^[0-9\-]* [0-9:.]*\s*[0-9]*\s*[0-9]* [EF] "

KEYWORD_PATTERN=\
"FATAL EXCEPTION"\
"|AndroidRuntime"\
"|CRASH"\
"|signal [0-9]"\
"|Abort message"\
"|libc.*fatal"\
"|art.*SIGABRT"\
"|Unhandled JS Exception"\
"|Unhandled promise"\
"|RedBox"\
"|invariant violation"\
"|TypeError"\
"|ReferenceError"\
"|SyntaxError"\
"|RangeError"\
"|EvalError"\
"|URIError"\
"|Cannot read prop"\
"|is not a function"\
"|is not defined"\
"|Cannot destructure"\
"|undefined is not"\
"|null is not"\
"|Maximum update depth"\
"|Warning: Each child"\
"|Warning: Cannot update"\
"|Warning: Can't perform"\
"|Warning: An update to"\
"|No route named"\
"|No screen"\
"|navigate.*not defined"\
"|navigation.*undefined"\
"|router.*error"\
"|Redirect.*mismatch"\
"|redirect.*failed"\
"|route.*not found"\
"|href.*invalid"\
"|expo-router.*error"\
"|expo-router.*warn"\
"|Network request failed"\
"|fetch.*failed"\
"|axios.*error"\
"|ECONNREFUSED"\
"|ETIMEDOUT"\
"|ENOTFOUND"\
"|401\|403\|404\|500\|502\|503"\
"|NativeModule.*null"\
"|NativeModule.*undefined"\
"|requireNativeComponent"\
"|NativeEventEmitter"\
"|bridge.*error"\
"|Hermes.*error"\
"|JS engine.*crash"\
"|Watchdog"\
"|ANR"\
"|Application Not Responding"\
"|OutOfMemoryError"\
"|StackOverflow"\
"|NullPointerException"\
"|IllegalState"\
"|IllegalArgument"\
"|IndexOutOfBounds"\
"|ClassCast"\
"|Permission denied"\
"|PERMISSION_DENIED"\
"|StorageException"\
"|DatabaseException"\
"|supabase.*error"\
"|postgresql.*error"\
"|auth.*error"\
"|token.*invalid"\
"|token.*expired"\
"|session.*expired"\
"|Warning:.*failed prop type"\
"|could not be found"\
"|Module.*not found"\
"|Unable to resolve"\
"|require.*failed"\
"|import.*failed"

# ── startup ──────────────────────────────────────────────────
clear
echo -e "${BOLD}${RED}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║   PH ERROR MONSTER — NOTHING GETS PAST ME    ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${RESET}"
echo -e "  ${BOLD}Package  :${RESET} ${YELLOW}${PACKAGE}${RESET}"
echo -e "  ${BOLD}Log file :${RESET} ${CYAN}${LOG_FILE}${RESET}"
echo -e "  ${BOLD}Stop     :${RESET} ${RED}Ctrl+C${RESET}"
echo ""

# ── check adb ────────────────────────────────────────────────
if ! command -v adb &>/dev/null; then
  echo -e "${RED}[ERROR]${RESET} adb not found. Add Android SDK platform-tools to PATH."
  exit 1
fi

DEVICE=$(adb devices | grep -v "List of" | grep "device$" | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
  echo -e "${RED}[ERROR]${RESET} No device connected. Plug in your phone."
  exit 1
fi
echo -e "${GREEN}[+]${RESET} Device: ${YELLOW}${DEVICE}${RESET}"

# ── wait for app ──────────────────────────────────────────────
echo -e "${CYAN}[~]${RESET} Waiting for app to start..."
while true; do
  PID=$(adb -s "$DEVICE" shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r')
  [ -n "$PID" ] && break
  sleep 1
done
echo -e "${GREEN}[+]${RESET} App PID: ${YELLOW}${PID}${RESET}"

# Also grab child pids (JS thread, Hermes, etc.) — refresh every 30s
get_all_pids() {
  # Main process
  MAIN_PID=$(adb -s "$DEVICE" shell pidof -s "$PACKAGE" 2>/dev/null | tr -d '\r')
  # All processes with this package name (covers :hermes :work etc.)
  ALL_PIDS=$(adb -s "$DEVICE" shell ps 2>/dev/null \
    | grep "$PACKAGE" \
    | awk '{print $2}' \
    | tr '\r' ' ' \
    | tr '\n' '|' \
    | sed 's/|$//')
  echo "$ALL_PIDS"
}

PID_LIST=$(get_all_pids)
echo -e "${GREEN}[+]${RESET} Watching PIDs: ${YELLOW}${PID_LIST}${RESET}"

# ── setup log ─────────────────────────────────────────────────
touch "$LOG_FILE"
> "$SEEN_HASHES_FILE"

{
  echo ""
  echo "================================================================"
  echo "  SESSION : $(date '+%Y-%m-%d %H:%M:%S')"
  echo "  Package : ${PACKAGE}"
  echo "  Device  : ${DEVICE}"
  echo "  PIDs    : ${PID_LIST}"
  echo "================================================================"
  echo ""
} >> "$LOG_FILE"

echo -e "${GREEN}[+]${RESET} Logging to ${CYAN}${LOG_FILE}${RESET}"
echo -e "${RED}${BOLD}[*] MONSTER IS LIVE — catching every bug, crash, and redirect fart${RESET}\n"

# ── counters shared via temp file (subshell limitation) ───────
COUNT_FILE="/tmp/ph_error_count.txt"
echo "0" > "$COUNT_FILE"

# ── monitor for app restart so we re-grab PIDs ────────────────
LAST_PID_REFRESH=$(date +%s)

# ── main loop — NO --pid filter, we filter ourselves ─────────
# This catches EVERYTHING including Hermes thread, native crashes,
# renderer errors — nothing is hidden behind a PID filter.
adb -s "$DEVICE" logcat -v threadtime 2>&1 | while IFS= read -r line; do

  # Refresh PID list every 30 seconds (catches restarts)
  NOW=$(date +%s)
  if (( NOW - LAST_PID_REFRESH > 30 )); then
    NEW_PIDS=$(get_all_pids)
    [ -n "$NEW_PIDS" ] && PID_LIST="$NEW_PIDS"
    LAST_PID_REFRESH=$NOW
  fi

  # ── hard-skip known system noise unrelated to the app ────────
  if echo "$line" | grep -qE "nxp\.android\.har|oaMobileBanking|keystore2|Watchdog.*!@Sync|Zygote.*exited due to signal 9|Watchdog thread idle"; then
    continue
  fi

  # ── filter: only lines from our app OR matching keywords globally ──
  LINE_PID=$(echo "$line" | awk '{print $3}' | tr -d '\r')
  IS_OUR_APP=false
  if [ -n "$PID_LIST" ] && echo "$PID_LIST" | grep -qE "(^|[|])${LINE_PID}([|]|$)"; then
    IS_OUR_APP=true
  fi

  MATCHES_KEYWORD=false
  if echo "$line" | grep -qE "$KEYWORD_PATTERN"; then
    MATCHES_KEYWORD=true
  fi

  MATCHES_LEVEL=false
  if echo "$line" | grep -qE "$LEVEL_PATTERN"; then
    # Only count E/F level lines if they're from our app OR mention our package
    if $IS_OUR_APP || echo "$line" | grep -q "$PACKAGE"; then
      MATCHES_LEVEL=true
    fi
  fi

  # Skip if nothing matches
  if ! $IS_OUR_APP && ! $MATCHES_KEYWORD && ! $MATCHES_LEVEL; then
    continue
  fi

  # ── deduplicate ───────────────────────────────────────────────
  # Strip timestamp and PID so same error at different times = same hash
  CLEANED=$(echo "$line" | sed 's/^[0-9\-]* [0-9:.]*\s*[0-9]*\s*[0-9]* [A-Z] //' | sed 's/  */ /g')
  # Further normalize: strip memory addresses and line numbers that change
  NORMALIZED=$(echo "$CLEANED" | sed 's/0x[0-9a-fA-F]*/0xADDR/g' | sed 's/:[0-9]\+)/LINENUM)/g')
  HASH=$(echo "$NORMALIZED" | md5sum | awk '{print $1}')

  if grep -qF "$HASH" "$SEEN_HASHES_FILE" 2>/dev/null; then
    continue
  fi

  echo "$HASH" >> "$SEEN_HASHES_FILE"

  # ── increment count ───────────────────────────────────────────
  COUNT=$(cat "$COUNT_FILE")
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNT_FILE"

  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # ── categorize ────────────────────────────────────────────────
  CATEGORY="BUG"
  COLOR="$YELLOW"
  if echo "$line" | grep -qiE "FATAL|CRASH|signal [0-9]|Abort|ANR|OutOfMemory|StackOverflow"; then
    CATEGORY="CRASH"
    COLOR="$RED"
  elif echo "$line" | grep -qiE "TypeError|ReferenceError|SyntaxError|Cannot read|is not a function|undefined is not|null is not|Unhandled"; then
    CATEGORY="JS ERROR"
    COLOR="$MAGENTA"
  elif echo "$line" | grep -qiE "route|navigate|redirect|href|router|screen|No route|No screen"; then
    CATEGORY="NAVIGATION"
    COLOR="$CYAN"
  elif echo "$line" | grep -qiE "fetch|Network|axios|ECONN|ETIMED|401|403|404|500|502|503|supabase|auth|token|session"; then
    CATEGORY="NETWORK/AUTH"
    COLOR="$YELLOW"
  elif echo "$line" | grep -qiE "Warning:"; then
    CATEGORY="WARNING"
    COLOR="$YELLOW"
  fi

  # ── write to log ──────────────────────────────────────────────
  {
    echo ""
    echo "┌─ #${COUNT} ── ${CATEGORY} ── ${TIMESTAMP} ─────────────────────────────"
    echo "│ ${line}"
    echo "└────────────────────────────────────────────────────────────────────"
  } >> "$LOG_FILE"

  # ── shout ─────────────────────────────────────────────────────
  echo -e "${COLOR}${BOLD}[!] YO BRO — #${COUNT} NEW ${CATEGORY} JUST HIT${RESET}"
  echo -e "    ${line}" | cut -c1-140
  echo -e "    ${CYAN}→ ${LOG_FILE}${RESET}\n"

done

FINAL_COUNT=$(cat "$COUNT_FILE" 2>/dev/null || echo "?")
echo -e "\n${YELLOW}Stopped. Caught ${RED}${FINAL_COUNT}${YELLOW} unique issues.${RESET}"
echo -e "Full log: ${CYAN}${LOG_FILE}${RESET}\n"
