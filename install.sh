#!/usr/bin/env bash
#
# Install (or remove) the YouTube transcript bridge as a systemd user service.
# Safe to re-run: it re-renders the unit and restarts the service, so this is
# also how you apply an edit to yt-transcript-server.service.in.
#
#   ./install.sh              install and start
#   ./install.sh --uninstall  stop, disable, and remove the unit

set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$REPO_ROOT/packages/server"
UNIT_NAME="yt-transcript-server.service"
TEMPLATE="$SERVER_DIR/$UNIT_NAME.in"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
UNIT_PATH="$UNIT_DIR/$UNIT_NAME"
ENV_FILE="$REPO_ROOT/.env"
PLACEHOLDER_KEY="your_secure_api_key_here"

if [[ -t 1 ]]; then
    R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[1m'; N=$'\033[0m'
else
    R=''; G=''; Y=''; B=''; N=''
fi

info() { printf '%s==>%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%swarn:%s %s\n' "$Y" "$N" "$*" >&2; }
die()  { printf '%serror:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

require_systemd() {
    command -v systemctl >/dev/null 2>&1 \
        || die "systemctl not found; this installer targets systemd."
    # A user instance is not guaranteed to exist (containers, some remote
    # sessions). Fail here rather than emitting confusing errors later.
    systemctl --user show-environment >/dev/null 2>&1 \
        || die "no systemd user instance is running for '$(id -un)'."
}

uninstall() {
    # Deliberately NOT require_systemd: that dies when no user manager is
    # live, which would abort before the rm below and leave the unit file in
    # place -- so an "uninstall" that reported failure would still bring the
    # service back at the next login. Removing the file is the part that must
    # always happen; stopping a service is only meaningful if a manager is
    # there to stop it.
    if command -v systemctl >/dev/null 2>&1 \
        && systemctl --user show-environment >/dev/null 2>&1; then
        # Tolerate an already-absent unit: this is idempotency, not error hiding.
        systemctl --user disable --now "$UNIT_NAME" >/dev/null 2>&1 || true
        rm -f "$UNIT_PATH"
        systemctl --user daemon-reload
    else
        rm -f "$UNIT_PATH"
        # `disable` is what normally removes this symlink; without a manager
        # to run it, drop the link by hand so we do not leave a dangling
        # entry that makes a later daemon-reload complain.
        rm -f "$UNIT_DIR/default.target.wants/$UNIT_NAME"
        warn "No systemd user instance; removed the unit file without stopping it."
    fi
    info "Removed $UNIT_NAME. Your .env and node_modules were left alone."
    exit 0
}

case "${1-}" in
    "")           ;;
    --uninstall)  uninstall ;;
    -h|--help)    sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
    *)            die "unknown argument: $1 (try --help)" ;;
esac

require_systemd

[[ -f "$TEMPLATE" ]] || die "missing unit template: $TEMPLATE"

# --- Runtime ----------------------------------------------------------------

# Resolved to an absolute path and baked into the unit: systemd user units get
# a minimal PATH without ~/.bun/bin, so a bare `bun` would fail with 203/EXEC.
BUN="$(command -v bun 2>/dev/null || true)"
[[ -n "$BUN" ]] || die "bun is not on PATH. Install it: https://bun.sh"

# Both values are substituted into the unit with sed and then parsed by
# systemd, so three separate layers can be corrupted by an unlucky path:
#   |        the sed delimiter
#   & and \  sed replacement syntax (& is the whole match)
#   %        a systemd specifier introducer, e.g. %h -- an unknown one makes
#            the unit fail to parse
#   space    systemd splits ExecStart on whitespace, so a space in $BUN would
#            silently become two arguments
# Rejecting is deliberate over escaping: a loud refusal beats rendering a
# subtly broken unit that then restart-loops under Restart=always.
for path in "$REPO_ROOT" "$BUN"; do
    case "$path" in
        *[\|\&\\%[:space:]]*)
            die "path contains a character that would corrupt the unit file
       (one of: | & \\ %% or whitespace): $path" ;;
    esac
done

# The scraper is a workspace dependency resolved through a symlink in
# node_modules; without it the server dies on its first import, which under
# Restart=always is an invisible restart loop.
if [[ ! -e "$SERVER_DIR/node_modules/@youtube-transcript/scraper" ]]; then
    info "Workspace dependencies are missing; running 'bun install'."
    (cd "$REPO_ROOT" && bun install)
fi

[[ -e "$SERVER_DIR/node_modules/@youtube-transcript/scraper" ]] \
    || die "@youtube-transcript/scraper is still unresolved after 'bun install'."

# --- Configuration ----------------------------------------------------------

# Deliberately NOT copying .env.example to .env. The example ships a
# placeholder SERVER_API_KEY, and a .env containing it would make the server
# demand that literal string, silently 401-ing every userscript request. An
# absent .env is a supported configuration (see isAuthorized in src/index.ts),
# so the safe default is to leave it absent and say so.
PORT=3456
if [[ -f "$ENV_FILE" ]]; then
    if grep -qE "^[[:space:]]*SERVER_API_KEY[[:space:]]*=[[:space:]]*${PLACEHOLDER_KEY}[[:space:]]*$" "$ENV_FILE"; then
        die ".env still has the placeholder SERVER_API_KEY ($PLACEHOLDER_KEY).
       The server would require that literal value and reject every request.
       Set a real key, or delete the line to run without authentication."
    fi
    # Tolerates `export PORT=3456`, quotes, and a trailing comment, because
    # the value found here drives the conflict check and the URL printed at
    # the end. Missing a quoted PORT would silently guard the wrong port.
    env_port="$(sed -n -E \
        's/^[[:space:]]*(export[[:space:]]+)?PORT[[:space:]]*=[[:space:]]*"?'"'"'?([0-9]+)'"'"'?"?[[:space:]]*(#.*)?$/\2/p' \
        "$ENV_FILE" | tail -n1)"
    if [[ -n "$env_port" ]]; then
        # Range-check rather than trusting the digits: Bun would reject an
        # out-of-range port at startup, and under Restart=always that is an
        # invisible loop rather than a visible error.
        if (( env_port < 1 || env_port > 65535 )); then
            die "PORT=$env_port in .env is out of range (1-65535)."
        fi
        PORT="$env_port"
    elif grep -qE '^[[:space:]]*(export[[:space:]]+)?PORT[[:space:]]*=' "$ENV_FILE"; then
        die "PORT is set in .env but could not be parsed as a number.
       The installer needs it to check for port conflicts."
    fi
else
    warn "No .env at $REPO_ROOT. Using PORT=$PORT with authentication disabled."
fi

# --- Port conflict ----------------------------------------------------------

# A manually started `bun run dev:server` holding the port would make the
# service fail to bind on every restart, forever, with Restart=always. Refuse
# rather than loop.
if command -v ss >/dev/null 2>&1 && ss -lntH "sport = :$PORT" 2>/dev/null | grep -q .; then
    if ! systemctl --user is-active --quiet "$UNIT_NAME" 2>/dev/null; then
        die "port $PORT is already in use, and not by $UNIT_NAME.
       A leftover 'bun run dev:server'? Stop it first, or the service will
       restart-loop failing to bind."
    fi
fi

# --- Install ----------------------------------------------------------------

mkdir -p "$UNIT_DIR"
sed -e "s|@REPO_ROOT@|$REPO_ROOT|g" -e "s|@BUN@|$BUN|g" "$TEMPLATE" > "$UNIT_PATH"
info "Wrote $UNIT_PATH"

systemctl --user daemon-reload
systemctl --user enable "$UNIT_NAME" >/dev/null
# restart, not 'enable --now': --now won't restart an already-running service,
# so re-running after a template edit would leave the old unit live.
systemctl --user restart "$UNIT_NAME"

# --- Verify -----------------------------------------------------------------

sleep 1
if ! systemctl --user is-active --quiet "$UNIT_NAME"; then
    printf '\n'
    systemctl --user status "$UNIT_NAME" --no-pager --lines=20 || true
    die "$UNIT_NAME failed to start (status above)."
fi

if command -v ss >/dev/null 2>&1 && ! ss -lntH "sport = :$PORT" 2>/dev/null | grep -q .; then
    warn "service is active but nothing is listening on :$PORT yet."
fi

info "${B}$UNIT_NAME is running and enabled at login.${N}"
printf '\n'
printf '  Logs:    journalctl --user -u %s -f\n' "$UNIT_NAME"
printf '  Stop:    systemctl --user stop %s\n' "$UNIT_NAME"
printf '  Remove:  %s/install.sh --uninstall\n' "$REPO_ROOT"
printf '\n'
printf '  Listening on http://localhost:%s/transcript\n' "$PORT"
printf '\n'
printf '%sHacking on the server?%s Stop the service first -- it holds :%s, so\n' "$Y" "$N" "$PORT"
printf "  'bun run dev:server' would fail to bind while it is running.\n"
