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
	// CI environment likely doesn't have pg_dump — test just verifies no panic
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

func TestBackupService_LastBackupTime_NoFiles(t *testing.T) {
	dir := t.TempDir()
	svc := NewBackupService(BackupConfig{BackupDir: dir})
	_, err := svc.LastBackupTime()
	assert.Error(t, err)
}

func TestBackupService_LastBackupTime_FindsLatest(t *testing.T) {
	dir := t.TempDir()

	// Create two backup files with different mtimes
	f1 := filepath.Join(dir, "alizzah_backup_2026-01-01_00-00_WIB.dump")
	f2 := filepath.Join(dir, "alizzah_backup_2026-01-02_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(f1, []byte("a"), 0644))
	require.NoError(t, os.WriteFile(f2, []byte("bb"), 0644))

	// Set distinct mtimes
	past := time.Now().Add(-2 * time.Hour)
	recent := time.Now().Add(-1 * time.Hour)
	require.NoError(t, os.Chtimes(f1, past, past))
	require.NoError(t, os.Chtimes(f2, recent, recent))

	svc := NewBackupService(BackupConfig{BackupDir: dir})
	latest, err := svc.LastBackupTime()
	require.NoError(t, err)

	// Should return the most recent (f2)
	assert.True(t, latest.After(past), "latest should be more recent than the older file")
}

func TestBackupService_Cleanup(t *testing.T) {
	dir := t.TempDir()

	// Create an old file (> 7 days)
	oldFile := filepath.Join(dir, "alizzah_backup_2020-01-01_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(oldFile, []byte("old"), 0644))
	oldTime := time.Now().Add(-8 * 24 * time.Hour)
	require.NoError(t, os.Chtimes(oldFile, oldTime, oldTime))

	// Create a recent file (< 7 days)
	recentFile := filepath.Join(dir, "alizzah_backup_2026-07-23_00-00_WIB.dump")
	require.NoError(t, os.WriteFile(recentFile, []byte("recent"), 0644))

	svc := NewBackupService(BackupConfig{BackupDir: dir, RetentionDays: 7})
	err := svc.Cleanup(context.Background())
	require.NoError(t, err)

	// Old file should be gone
	_, err = os.Stat(oldFile)
	assert.True(t, os.IsNotExist(err), "old file should be deleted")

	// Recent file should still exist
	_, err = os.Stat(recentFile)
	assert.NoError(t, err, "recent file should still exist")
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

// TestNewBackupService_Location tests WIB timezone setup.
func TestNewBackupService_Location(t *testing.T) {
	svc := NewBackupService(BackupConfig{})
	require.NotNil(t, svc.loc)
	// String() may return "Asia/Jakarta" or "WIB" depending on OS tzdata
	assert.Contains(t, svc.loc.String(), "Jakarta")
}
