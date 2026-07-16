#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — CLI Backup Database PostgreSQL Alizzah (VPS Production)
#
# Usage:
#   ./scripts/backup-db.sh [OPTIONS]
#
# Options:
#   --format FMT    Format backup: custom (default, .dump) atau plain (.sql)
#   --dir PATH      Direktori output backup (default: ~/backups/alizzah-app)
#   --retention N   Hari retensi file backup (default: 7)
#   --env-file PATH Path ke file .env (default: cari otomatis)
#   --no-verify     Skip validasi (pg_restore -l untuk custom; syntax check untuk plain)
#   --no-compress   Khusus plain: jangan compress output SQL dengan gzip
#   --service NAME  Nama service postgres di compose (default: postgres)
#   --help, -h      Tampilkan help
#
# Environment yang dibutuhkan (dari .env atau environment OS):
#   DB_USER          PostgreSQL user
#   DB_PASSWORD      PostgreSQL password
#   DB_NAME          Nama database
#   DB_HOST          Host database (digunakan untuk info log saja)
#   DB_PORT          Port database (digunakan untuk info log saja)
#
# Dependency host:
#   - docker compose (untuk exec ke container postgres)
#   - Container postgres harus running
#
# Format output:
#   custom  → .dump  (pg_dump -Fc)  compressed archive, restore via pg_restore
#   plain   → .sql   (pg_dump -Fp)  plain SQL teks, bisa di-import via psql
#   plain + no-compress → .sql langsung; default plain di-gzip → .sql.gz
# =============================================================================

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${HOME}/backups/alizzah-app"
RETENTION_DAYS=7
NO_VERIFY=false
COMPOSE_SERVICE="postgres"
ENV_FILE=""
FORMAT="custom"       # custom | plain
NO_COMPRESS=false     # hanya relevan untuk format plain
TIMESTAMP_WIB=$(TZ='Asia/Jakarta' date '+%Y-%m-%d_%H-%M_WIB')
ERROR_LOG="backup_errors.log"
LOG_FILE=""  # di-set setelah BACKUP_DIR final

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%Y-%m-%d %H:%M:%S')  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%Y-%m-%d %H:%M:%S')  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%Y-%m-%d %H:%M:%S')  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S')  $*" >&2; }

# ─── Help ────────────────────────────────────────────────────────────────────
usage() {
    sed -n '2,36p' "$0" | sed 's/^# //'
    exit 0
}

# ─── Parse Arguments ─────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --format)       FORMAT="$2"; shift 2 ;;
        --dir)          BACKUP_DIR="$2"; shift 2 ;;
        --retention)    RETENTION_DAYS="$2"; shift 2 ;;
        --env-file)     ENV_FILE="$2"; shift 2 ;;
        --service)      COMPOSE_SERVICE="$2"; shift 2 ;;
        --no-verify)    NO_VERIFY=true; shift ;;
        --no-compress)  NO_COMPRESS=true; shift ;;
        --help|-h)      usage ;;
        *)              log_error "Unknown option: $1"; usage ;;
    esac
done

# ─── Validate Format ─────────────────────────────────────────────────────────
case "$FORMAT" in
    custom|c)   FORMAT="custom" ;;
    plain|sql|p) FORMAT="plain" ;;
    *)
        log_error "Format tidak dikenal: '$FORMAT'. Gunakan 'custom' atau 'plain'."
        exit 1
        ;;
esac

# ─── Tentukan ekstensi & nama file ───────────────────────────────────────────
if [[ "$FORMAT" == "custom" ]]; then
    BACKUP_FILENAME="alizzah_backup_${TIMESTAMP_WIB}.dump"
    PG_DUMP_FLAGS="-Fc"
    FORMAT_LABEL="custom (pg_dump -Fc)"
    GLOB_PATTERN="alizzah_backup_*.dump"
elif [[ "$NO_COMPRESS" == true ]]; then
    BACKUP_FILENAME="alizzah_backup_${TIMESTAMP_WIB}.sql"
    PG_DUMP_FLAGS="-Fp"
    FORMAT_LABEL="plain SQL (.sql)"
    GLOB_PATTERN="alizzah_backup_*.sql"
else
    # plain + compressed (default: gzip setelah dump)
    BACKUP_FILENAME="alizzah_backup_${TIMESTAMP_WIB}.sql.gz"
    PG_DUMP_FLAGS="-Fp"
    FORMAT_LABEL="plain SQL compressed (.sql.gz)"
    GLOB_PATTERN="alizzah_backup_*.sql.gz"
fi

# ─── Load Environment ────────────────────────────────────────────────────────
if [[ -z "$ENV_FILE" ]]; then
    if [[ -f "$PROJECT_DIR/.env" ]]; then
        ENV_FILE="$PROJECT_DIR/.env"
    elif [[ -f "$PROJECT_DIR/.env.production" ]]; then
        ENV_FILE="$PROJECT_DIR/.env.production"
    fi
fi

if [[ -n "$ENV_FILE" ]] && [[ -f "$ENV_FILE" ]]; then
    log_info "Loading environment dari: $ENV_FILE"
    set -a
    # shellcheck source=/dev/null
    source "$ENV_FILE"
    set +a
else
    log_info "Tidak ada .env file ditemukan, menggunakan environment OS"
fi

# ─── Validate Required Env ───────────────────────────────────────────────────
MISSING=()
for VAR in DB_USER DB_PASSWORD DB_NAME; do
    if [[ -z "${!VAR:-}" ]]; then
        MISSING+=("$VAR")
    fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
    log_error "Environment variable berikut tidak ditemukan: ${MISSING[*]}"
    log_error "Pastikan file .env ada di root project atau export manual"
    exit 1
fi

DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="${DB_NAME}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"

log_info "Target DB : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
log_info "Format    : ${FORMAT_LABEL}"
log_info "Output    : ${BACKUP_DIR}/${BACKUP_FILENAME}"

# ─── Ensure backup directory ─────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

LOG_FILE="${BACKUP_DIR}/${ERROR_LOG}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
TMP_PATH="${BACKUP_PATH}.tmp"

# ─── Pre-flight Checks ───────────────────────────────────────────────────────

# Check docker
if ! command -v docker &>/dev/null; then
    log_error "Docker tidak ditemukan di PATH. Pastikan Docker terinstall."
    exit 1
fi

# Check docker compose (v2 = docker compose, v1 = docker-compose)
if docker compose version &>/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    log_error "docker compose tidak ditemukan. Pastikan Docker Compose terinstall."
    exit 1
fi

# Check container running
CONTAINER_CHECK=$($DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" ps --status running "$COMPOSE_SERVICE" 2>/dev/null || true)
if [[ -z "$CONTAINER_CHECK" ]] || ! echo "$CONTAINER_CHECK" | grep -q "$COMPOSE_SERVICE"; then
    log_error "Container '$COMPOSE_SERVICE' tidak running."
    log_error "Jalankan: cd $PROJECT_DIR && docker compose up -d postgres"
    exit 1
fi
log_ok "Container '$COMPOSE_SERVICE' running."

# Check pg_dump di dalam container
if ! $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T "$COMPOSE_SERVICE" which pg_dump &>/dev/null; then
    log_error "Binary pg_dump tidak ditemukan di dalam container '$COMPOSE_SERVICE'."
    log_error "Pastikan image postgres:16-alpine digunakan (pg_dump sudah termasuk)."
    exit 1
fi
log_ok "pg_dump tersedia di container."

# ─── Execute Backup ──────────────────────────────────────────────────────────
log_info "Memulai backup..."
log_info "pg_dump ${PG_DUMP_FLAGS} -U ${DB_USER} -d ${DB_NAME}"

START_TIME=$(date +%s)

# Jalankan pg_dump di dalam container, output diteruskan ke pipeline
# Custom format → langsung ke file, plain format → pipe ke gzip (optional)
PGDUMP_CMD="$DOCKER_COMPOSE -f $PROJECT_DIR/docker-compose.yml exec -T -e PGPASSWORD=$DB_PASSWORD $COMPOSE_SERVICE pg_dump ${PG_DUMP_FLAGS} -U ${DB_USER} -d ${DB_NAME}"

if [[ "$FORMAT" == "custom" ]]; then
    # Custom format: output langsung ke temporary file
    if eval "$PGDUMP_CMD" > "$TMP_PATH" 2>"${TMP_PATH}.err"; then
        BACKUP_OK=true
    else
        BACKUP_OK=false
    fi
elif [[ "$NO_COMPRESS" == true ]]; then
    # Plain SQL tanpa kompresi: output langsung ke file
    if eval "$PGDUMP_CMD" > "$TMP_PATH" 2>"${TMP_PATH}.err"; then
        BACKUP_OK=true
    else
        BACKUP_OK=false
    fi
else
    # Plain SQL + gzip: pipe output pg_dump ke gzip
    if eval "$PGDUMP_CMD" 2>"${TMP_PATH}.err" | gzip > "$TMP_PATH"; then
        BACKUP_OK=true
    else
        BACKUP_OK=false
    fi
fi

if [[ "$BACKUP_OK" == true ]]; then

    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))

    # Periksa stderr output (pg_dump menulis info ke stderr)
    if [[ -s "${TMP_PATH}.err" ]]; then
        log_warn "pg_dump stderr output:"
        while read -r line; do log_warn "  $line"; done < "${TMP_PATH}.err"
    fi
    rm -f "${TMP_PATH}.err"

    # ─── Atomic rename ───────────────────────────────────────────────────────
    mv "$TMP_PATH" "$BACKUP_PATH"
    FILE_SIZE=$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH" 2>/dev/null)
    FILE_SIZE_HUMAN=$(numfmt --to=iec --suffix=B "$FILE_SIZE" 2>/dev/null || echo "${FILE_SIZE} bytes")

    log_ok "Backup selesai (${ELAPSED}s): ${BACKUP_PATH} (${FILE_SIZE_HUMAN})"

    # ─── Validate ────────────────────────────────────────────────────────────
    if [[ "$FILE_SIZE" -eq 0 ]]; then
        log_error "VALIDASI GAGAL: File backup kosong (0 bytes)."
        rm -f "$BACKUP_PATH"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] VALIDASI-GAGAL ${BACKUP_FILENAME} - file kosong" >> "$LOG_FILE"
        exit 1
    fi

    if [[ "$NO_VERIFY" == false ]]; then
        if [[ "$FORMAT" == "custom" ]]; then
            # Validasi custom format: pg_restore -l (list TOC)
            log_info "Memvalidasi backup (pg_restore -l)..."
            if $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T \
                -e PGPASSWORD="$DB_PASSWORD" \
                "$COMPOSE_SERVICE" \
                pg_restore -l "/dev/stdin" < "$BACKUP_PATH" &>/dev/null; then
                log_ok "Validasi berhasil: file backup valid."
            else
                log_error "VALIDASI GAGAL: pg_restore -l tidak bisa membaca backup."
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] VALIDASI-GAGAL ${BACKUP_FILENAME} - TOC unreadable" >> "$LOG_FILE"
                exit 1
            fi
        else
            # Validasi plain SQL: cek header & syntax dasar
            log_info "Memvalidasi backup (SQL syntax check)..."
            VALIDATE_FILE="$BACKUP_PATH"
            CAT_CMD="cat"
            if [[ "$NO_COMPRESS" == false ]]; then
                CAT_CMD="zcat"
            fi

            # Cek file diawali dengan SQL comment/statement
            HEADER=$($CAT_CMD "$VALIDATE_FILE" | head -1)
            if echo "$HEADER" | grep -qE '^--|^$|^SET |^CREATE |^ALTER |^COPY |^SELECT pg_catalog'; then
                log_ok "Validasi berhasil: file SQL valid (header terdeteksi)."
            else
                log_error "VALIDASI GAGAL: File tidak tampak seperti SQL dump."
                log_error "Header: ${HEADER:0:120}"
                echo "[$(date '+%Y-%m-%d %H:%M:%S')] VALIDASI-GAGAL ${BACKUP_FILENAME} - bukan SQL dump" >> "$LOG_FILE"
                exit 1
            fi
        fi
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK ${BACKUP_FILENAME} size=${FILE_SIZE}" >> "$LOG_FILE"

else
    # Backup gagal
    log_error "Backup GAGAL!"
    if [[ -s "${TMP_PATH}.err" ]]; then
        log_error "Error detail:"
        while read -r line; do log_error "  $line"; done < "${TMP_PATH}.err"
        cat "${TMP_PATH}.err" >> "$LOG_FILE"
    fi
    rm -f "$TMP_PATH" "${TMP_PATH}.err"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] GAGAL ${BACKUP_FILENAME}" >> "$LOG_FILE"
    exit 1
fi

# ─── Retention Cleanup ───────────────────────────────────────────────────────
log_info "Membersihkan file backup > ${RETENTION_DAYS} hari..."

DELETED_COUNT=0
while IFS= read -r -d '' OLD_FILE; do
    log_info "Menghapus: $(basename "$OLD_FILE")"
    rm -f "$OLD_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] RETENSI-HAPUS $(basename "$OLD_FILE")" >> "$LOG_FILE"
    ((DELETED_COUNT++)) || true
done < <(find "$BACKUP_DIR" -name "alizzah_backup_*" \( -name "*.dump" -o -name "*.sql" -o -name "*.sql.gz" \) -type f -mtime "+${RETENTION_DAYS}" -print0 2>/dev/null || true)

if [[ "$DELETED_COUNT" -gt 0 ]]; then
    log_ok "Dihapus ${DELETED_COUNT} file lama."
else
    log_info "Tidak ada file lama yang perlu dihapus."
fi

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Backup berhasil!${NC}"
echo ""
echo -e "  File    : ${BACKUP_PATH}"
echo -e "  Size    : ${FILE_SIZE_HUMAN}"
echo -e "  DB      : ${DB_NAME}"
echo -e "  Format  : ${FORMAT_LABEL}"
echo ""

if [[ "$FORMAT" == "custom" ]]; then
    echo -e "  ${BLUE}Restore:${NC}  ./scripts/restore-db.sh ${BACKUP_PATH}"
    echo -e "  ${BLUE}Atau:${NC}     docker compose exec -T postgres \\"
    echo -e "             pg_restore -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_PATH}"
    echo ""
    echo -e "  ${BLUE}Ke SQL:${NC}   docker compose exec -T postgres \\"
    echo -e "             pg_restore -f /tmp/backup.sql ${BACKUP_PATH}"
elif [[ "$NO_COMPRESS" == false ]]; then
    # .sql.gz
    echo -e "  ${BLUE}Import:${NC}   zcat ${BACKUP_PATH} | docker compose exec -T postgres \\"
    echo -e "             psql -U ${DB_USER} -d ${DB_NAME}"
    echo ""
    echo -e "  ${BLUE}Lihat:${NC}    zcat ${BACKUP_PATH} | less"
    echo ""
    echo -e "  ${BLUE}Ekstrak:${NC}  gunzip -k ${BACKUP_PATH}  # → .sql"
else
    # .sql (uncompressed)
    echo -e "  ${BLUE}Import:${NC}   docker compose exec -T postgres \\"
    echo -e "             psql -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_PATH}"
    echo ""
    echo -e "  ${BLUE}Lihat:${NC}    less ${BACKUP_PATH}"
fi
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
