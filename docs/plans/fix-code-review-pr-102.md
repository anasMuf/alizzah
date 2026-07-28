# Implementation Plan: Fix Code Review Issues — PR #102

## Overview

Perbaikan 1 Critical + 4 Important + 3 Suggestions dari code review.
Semua perubahan isolated ke Go service/handler dan frontend komponen — tidak ada schema/route baru.

## Dependency Graph

```
Task 1 (Critical) ────┐
Task 2 (Important) ───┤
Task 3 (Important) ───┤─── semua independen, bisa paralel
Task 4 (Important) ───┤
Task 5 (Important) ───┘
Task 6 (Suggestion) ──┘ (depend on Task 5, same file)
Task 7+8 (Suggestions) ─ independen
```

---

## Phase 1: Critical + Important (must fix before merge)

### Task 1: Safety backup sebelum Restore drop DB [Critical]

**Description:** `Restore()` harus membuat safety backup (`pg_dump -Fc`) sebelum `DROP DATABASE`. Jika drop/create/import gagal, user bisa restore dari safety backup. Safety backup disimpan ke `BACKUP_DIR` dengan nama `pre_restore_YYYYMMDD_HHMMSS.dump`.

**Acceptance criteria:**
- `Restore()` membuat safety backup sebelum `DROP DATABASE`
- Jika safety backup gagal dibuat, Restore() abort dengan error
- Safety backup file ada setelah Restore() sukses (sebagai rollback point)
- Log mencantumkan path safety backup

**Verification:**
- `go test ./service/ -run Restore -v` (tambah test baru)
- `go build ./...`

**Dependencies:** None

**Files:** `apps/api/service/backup_service.go` (+test)

**Estimated scope:** S — 1 file, ~20 lines

---

### Task 2: Quote DB identifier di `execSQL` [Important]

**Description:** `execSQL` menggunakan `fmt.Sprintf("DROP DATABASE IF EXISTS %s", name)` — harus di-quote dengan `pg_identifier` style (`"name"`) untuk mencegah injection.

**Acceptance criteria:**
- Identifier di-quote: `fmt.Sprintf(`"%s"`, strings.ReplaceAll(name, `"`, `""`))`
- Test: DB_NAME dengan special char tidak injection

**Verification:**
- `go test ./service/ -run execSQL -v`
- `go build ./...`

**Dependencies:** None

**Files:** `apps/api/service/backup_service.go` (+test)

**Estimated scope:** XS — 1 file, ~5 lines

---

### Task 3: Tambah mutex di `Restore()` [Important]

**Description:** `Restore()` tidak menggunakan `s.mu.Lock()`, sehingga bisa race dengan `Create()` (backup membaca DB yang sedang di-drop/di-import).

**Acceptance criteria:**
- `s.mu.Lock()` / `defer s.mu.Unlock()` di awal `Restore()`

**Verification:**
- `go build ./...`

**Dependencies:** None

**Files:** `apps/api/service/backup_service.go`

**Estimated scope:** XS — 1 file, ~3 lines

---

### Task 4: Fix `previewSQL` multiline CREATE [Important]

**Description:** `bufio.Scanner` membaca per baris, jadi `CREATE TABLE foo (\n  id integer\n)` tidak terdeteksi. Ganti dengan baca seluruh konten + multiline regex (`(?s)`) atau scan dengan delimiter `;`.

**Acceptance criteria:**
- Multi-line `CREATE TABLE` terdeteksi oleh `previewSQL`
- Test: input multi-line CREATE → muncul di hasil

**Verification:**
- `go test ./service/ -run Preview -v`
- `go build ./...`

**Dependencies:** None

**Files:** `apps/api/service/backup_service.go` (+test)

**Estimated scope:** S — 1 file, ~15 lines

---

### Task 5: Extract upload helper di handler [Important]

**Description:** `Preview()` dan `Restore()` di `backup_handler.go` punya logika upload file yang identik (~25 baris). Extract ke helper `saveBackupUpload(c) (tmpPath, format, cleanup, error)`.

**Acceptance criteria:**
- Helper function `saveBackupUpload` diekstrak dari `Preview` dan `Restore`
- Kedua handler memanggil helper (tidak ada duplikasi)
- Cleanup (`os.Remove`) tetap dijalankan via defer

**Verification:**
- `go build ./...`

**Dependencies:** None

**Files:** `apps/api/handler/backup_handler.go`

**Estimated scope:** S — 1 file, ~30 lines refactor

---

## Phase 2: Suggestions (nice to have)

### Task 6: Truncate `pg_restore` error output [Suggestion]

**Description:** `Restore()` error mengembalikan seluruh output `pg_restore`/`psql` ke client — bisa ribuan baris. Truncate ke 500 karakter terakhir untuk API response.

**Acceptance criteria:**
- Error message di-truncate ke 500 karakter + suffix "...(truncated)"
- Log server tetap mencatat full output

**Verification:**
- `go build ./...`

**Dependencies:** Task 5 (same file)

**Files:** `apps/api/service/backup_service.go`

**Estimated scope:** XS — 1 file, ~10 lines

---

### Task 7: Extract download blob helper di frontend [Suggestion]

**Description:** `handleDownload` dan `handleBackupAndDownload` di `backup/index.tsx` punya logika download blob + `URL.createObjectURL` + `<a> click` yang identik (~12 baris). Extract ke helper `downloadBackupFile(filename)`.

**Acceptance criteria:**
- Helper `downloadBackupFile` dipanggil dari kedua handler
- Tidak ada duplikasi

**Verification:**
- `npx tsc --noEmit`

**Dependencies:** None

**Files:** `apps/dashboard/src/routes/_authenticated/keuangan/backup/index.tsx`

**Estimated scope:** XS — 1 file, ~10 lines

---

### Task 8: Mask DB_NAME di log [Suggestion]

**Description:** `log.Printf` di `Restore()` dan `Create()` mencetak `DB_NAME`. Ganti dengan log tanpa nama DB.

**Acceptance criteria:**
- Log tidak mencetak `DB_NAME` secara eksplisit
- Log tetap informatif (timestamp, format, status)

**Verification:**
- `grep -r "DBName\|DB_NAME" apps/api/service/backup_service.go` hanya di config, tidak di log

**Dependencies:** None

**Files:** `apps/api/service/backup_service.go`

**Estimated scope:** XS — 1 file, ~5 lines

---

## Execution Order

```
Phase 1 (parallel): Task 1, 2, 3, 4, 5
    ↓
Phase 2 (sequential): Task 6 (depends on 5), Task 7 (independent), Task 8 (independent)
```

**Total:** 8 tasks, ~80 lines net change. All S/XS scope. 2 sesi implementasi.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Safety backup bisa makan disk space | Low | Sudah ada retention cleanup; safety backup juga ikut di-cleanup |
| `(?s)` regex lambat di file SQL besar | Low | File SQL jarang >100MB; preview hanya untuk dev |
| Truncate error mungkin hilangkan info penting | Low | Log server tetap mencatat full output |
