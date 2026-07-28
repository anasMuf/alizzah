package service

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBackupService_CheckDependencies(t *testing.T) {
	svc := NewBackupService(BackupConfig{})
	err := svc.CheckDependencies()
	t.Logf("CheckDependencies: %v", err)
}

func TestBackupService_Verify_EmptyFile(t *testing.T) {
	dir := t.TempDir()
	emptyFile := filepath.Join(dir, "empty.dump")
	require.NoError(t, os.WriteFile(emptyFile, []byte{}, 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	err := svc.Verify(emptyFile)
	assert.ErrorIs(t, err, ErrEmptyBackup)
}

func TestBackupService_Verify_MissingFile(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()})
	err := svc.Verify("/nonexistent/path/file.dump")
	assert.Error(t, err)
}

func TestBackupService_Verify_SQLHeader(t *testing.T) {
	dir := t.TempDir()

	// Valid SQL header
	validSQL := filepath.Join(dir, "valid.sql")
	require.NoError(t, os.WriteFile(validSQL, []byte("-- PostgreSQL dump\nCREATE TABLE foo;"), 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	assert.NoError(t, svc.verifyFormat(validSQL, "sql"))

	// Invalid SQL header
	invalidSQL := filepath.Join(dir, "invalid.sql")
	require.NoError(t, os.WriteFile(invalidSQL, []byte("This is not SQL"), 0644))
	assert.Error(t, svc.verifyFormat(invalidSQL, "sql"))
}

func TestBackupService_LastBackupTime_NoFiles(t *testing.T) {
	dir := t.TempDir()
	svc := NewBackupService(BackupConfig{BackupDir: dir})
	_, err := svc.LastBackupTime()
	assert.Error(t, err)
}

func TestBackupService_LastBackupTime_FindsLatest(t *testing.T) {
	dir := t.TempDir()

	f1 := filepath.Join(dir, "alizzah_backup_2026-01-01_00-00_WIB.dump")
	f2 := filepath.Join(dir, "alizzah_backup_2026-01-02_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(f1, []byte("a"), 0644))
	require.NoError(t, os.WriteFile(f2, []byte("bb"), 0644))

	past := time.Now().Add(-2 * time.Hour)
	recent := time.Now().Add(-1 * time.Hour)
	require.NoError(t, os.Chtimes(f1, past, past))
	require.NoError(t, os.Chtimes(f2, recent, recent))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	latest, err := svc.LastBackupTime()
	require.NoError(t, err)
	assert.True(t, latest.After(past), "latest should be more recent than the older file")
}

func TestBackupService_LastBackupTime_MultipleFormats(t *testing.T) {
	dir := t.TempDir()

	// .dump file (older)
	fDump := filepath.Join(dir, "alizzah_backup_2026-01-01_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(fDump, []byte("d"), 0644))
	require.NoError(t, os.Chtimes(fDump, time.Now().Add(-2*time.Hour), time.Now().Add(-2*time.Hour)))

	// .sql file (newer)
	fSQL := filepath.Join(dir, "alizzah_backup_2026-07-01_00-00_WIB.sql")
	require.NoError(t, os.WriteFile(fSQL, []byte("s"), 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	latest, err := svc.LastBackupTime()
	require.NoError(t, err)
	// The .sql file should be the latest
	assert.True(t, latest.After(time.Now().Add(-1*time.Hour)))
}

func TestBackupService_Cleanup(t *testing.T) {
	dir := t.TempDir()

	oldFile := filepath.Join(dir, "alizzah_backup_2020-01-01_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(oldFile, []byte("old"), 0644))
	oldTime := time.Now().Add(-8 * 24 * time.Hour)
	require.NoError(t, os.Chtimes(oldFile, oldTime, oldTime))

	recentFile := filepath.Join(dir, "alizzah_backup_2026-07-23_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(recentFile, []byte("recent"), 0644))

	// Also create an old .sql file
	oldSQL := filepath.Join(dir, "alizzah_backup_2020-01-01_00-00_WIB.sql")
	require.NoError(t, os.WriteFile(oldSQL, []byte("old-sql"), 0644))
	require.NoError(t, os.Chtimes(oldSQL, oldTime, oldTime))

	svc := NewBackupService(BackupConfig{BackupDir: dir, RetentionDays: 7})
	err := svc.Cleanup(context.Background())
	require.NoError(t, err)

	_, err = os.Stat(oldFile)
	assert.True(t, os.IsNotExist(err), "old .dump file should be deleted")
	_, err = os.Stat(oldSQL)
	assert.True(t, os.IsNotExist(err), "old .sql file should be deleted")
	_, err = os.Stat(recentFile)
	assert.NoError(t, err, "recent file should still exist")
}

func TestBackupService_List(t *testing.T) {
	dir := t.TempDir()

	// Create a few backup files
	require.NoError(t, os.WriteFile(filepath.Join(dir, "alizzah_backup_2026-07-01_00-00_WIB.dump"), []byte("d1"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "alizzah_backup_2026-07-02_00-00_WIB.sql"), []byte("s1"), 0644))

	// Non-backup files should be ignored
	require.NoError(t, os.WriteFile(filepath.Join(dir, "README.md"), []byte("readme"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "backup_errors.log"), []byte("log"), 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	files, err := svc.List()
	require.NoError(t, err)
	assert.Len(t, files, 2)

	// Newest first
	assert.Equal(t, "alizzah_backup_2026-07-02_00-00_WIB.sql", files[0].Filename)
	assert.Equal(t, "alizzah_backup_2026-07-01_00-00_WIB.dump", files[1].Filename)
	assert.Equal(t, "sql", files[0].Format)
	assert.Equal(t, "dump", files[1].Format)
}

func TestBackupService_List_EmptyDir(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()})
	files, err := svc.List()
	require.NoError(t, err)
	assert.Empty(t, files)
}

func TestBackupService_List_NonexistentDir(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: "/nonexistent/backup/dir"})
	files, err := svc.List()
	require.NoError(t, err)
	assert.Empty(t, files)
}

func TestBackupService_GetPath(t *testing.T) {
	dir := t.TempDir()
	filename := "alizzah_backup_2026-01-01_00-00_WIB.dump"
	path := filepath.Join(dir, filename)
	require.NoError(t, os.WriteFile(path, []byte("data"), 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir})

	resolved, err := svc.GetPath(filename)
	require.NoError(t, err)
	assert.Equal(t, path, resolved)
}

func TestBackupService_GetPath_NotFound(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()})
	_, err := svc.GetPath("alizzah_backup_2026-01-01_00-00_WIB.dump")
	assert.ErrorIs(t, err, ErrFileNotFound)
}

func TestBackupService_GetPath_PathTraversal(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()})
	_, err := svc.GetPath("../../../etc/passwd")
	assert.ErrorIs(t, err, ErrPathTraversal)
}

func TestBackupService_GetPath_WrongPrefix(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()})
	_, err := svc.GetPath("random-file.txt")
	assert.ErrorIs(t, err, ErrFileNotFound)
}

func TestBackupService_Create_InvalidFormat(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir(), Enabled: true})
	_, err := svc.Create(context.Background(), "invalid")
	assert.ErrorIs(t, err, ErrInvalidFormat)
}

func TestBackupService_Create_DefaultFormat(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir(), Enabled: true})
	_, err := svc.Create(context.Background(), "")
	// Will fail because no pg_dump, but shouldn't fail on format validation
	if err != nil {
		assert.NotErrorIs(t, err, ErrInvalidFormat)
	}
}

func TestBackupService_Create_Disabled(t *testing.T) {
	svc := NewBackupService(BackupConfig{BackupDir: t.TempDir()}) // Enabled defaults to false
	_, err := svc.Create(context.Background(), "dump")
	assert.ErrorIs(t, err, ErrBackupDisabled)
}

func TestBackupService_WriteRestoreInstructions(t *testing.T) {
	dir := t.TempDir()
	svc := NewBackupService(BackupConfig{BackupDir: dir})
	err := svc.WriteRestoreInstructions()
	require.NoError(t, err)

	readmePath := filepath.Join(dir, "README.md")
	data, err := os.ReadFile(readmePath)
	require.NoError(t, err)
	assert.Contains(t, string(data), "pg_restore")
}

func TestFormatBytes(t *testing.T) {
	tests := []struct {
		bytes int64
		want  string
	}{
		{0, "0 B"},
		{500, "500 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1048576, "1.0 MB"},
		{1073741824, "1.0 GB"},
	}

	for _, tt := range tests {
		got := formatBytes(tt.bytes)
		assert.Equal(t, tt.want, got, "formatBytes(%d)", tt.bytes)
	}
}

func TestBackupService_PreviewSQL_Multiline(t *testing.T) {
	dir := t.TempDir()
	sqlFile := filepath.Join(dir, "multiline.sql")
	// Multi-line CREATE TABLE
	content := `CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);`
	require.NoError(t, os.WriteFile(sqlFile, []byte(content), 0644))

	svc := NewBackupService(BackupConfig{})
	tables, err := svc.previewSQL(sqlFile)
	require.NoError(t, err)
	assert.Len(t, tables, 1)
	assert.Equal(t, "students", tables[0].Name)
	assert.Equal(t, "TABLE", tables[0].Type)
}

func TestNewBackupService_Location(t *testing.T) {
	svc := NewBackupService(BackupConfig{})
	require.NotNil(t, svc.loc)
	assert.Contains(t, svc.loc.String(), "Jakarta")
}
