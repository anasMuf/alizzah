package service

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
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
	ErrInvalidFormat  = errors.New("invalid backup format")
	ErrFileNotFound   = errors.New("backup file not found")
	ErrPathTraversal  = errors.New("path traversal detected")
	ErrBackupDisabled = errors.New("backup is disabled (set BACKUP_ENABLED=true)")
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
	RetentionDays int  // default 7
	Enabled       bool // must be true to run backups (safeguard for dev)
}

// BackupResult is returned by Create() after a successful backup.
type BackupResult struct {
	Filename  string `json:"filename"`
	Size      int64  `json:"size_bytes"`
	SizeHuman string `json:"size_human"`
	Timestamp string `json:"timestamp"`
	Path      string `json:"path"`
	Format    string `json:"format"`
}

// BackupFileInfo represents a backup file in the filesystem listing.
type BackupFileInfo struct {
	Filename  string `json:"filename"`
	Size      int64  `json:"size_bytes"`
	SizeHuman string `json:"size_human"`
	Timestamp string `json:"timestamp"`
	Format    string `json:"format"` // "dump" / "sql" / "sql-compat"
}

// TableInfo represents a table/schema entry found in a backup file preview.
type TableInfo struct {
	Name   string `json:"name"`   // table or schema name
	Schema string `json:"schema"` // schema (public, etc.)
	Type   string `json:"type"`   // TABLE, SEQUENCE, FUNCTION, etc.
}

// RestorePreview holds the parsed metadata from a backup file.
type RestorePreview struct {
	Filename string      `json:"filename"`
	Format   string      `json:"format"`
	Size     int64       `json:"size_bytes"`
	Tables   []TableInfo `json:"tables"`
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
func (s *BackupService) CheckDependencies() error {
	for _, bin := range []string{"pg_dump", "pg_restore"} {
		if _, err := exec.LookPath(bin); err != nil {
			return fmt.Errorf("%s not found in $PATH: %w", bin, ErrPgDumpNotFound)
		}
	}
	return nil
}

// ─── Create ────────────────────────────────────────────────────────────────────

// Create runs a synchronous pg_dump backup with the given format.
// Format: "dump" (custom, -Fc), "sql" (plain, -Fp), "sql-compat" (plain + remove \restrict/\unrestrict).
// Empty format defaults to "dump" for backward compatibility.
func (s *BackupService) Create(ctx context.Context, format string) (*BackupResult, error) {
	if !s.config.Enabled {
		return nil, ErrBackupDisabled
	}
	if format == "" {
		format = "dump"
	}
	if format != "dump" && format != "sql" && format != "sql-compat" {
		return nil, fmt.Errorf("%w: %s (valid: dump, sql, sql-compat)", ErrInvalidFormat, format)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Ensure backup directory exists
	if err := os.MkdirAll(s.config.BackupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup dir %s: %w", s.config.BackupDir, err)
	}

	// Generate filename with WIB timestamp
	now := time.Now().In(s.loc)
	ext := ".dump"
	if format == "sql" || format == "sql-compat" {
		ext = ".sql"
	}
	filename := fmt.Sprintf("alizzah_backup_%s%s", now.Format("2006-01-02_15-04_WIB"), ext)
	tmpPath := filepath.Join(s.config.BackupDir, filename+".tmp")
	finalPath := filepath.Join(s.config.BackupDir, filename)

	// Build pg_dump command
	pgDumpFlag := "-Fc"
	if format == "sql" || format == "sql-compat" {
		pgDumpFlag = "-Fp"
	}

	args := []string{
		pgDumpFlag,
		"-U", s.config.DBUser,
		"-h", s.config.DBHost,
		"-p", s.config.DBPort,
		"-d", s.config.DBName,
	}

	cmd := exec.CommandContext(ctx, "pg_dump", args...)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)

	// Capture stderr for diagnostics
	var stderr strings.Builder
	cmd.Stderr = &stderr

	startTime := time.Now()

	var writeErr error

	if format == "sql-compat" {
		// Pipe output through compat filter (remove \restrict / \unrestrict)
		writeErr = s.runWithCompatFilter(cmd, tmpPath)
	} else {
		// Direct write to temp file
		writeErr = s.runDirect(cmd, tmpPath)
	}

	if writeErr != nil {
		os.Remove(tmpPath)
		log.Printf("[backup] pg_dump failed: %v, stderr: %s", writeErr, stderr.String())
		s.logError("GAGAL", filename, fmt.Errorf("pg_dump: %w, stderr: %s", writeErr, stderr.String()))
		return nil, fmt.Errorf("pg_dump failed: %w", writeErr)
	}

	// Log any stderr output
	if stderr.Len() > 0 {
		log.Printf("[backup] pg_dump stderr: %s", strings.TrimSpace(stderr.String()))
	}

	// Atomic rename: tmp → final
	if err := os.Rename(tmpPath, finalPath); err != nil {
		os.Remove(tmpPath)
		return nil, fmt.Errorf("failed to rename temp file: %w", err)
	}

	elapsed := time.Since(startTime)

	// Verify the backup
	if err := s.verifyFormat(finalPath, format); err != nil {
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
		Format:    format,
	}

	log.Printf("[backup] OK: %s (%s, %v)", filename, result.SizeHuman, elapsed.Round(time.Millisecond))
	s.logError("OK", filename, nil)

	return result, nil
}

// runDirect writes pg_dump stdout directly to a file.
func (s *BackupService) runDirect(cmd *exec.Cmd, tmpPath string) error {
	tmpFile, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tmpFile.Close()

	cmd.Stdout = tmpFile
	if err := cmd.Run(); err != nil {
		tmpFile.Close()
		return err
	}
	return tmpFile.Close()
}

// runWithCompatFilter pipes pg_dump stdout through a filter that removes
// \restrict and \unrestrict lines, then writes to the temp file.
func (s *BackupService) runWithCompatFilter(cmd *exec.Cmd, tmpPath string) error {
	tmpFile, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tmpFile.Close()

	pipe, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	if err := s.filterCompatLines(pipe, tmpFile); err != nil {
		return err
	}
	return cmd.Wait()
}

// filterCompatLines menyalin baris dari in ke out sambil membuang baris
// \restrict / \unrestrict (pattern dari shell script backup-db.sh).
//
// Dipakai bufio.Reader.ReadString (BUKAN bufio.Scanner) karena Scanner punya
// batas token 64KB (bufio.MaxScanTokenSize) — baris COPY > 64KB (nilai kolom
// besar, mis. JSON schedule) membuat Scanner berhenti dengan ErrTooLong, pipe
// berhenti dibaca, dan pg_dump macet menunggu pipe → backup gantung selamanya.
func (s *BackupService) filterCompatLines(in io.Reader, out io.Writer) error {
	// Pattern dari shell script backup-db.sh: hapus baris \restrict / \unrestrict
	reCompat := regexp.MustCompile(`^\\restrict|^\\unrestrict`)

	reader := bufio.NewReader(in)
	writer := bufio.NewWriter(out)
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			content := strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
			if !reCompat.MatchString(content) {
				fmt.Fprintln(writer, content)
			}
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}
	}
	return writer.Flush()
}

// ─── Verify ────────────────────────────────────────────────────────────────────

// Verify checks a backup file (backward compatible — tries pg_restore -l first).
// Deprecated: use verifyFormat for format-specific validation.
func (s *BackupService) Verify(path string) error {
	return s.verifyFormat(path, "dump")
}

// verifyFormat validates a backup file based on its format:
// - dump: pg_restore -l (list TOC) + file size > 0
// - sql / sql-compat: header regex check + file size > 0
func (s *BackupService) verifyFormat(path string, format string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("cannot stat backup file: %w", err)
	}
	if info.Size() == 0 {
		return ErrEmptyBackup
	}

	if format == "dump" {
		// Validate custom format: pg_restore -l
		cmd := exec.Command("pg_restore", "-l", path)
		cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("%w: pg_restore -l failed: %s", ErrVerifyFailed, string(output))
		}
		return nil
	}

	// Validate plain SQL: check header (inspired by backup-db.sh line 283)
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("cannot open backup file: %w", err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	if !scanner.Scan() {
		return fmt.Errorf("%w: file is empty", ErrVerifyFailed)
	}
	header := scanner.Text()

	// Header must start with SQL comment, SET, CREATE, ALTER, COPY, or SELECT pg_catalog
	matched, _ := regexp.MatchString(`^--|^$|^SET |^CREATE |^ALTER |^COPY |^SELECT pg_catalog`, header)
	if !matched {
		return fmt.Errorf("%w: header doesn't look like SQL dump: %s", ErrVerifyFailed, truncate(header, 120))
	}

	return nil
}

// ─── Restore ──────────────────────────────────────────────────────────────────

// Restore imports a backup file into the database. Steps:
// 1. Save uploaded file to temp location
// 2. Drop target database (connect to "postgres" default DB)
// 3. Create target database
// 4. Import via pg_restore (.dump) or psql (.sql)
// 5. Clean up temp file
// Only works when APP_ENV=local (safeguard against production accidents).
func (s *BackupService) Restore(ctx context.Context, srcPath, format string) error {
	// Safeguard: only allow restore in local environment
	if os.Getenv("APP_ENV") != "local" {
		return fmt.Errorf("restore only allowed when APP_ENV=local (current: %s)", os.Getenv("APP_ENV"))
	}

	// Validate source file exists
	if _, err := os.Stat(srcPath); err != nil {
		return fmt.Errorf("source file not found: %w", err)
	}

	// Validate format
	if format != "dump" && format != "sql" {
		return fmt.Errorf("%w: %s (valid: dump, sql)", ErrInvalidFormat, format)
	}

	// Create safety backup before destructive operations
	log.Printf("[backup] Restore: creating pre-restore safety backup...")
	safetyResult, err := s.Create(ctx, "dump")
	if err != nil {
		return fmt.Errorf("safety backup failed, restore aborted: %w", err)
	}
	log.Printf("[backup] Restore: safety backup created: %s (%s)", safetyResult.Filename, safetyResult.SizeHuman)

	s.mu.Lock()
	defer s.mu.Unlock()

	pgPassword := s.config.DBPassword

	log.Printf("[backup] Restore starting from %s", filepath.Base(srcPath))

	// Step 1: Drop database (connect to default "postgres" DB)
	dbName := quoteIdent(s.config.DBName)
	if err := s.execSQL("postgres", fmt.Sprintf("DROP DATABASE IF EXISTS %s", dbName)); err != nil {
		return fmt.Errorf("failed to drop database: %w", err)
	}
	log.Printf("[backup] Restore: database dropped")

	// Step 2: Create database
	if err := s.execSQL("postgres", fmt.Sprintf("CREATE DATABASE %s", dbName)); err != nil {
		return fmt.Errorf("failed to create database: %w", err)
	}
	log.Printf("[backup] Restore: database created")

	// Step 3: Import
	if format == "dump" {
		// pg_restore for custom format
		cmd := exec.CommandContext(ctx, "pg_restore",
			"-U", s.config.DBUser,
			"-h", s.config.DBHost,
			"-p", s.config.DBPort,
			"-d", s.config.DBName,
			"--no-owner", "--no-privileges",
			srcPath,
		)
		cmd.Env = append(os.Environ(), "PGPASSWORD="+pgPassword)
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[backup] Restore import failed: %v\n%s", err, string(output))
			return fmt.Errorf("pg_restore failed: %w\n%s", err, truncate(string(output), 500))
		}
	} else {
		// psql for plain SQL
		cmd := exec.CommandContext(ctx, "psql",
			"-U", s.config.DBUser,
			"-h", s.config.DBHost,
			"-p", s.config.DBPort,
			"-d", s.config.DBName,
			"-f", srcPath,
		)
		cmd.Env = append(os.Environ(), "PGPASSWORD="+pgPassword)
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[backup] Restore import failed: %v\n%s", err, string(output))
			return fmt.Errorf("psql import failed: %w\n%s", err, truncate(string(output), 500))
		}
	}

	log.Printf("[backup] Restore completed")
	return nil
}

// execSQL runs a SQL statement against the given database via psql.
func (s *BackupService) execSQL(database, sql string) error {
	// Quote database identifier to prevent injection
	database = quoteIdent(database)
	cmd := exec.Command("psql",
		"-U", s.config.DBUser,
		"-h", s.config.DBHost,
		"-p", s.config.DBPort,
		"-d", database,
		"-c", sql,
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w\n%s", err, string(output))
	}
	return nil
}

// ─── Preview ──────────────────────────────────────────────────────────────────

// Preview reads a backup file and extracts table/schema metadata without restoring.
// - .dump: runs pg_restore -l to list TOC
// - .sql: scans for CREATE TABLE/SEQUENCE/FUNCTION statements
func (s *BackupService) Preview(filePath string) (*RestorePreview, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return nil, fmt.Errorf("cannot read file: %w", err)
	}

	filename := filepath.Base(filePath)
	ext := filepath.Ext(filename)

	var tables []TableInfo

	switch ext {
	case ".dump":
		tables, err = s.previewDump(filePath)
	case ".sql":
		tables, err = s.previewSQL(filePath)
	default:
		return nil, fmt.Errorf("unsupported format: %s", ext)
	}
	if err != nil {
		return nil, err
	}

	format := "dump"
	if ext == ".sql" {
		format = "sql"
	}

	return &RestorePreview{
		Filename: filename,
		Format:   format,
		Size:     info.Size(),
		Tables:   tables,
	}, nil
}

// previewDump runs pg_restore -l and parses the TOC output.
func (s *BackupService) previewDump(path string) ([]TableInfo, error) {
	cmd := exec.Command("pg_restore", "-l", path)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.config.DBPassword)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("pg_restore -l failed: %w\n%s", err, string(output))
	}

	// Parse pg_restore -l output:
	// ;
	// ; Archive created at ...
	// ;
	// 1234; 1259 16395 TABLE public expenses postgres
	// 1235; 1259 16399 SEQUENCE public expenses_id_seq postgres
	var tables []TableInfo
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, ";") {
			continue
		}
		// Format: <oid>; <catalog> <oid> <type> <schema> <name> <owner>
		parts := strings.Split(line, ";")
		if len(parts) < 2 {
			continue
		}
		rest := strings.TrimSpace(parts[1])
		fields := strings.Fields(rest)
		if len(fields) < 4 {
			continue
		}
		entryType := fields[1]
		schema := fields[2]
		name := fields[3]

		// Only include interesting types
		if entryType == "TABLE" || entryType == "SEQUENCE" || entryType == "FUNCTION" ||
			entryType == "INDEX" || entryType == "VIEW" || entryType == "MATERIALIZED" ||
			entryType == "TRIGGER" {
			tables = append(tables, TableInfo{
				Name:   name,
				Schema: schema,
				Type:   entryType,
			})
		}
	}
	return tables, nil
}

// previewSQL scans a plain SQL dump for CREATE TABLE/SEQUENCE/FUNCTION statements.
func (s *BackupService) previewSQL(path string) ([]TableInfo, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("cannot read SQL file: %w", err)
	}

	reCreate := regexp.MustCompile(`(?si)CREATE\s+(TABLE|SEQUENCE|FUNCTION|INDEX|VIEW|MATERIALIZED\s+VIEW|TRIGGER)\s+(IF\s+NOT\s+EXISTS\s+)?([\w.]+\.)?"?(\w+)"?`)

	var tables []TableInfo
	seen := make(map[string]bool)
	for _, match := range reCreate.FindAllStringSubmatch(string(content), -1) {
		entryType := strings.ToUpper(match[1])
		if entryType == "MATERIALIZED" {
			entryType = "MATERIALIZED VIEW"
		}
		name := match[4]
		key := entryType + ":" + name
		if !seen[key] {
			seen[key] = true
			tables = append(tables, TableInfo{
				Name:   name,
				Schema: "public",
				Type:   entryType,
			})
		}
	}
	return tables, nil
}

// ─── List ──────────────────────────────────────────────────────────────────────

// List returns all backup files in the backup directory, sorted newest first.
func (s *BackupService) List() ([]BackupFileInfo, error) {
	entries, err := os.ReadDir(s.config.BackupDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []BackupFileInfo{}, nil
		}
		return nil, fmt.Errorf("failed to read backup dir: %w", err)
	}

	var files []BackupFileInfo
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, "alizzah_backup_") {
			continue
		}

		ext := filepath.Ext(name)
		if ext != ".dump" && ext != ".sql" {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		// Determine format: look for "sql-compat" marker or just extension
		format := "dump"
		if ext == ".sql" {
			format = "sql"
		}

		files = append(files, BackupFileInfo{
			Filename:  name,
			Size:      info.Size(),
			SizeHuman: formatBytes(info.Size()),
			Timestamp: info.ModTime().In(s.loc).Format("2006-01-02 15:04 WIB"),
			Format:    format,
		})
	}

	// Sort newest first
	sort.Slice(files, func(i, j int) bool {
		return files[i].Filename > files[j].Filename
	})

	return files, nil
}

// ─── GetPath ───────────────────────────────────────────────────────────────────

// GetPath returns the absolute path for a backup file.
// Validates that the filename doesn't contain path traversal.
func (s *BackupService) GetPath(filename string) (string, error) {
	// Basic sanitization: prevent path traversal
	base := filepath.Base(filename)
	if base != filename || strings.Contains(filename, "..") {
		return "", ErrPathTraversal
	}

	// Must start with our naming prefix
	if !strings.HasPrefix(base, "alizzah_backup_") {
		return "", ErrFileNotFound
	}

	path := filepath.Join(s.config.BackupDir, base)

	// Verify file actually exists
	if _, err := os.Stat(path); err != nil {
		if os.IsNotExist(err) {
			return "", ErrFileNotFound
		}
		return "", err
	}

	return path, nil
}

// ─── LastBackupTime ────────────────────────────────────────────────────────────

// LastBackupTime returns the modification time of the most recent backup file.
// Looks at all supported extensions (.dump, .sql).
func (s *BackupService) LastBackupTime() (time.Time, error) {
	var latest time.Time
	found := false

	for _, ext := range []string{"*.dump", "*.sql"} {
		pattern := filepath.Join(s.config.BackupDir, "alizzah_backup_"+ext)
		matches, err := filepath.Glob(pattern)
		if err != nil {
			continue
		}
		for _, m := range matches {
			info, err := os.Stat(m)
			if err != nil {
				continue
			}
			if info.ModTime().After(latest) {
				latest = info.ModTime()
				found = true
			}
		}
	}

	if !found {
		return time.Time{}, fmt.Errorf("no backup files found in %s", s.config.BackupDir)
	}
	return latest, nil
}

// ─── CreateAsync ───────────────────────────────────────────────────────────────

// CreateAsync runs a backup in a goroutine with a 5-minute debounce.
func (s *BackupService) CreateAsync(ctx context.Context) {
	if !s.config.Enabled {
		return
	}
	lastTime, err := s.LastBackupTime()
	if err == nil && time.Since(lastTime) < 5*time.Minute {
		log.Printf("[backup] Debounce: skipping, last backup was %v ago",
			time.Since(lastTime).Round(time.Second))
		return
	}

	log.Printf("[backup] Async backup starting...")
	go func() {
		if _, err := s.Create(ctx, "dump"); err != nil {
			log.Printf("[backup] Async backup FAILED: %v", err)
		}
	}()
}

// ─── Cleanup ───────────────────────────────────────────────────────────────────

// Cleanup removes backup files older than RetentionDays (all formats).
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
		name := entry.Name()
		if !strings.HasPrefix(name, "alizzah_backup_") {
			continue
		}
		ext := filepath.Ext(name)
		if ext != ".dump" && ext != ".sql" {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			path := filepath.Join(s.config.BackupDir, name)
			if err := os.Remove(path); err != nil {
				log.Printf("[backup] Cleanup: failed to remove %s: %v", name, err)
			} else {
				log.Printf("[backup] Cleanup: removed %s (age: %v)", name,
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
func (s *BackupService) StartScheduler() {
	if !s.config.Enabled {
		log.Printf("[backup] Scheduler skipped: BACKUP_ENABLED is not true")
		return
	}
	c := cron.New(cron.WithLocation(time.UTC))
	c.AddFunc("0 16 * * *", func() {
		log.Printf("[backup] Scheduled backup (23:00 WIB) starting...")
		if _, err := s.Create(context.Background(), "dump"); err != nil {
			log.Printf("[backup] Scheduled backup FAILED: %v", err)
		}
	})
	c.Start()
	log.Printf("[backup] Scheduler started (daily at 16:00 UTC / 23:00 WIB)")
	select {}
}

// ─── WriteRestoreInstructions ──────────────────────────────────────────────────

func (s *BackupService) WriteRestoreInstructions() error {
	content := `# Restore Backup Database Alizzah

## Dari file .dump (custom format)
pg_restore -U <user> -h <host> -p <port> -d <dbname> alizzah_backup_YYYY-MM-DD_HH-MM_WIB.dump

## Dari file .sql (plain format)
psql -U <user> -h <host> -p <port> -d <dbname> < alizzah_backup_YYYY-MM-DD_HH-MM_WIB.sql

## Via Docker Compose (VPS Production)
docker compose exec -T postgres pg_restore -U <user> -d <dbname> < alizzah_backup_file.dump
docker compose exec -T postgres psql -U <user> -d <dbname> < alizzah_backup_file.sql

## Menggunakan restore script
cd /path/to/alizzah
./scripts/restore-db.sh <backup_file>
`
	path := filepath.Join(s.config.BackupDir, "README.md")
	return os.WriteFile(path, []byte(content), 0644)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "...(truncated)"
}

// quoteIdent quotes a PostgreSQL identifier by wrapping in double quotes
// and escaping any embedded double quotes.
func quoteIdent(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
}
