package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/robfig/cron/v3"
)

// ─── Errors ────────────────────────────────────────────────────────────────────

var (
	ErrEmptyBackup    = errors.New("backup file is empty")
	ErrVerifyFailed   = errors.New("backup verification failed")
	ErrPgDumpNotFound = errors.New("pg_dump not found in $PATH")
)

// ─── Config ────────────────────────────────────────────────────────────────────

// BackupConfig holds all configuration for the backup service.
type BackupConfig struct {
	BackupDir     string // e.g. ~/backups/alizzah-app/
	DBUser        string
	DBPassword    string
	DBHost        string
	DBPort        string
	DBName        string
	RetentionDays int // default 7
}

// BackupResult is returned by Create() after a successful backup.
type BackupResult struct {
	Filename  string `json:"filename"`
	Size      int64  `json:"size_bytes"`
	SizeHuman string `json:"size_human"`
	Timestamp string `json:"timestamp"`
	Path      string `json:"path"`
}

// ─── Service ───────────────────────────────────────────────────────────────────

// BackupService handles database backup creation, verification, cleanup,
// and scheduling. No database model; filesystem is the source of truth.
type BackupService struct {
	config BackupConfig
	mu     sync.Mutex // guards concurrent Create calls
	loc    *time.Location
}

// NewBackupService creates a BackupService with the given config.
func NewBackupService(cfg BackupConfig) *BackupService {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	return &BackupService{config: cfg, loc: loc}
}

// ─── Dependency Check ──────────────────────────────────────────────────────────

// CheckDependencies verifies that pg_dump and pg_restore are available in $PATH.
// Returns an error if either is missing — caller should fatal exit.
func (s *BackupService) CheckDependencies() error {
	for _, bin := range []string{"pg_dump", "pg_restore"} {
		if _, err := exec.LookPath(bin); err != nil {
			return fmt.Errorf("%s not found in $PATH: %w", bin, ErrPgDumpNotFound)
		}
	}
	return nil
}

// ─── Create ────────────────────────────────────────────────────────────────────

// Create runs a synchronous pg_dump backup and returns the result.
// Steps: ensure backup dir → pg_dump -Fc to tmp file → atomic rename → verify.
func (s *BackupService) Create(ctx context.Context) (*BackupResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure backup directory exists
	if err := os.MkdirAll(s.config.BackupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup dir %s: %w", s.config.BackupDir, err)
	}

	// Generate filename with WIB timestamp
	now := time.Now().In(s.loc)
	filename := fmt.Sprintf("alizzah_backup_%s.dump", now.Format("2006-01-02_15-04_WIB"))
	tmpPath := filepath.Join(s.config.BackupDir, filename+".tmp")
	finalPath := filepath.Join(s.config.BackupDir, filename)

	// Build pg_dump command
	args := []string{
		"-Fc", // custom format (compressed by default)
		"-U", s.config.DBUser,
		"-h", s.config.DBHost,
		"-p", s.config.DBPort,
		"-d", s.config.DBName,
	}

	cmd := exec.CommandContext(ctx, "pg_dump", args...)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)

	// Open temp file for output
	tmpFile, err := os.Create(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create temp file %s: %w", tmpPath, err)
	}
	defer tmpFile.Close()

	cmd.Stdout = tmpFile

	// Capture stderr for diagnostics
	var stderr strings.Builder
	cmd.Stderr = &stderr

	startTime := time.Now()

	if err := cmd.Run(); err != nil {
		tmpFile.Close()
		os.Remove(tmpPath)
		log.Printf("[backup] pg_dump failed: %v, stderr: %s", err, stderr.String())
		s.logError("GAGAL", filename, fmt.Errorf("pg_dump: %w, stderr: %s", err, stderr.String()))
		return nil, fmt.Errorf("pg_dump failed: %w", err)
	}

	// Log any stderr output (pg_dump writes info to stderr)
	if stderr.Len() > 0 {
		log.Printf("[backup] pg_dump stderr: %s", strings.TrimSpace(stderr.String()))
	}

	tmpFile.Close()

	// Atomic rename: tmp → final
	if err := os.Rename(tmpPath, finalPath); err != nil {
		os.Remove(tmpPath)
		return nil, fmt.Errorf("failed to rename temp file: %w", err)
	}

	elapsed := time.Since(startTime)

	// Verify the backup
	if err := s.Verify(finalPath); err != nil {
		os.Remove(finalPath)
		s.logError("VALIDASI-GAGAL", filename, err)
		return nil, fmt.Errorf("backup verification failed: %w", err)
	}

	// Get file info
	info, _ := os.Stat(finalPath)
	size := info.Size()

	result := &BackupResult{
		Filename:  filename,
		Size:      size,
		SizeHuman: formatBytes(size),
		Timestamp: now.Format(time.RFC3339),
		Path:      finalPath,
	}

	log.Printf("[backup] OK: %s (%s, %v)", filename, result.SizeHuman, elapsed.Round(time.Millisecond))
	s.logError("OK", filename, nil)

	return result, nil
}

// ─── Verify ────────────────────────────────────────────────────────────────────

// Verify checks a backup file:
// 1. File size > 0
// 2. pg_restore -l can read the TOC (validates custom format integrity)
func (s *BackupService) Verify(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("cannot stat backup file: %w", err)
	}
	if info.Size() == 0 {
		return ErrEmptyBackup
	}

	cmd := exec.Command("pg_restore", "-l", path)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: pg_restore -l failed: %s", ErrVerifyFailed, string(output))
	}

	return nil
}

// ─── LastBackupTime ────────────────────────────────────────────────────────────

// LastBackupTime returns the modification time of the most recent backup file.
// Used for debounce logic in CreateAsync.
func (s *BackupService) LastBackupTime() (time.Time, error) {
	pattern := filepath.Join(s.config.BackupDir, "alizzah_backup_*.dump")
	matches, err := filepath.Glob(pattern)
	if err != nil || len(matches) == 0 {
		return time.Time{}, fmt.Errorf("no backup files found in %s", s.config.BackupDir)
	}

	var latest time.Time
	for _, m := range matches {
		info, err := os.Stat(m)
		if err != nil {
			continue
		}
		if info.ModTime().After(latest) {
			latest = info.ModTime()
		}
	}
	return latest, nil
}

// ─── CreateAsync ───────────────────────────────────────────────────────────────

// CreateAsync runs a backup in a goroutine with a 5-minute debounce.
// If the last backup was less than 5 minutes ago, it skips silently.
// Intended for fire-and-forget triggers (e.g., on logout).
func (s *BackupService) CreateAsync(ctx context.Context) {
	lastTime, err := s.LastBackupTime()
	if err == nil && time.Since(lastTime) < 5*time.Minute {
		log.Printf("[backup] Debounce: skipping, last backup was %v ago",
			time.Since(lastTime).Round(time.Second))
		return
	}

	log.Printf("[backup] Async backup starting...")
	go func() {
		if _, err := s.Create(ctx); err != nil {
			log.Printf("[backup] Async backup FAILED: %v", err)
		}
	}()
}

// ─── Cleanup ───────────────────────────────────────────────────────────────────

// Cleanup removes backup files older than RetentionDays.
func (s *BackupService) Cleanup(ctx context.Context) error {
	cutoff := time.Now().AddDate(0, 0, -s.config.RetentionDays)

	entries, err := os.ReadDir(s.config.BackupDir)
	if err != nil {
		return fmt.Errorf("failed to read backup dir: %w", err)
	}

	var deleted int
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if !strings.HasPrefix(entry.Name(), "alizzah_backup_") || !strings.HasSuffix(entry.Name(), ".dump") {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			path := filepath.Join(s.config.BackupDir, entry.Name())
			if err := os.Remove(path); err != nil {
				log.Printf("[backup] Cleanup: failed to remove %s: %v", entry.Name(), err)
			} else {
				log.Printf("[backup] Cleanup: removed %s (age: %v)", entry.Name(),
					time.Since(info.ModTime()).Round(time.Hour))
				deleted++
			}
		}
	}

	if deleted > 0 {
		log.Printf("[backup] Cleanup: removed %d old backup(s)", deleted)
	}
	return nil
}

// ─── Scheduler ─────────────────────────────────────────────────────────────────

// StartScheduler starts a cron job that runs a backup daily at 16:00 UTC (23:00 WIB).
// This method blocks; call it via a goroutine.
func (s *BackupService) StartScheduler() {
	c := cron.New(cron.WithLocation(time.UTC))
	c.AddFunc("0 16 * * *", func() {
		log.Printf("[backup] Scheduled backup (23:00 WIB) starting...")
		if _, err := s.Create(context.Background()); err != nil {
			log.Printf("[backup] Scheduled backup FAILED: %v", err)
		}
	})
	c.Start()
	log.Printf("[backup] Scheduler started (daily at 16:00 UTC / 23:00 WIB)")

	// Block forever — caller must use goroutine
	select {}
}

// ─── WriteRestoreInstructions ──────────────────────────────────────────────────

// WriteRestoreInstructions writes a README.md with restore guidance to the backup directory.
func (s *BackupService) WriteRestoreInstructions() error {
	content := `# Restore Backup Database Alizzah

## Dari file .dump (custom format)
pg_restore -U <user> -h <host> -p <port> -d <dbname> alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump

## Konversi .dump ke .sql
pg_restore -f backup.sql alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump

## Via Docker Compose (VPS Production)
docker compose exec -T postgres pg_restore -U <user> -d <dbname> < alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump

## Menggunakan restore script
Gunakan scripts/restore-db.sh di root proyek:
  cd /path/to/alizzah
  ./scripts/restore-db.sh <backup_file>
`
	path := filepath.Join(s.config.BackupDir, "README.md")
	return os.WriteFile(path, []byte(content), 0644)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// logError appends a log entry to backup_errors.log in the backup directory.
func (s *BackupService) logError(status, filename string, err error) {
	logPath := filepath.Join(s.config.BackupDir, "backup_errors.log")
	entry := fmt.Sprintf("[%s] %s %s", time.Now().Format("2006-01-02 15:04:05"), status, filename)
	if err != nil {
		entry += fmt.Sprintf(" error=%v", err)
	}
	entry += "\n"

	f, openErr := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if openErr != nil {
		log.Printf("[backup] Failed to write error log: %v", openErr)
		return
	}
	defer f.Close()
	f.WriteString(entry)
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
