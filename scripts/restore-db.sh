#!/usr/bin/env bash
# =============================================================================
# restore-db.sh — CLI Restore Database PostgreSQL Alizzah (VPS Production)
#
# Usage:
#   ./scripts/restore-db.sh <backup_file> [OPTIONS]
#
# Mendukung format:
#   .dump      → custom archive (pg_restore)
#   .sql       → plain SQL (psql)
#   .sql.gz    → plain SQL compressed (zcat | psql)
#
# Options:
#   --env-file PATH    Path ke file .env (default: cari otomatis)
#   --service NAME     Nama service postgres di compose (default: postgres)
#   --target-db NAME   Nama database target (default: dari env DB_NAME)
#   --clean            Drop database objects sebelum restore (pg_restore --clean)
#   --dry-run          List isi backup, tidak restore
#   --help, -h         Tampilkan help
#
# Environment yang dibutuhkan:
#   DB_USER, DB_PASSWORD, DB_NAME
#
# ⚠️  PERINGATAN: Restore akan MENIMPA data yang ada di database target!
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_SERVICE="postgres"
ENV_FILE=""
TARGET_DB=""
CLEAN_MODE=false
DRY_RUN=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

usage() {
    sed -n '2,26p' "$0" | sed 's/^# //'
    exit 0
}

# ─── Parse Args ──────────────────────────────────────────────────────────────
BACKUP_FILE=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --env-file)     ENV_FILE="$2"; shift 2 ;;
        --service)      COMPOSE_SERVICE="$2"; shift 2 ;;
        --target-db)    TARGET_DB="$2"; shift 2 ;;
        --clean)        CLEAN_MODE=true; shift ;;
        --dry-run)      DRY_RUN=true; shift ;;
        --help|-h)      usage ;;
        -*)             log_error "Unknown option: $1"; usage ;;
        *)              BACKUP_FILE="$1"; shift ;;
    esac
done

if [[ -z "$BACKUP_FILE" ]]; then
    log_error "Backup file harus diberikan."
    echo "Usage: $0 <backup_file> [OPTIONS]" >&2
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    log_error "File tidak ditemukan: $BACKUP_FILE"
    exit 1
fi

# ─── Deteksi format dari ekstensi ────────────────────────────────────────────
BASENAME=$(basename "$BACKUP_FILE")
case "$BASENAME" in
    *.dump)     FILE_FORMAT="custom" ;;
    *.sql.gz)   FILE_FORMAT="sql-gz" ;;
    *.sql)      FILE_FORMAT="sql" ;;
    *)
        log_error "Tidak bisa mendeteksi format dari ekstensi: $BASENAME"
        log_error "Ekstensi yang didukung: .dump, .sql, .sql.gz"
        exit 1
        ;;
esac

# ─── Load Env ────────────────────────────────────────────────────────────────
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
    source "$ENV_FILE"
    set +a
fi

for VAR in DB_USER DB_PASSWORD DB_NAME; do
    if [[ -z "${!VAR:-}" ]]; then
        log_error "Environment variable '$VAR' tidak ditemukan."
        exit 1
    fi
done

DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
DB_NAME="${DB_NAME}"
TARGET_DB="${TARGET_DB:-$DB_NAME}"

# ─── Pre-flight ──────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    log_error "Docker tidak ditemukan."
    exit 1
fi

if docker compose version &>/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    log_error "docker compose tidak ditemukan."
    exit 1
fi

# ─── Dry Run ─────────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
    case "$FILE_FORMAT" in
        custom)
            log_info "Dry run: menampilkan isi backup (pg_restore -l)..."
            echo ""
            $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T \
                -e PGPASSWORD="$DB_PASSWORD" \
                "$COMPOSE_SERVICE" \
                pg_restore -l "/dev/stdin" < "$BACKUP_FILE"
            ;;
        sql-gz)
            log_info "Dry run: menampilkan 50 baris pertama SQL (zcat | head)..."
            echo ""
            zcat "$BACKUP_FILE" | head -50
            echo ""
            echo -e "${YELLOW}... (gunakan 'zcat $BACKUP_FILE | less' untuk melihat semua)${NC}"
            ;;
        sql)
            log_info "Dry run: menampilkan 50 baris pertama SQL..."
            echo ""
            head -50 "$BACKUP_FILE"
            echo ""
            echo -e "${YELLOW}... (gunakan 'less $BACKUP_FILE' untuk melihat semua)${NC}"
            ;;
    esac
    exit 0
fi

# ─── Konfirmasi ──────────────────────────────────────────────────────────────
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
FILE_SIZE_HUMAN=$(numfmt --to=iec --suffix=B "$FILE_SIZE" 2>/dev/null || echo "${FILE_SIZE} bytes")

echo ""
echo -e "${RED}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  PERINGATAN: RESTORE DATABASE                              ║${NC}"
echo -e "${RED}║                                                                ║${NC}"
echo -e "${RED}║  Ini akan MENIMPA data di database '${TARGET_DB}'.               ║${NC}"
echo -e "${RED}║  Pastikan Anda sudah punya backup terbaru!                     ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Source     : ${BACKUP_FILE}"
echo -e "  Size       : ${FILE_SIZE_HUMAN}"
echo -e "  Format     : ${FILE_FORMAT}"
echo -e "  Target DB  : ${TARGET_DB}"
echo -e "  Clean mode : ${CLEAN_MODE}"
echo ""
read -r -p "  Ketik 'yes' untuk melanjutkan restore: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
    log_info "Restore dibatalkan."
    exit 0
fi

# ─── Restore ─────────────────────────────────────────────────────────────────
log_info "Memulai restore ke database '${TARGET_DB}'..."
START_TIME=$(date +%s)

case "$FILE_FORMAT" in
    custom)
        RESTORE_FLAGS="-U ${DB_USER} -d ${TARGET_DB}"
        if [[ "$CLEAN_MODE" == true ]]; then
            RESTORE_FLAGS="$RESTORE_FLAGS --clean --if-exists"
        fi
        $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T \
            -e PGPASSWORD="$DB_PASSWORD" \
            "$COMPOSE_SERVICE" \
            pg_restore $RESTORE_FLAGS "/dev/stdin" < "$BACKUP_FILE"
        ;;
    sql-gz)
        zcat "$BACKUP_FILE" | $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T \
            -e PGPASSWORD="$DB_PASSWORD" \
            "$COMPOSE_SERVICE" \
            psql -U "$DB_USER" -d "$TARGET_DB"
        ;;
    sql)
        $DOCKER_COMPOSE -f "$PROJECT_DIR/docker-compose.yml" exec -T \
            -e PGPASSWORD="$DB_PASSWORD" \
            "$COMPOSE_SERVICE" \
            psql -U "$DB_USER" -d "$TARGET_DB" < "$BACKUP_FILE"
        ;;
esac

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

log_ok "Restore selesai (${ELAPSED}s)."
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Database '${TARGET_DB}' berhasil direstore dari:${NC}"
echo -e "${GREEN}  ${BACKUP_FILE}${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════════${NC}"
