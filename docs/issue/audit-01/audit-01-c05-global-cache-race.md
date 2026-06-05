# A01-C05: Data Race — Global Cache Tanpa Mutex di Report Service

## Problem (Masalah / Konteks)

`report_service.go` mendefinisikan dua **package-level map** yang diakses secara concurrent oleh goroutine HTTP handler tanpa proteksi mutex. Ini adalah **data race** yang terdeteksi oleh Go race detector dan dapat menyebabkan crash/panic.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/report_service.go:152-153`

```go
var annualReportCache = map[uint]*dto.AnnualReportResponse{}
var annualReportCacheTime = map[uint]time.Time{}

func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
    // ❌ Concurrent READ tanpa lock
    if cached, ok := annualReportCache[req.AcademicYearID]; ok {
        if time.Since(annualReportCacheTime[req.AcademicYearID]) < time.Hour {
            return cached, nil
        }
    }
    
    // ... generate report ...
    
    // ❌ Concurrent WRITE tanpa lock
    annualReportCache[req.AcademicYearID] = result       // baris ~180
    annualReportCacheTime[req.AcademicYearID] = time.Now()  // baris ~181
    
    return result, nil
}
```

### Steps to Reproduce

1. Jalankan server dengan `go run -race main.go`
2. Buat 10+ request concurrent ke `GET /api/v1/reports/annual?academic_year_id=1`
3. Race detector akan menandai concurrent map read/write

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan `sync.RWMutex`:

```go
var (
    annualReportCache     = map[uint]*dto.AnnualReportResponse{}
    annualReportCacheTime = map[uint]time.Time{}
    annualReportMu        sync.RWMutex
)

func (s *reportService) GetAnnualReport(req dto.AnnualReportRequest) (*dto.AnnualReportResponse, error) {
    annualReportMu.RLock()
    if cached, ok := annualReportCache[req.AcademicYearID]; ok {
        if time.Since(annualReportCacheTime[req.AcademicYearID]) < time.Hour {
            annualReportMu.RUnlock()
            return cached, nil
        }
    }
    annualReportMu.RUnlock()
    
    // ... generate report ...
    
    annualReportMu.Lock()
    annualReportCache[req.AcademicYearID] = result
    annualReportCacheTime[req.AcademicYearID] = time.Now()
    annualReportMu.Unlock()
    
    return result, nil
}
```

Atau gunakan `sync.Map` jika pattern-nya read-heavy.

## Relevant Files / Area

- `apps/api/service/report_service.go:152-153` — deklarasi global cache
- `apps/api/service/report_service.go:155-182` — GetAnnualReport (read + write)

## Task (Daftar Pekerjaan)

- [ ] Tambahkan `sync.RWMutex` untuk proteksi concurrent access
- [ ] Wrap semua akses ke `annualReportCache` dan `annualReportCacheTime` dengan lock
- [ ] Verifikasi fix dengan `go test -race ./...`
