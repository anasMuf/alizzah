# A01-M06: Tidak Ada Graceful Shutdown

## Problem (Masalah / Konteks)

Server dijalankan dengan `e.Logger.Fatal(e.Start(":" + port))` — jika menerima sinyal `SIGTERM`/`SIGINT` (misal saat deployment, `docker stop`, atau `Ctrl+C`), server langsung mati tanpa menunggu request yang sedang berjalan selesai.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/main.go:279`

```go
e.Logger.Fatal(e.Start(":" + port))
```

### Dampak
- Request yang sedang dalam transaksi database akan terputus di tengah jalan
- Client mendapat error koneksi, tapi data mungkin sudah setengah termutasi
- Container orchestration (K8s/Docker) menunggu grace period, tapi aplikasi tidak merespon

## Expected Behavior (Kondisi yang Diharapkan)

Implementasi graceful shutdown:

```go
func main() {
    // ... setup ...
    
    go func() {
        if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
            e.Logger.Fatal("shutting down the server")
        }
    }()
    
    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
    <-quit
    
    // Graceful shutdown dengan timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}
```

## Relevant Files / Area

- `apps/api/main.go:279` — server start tanpa graceful shutdown
- `apps/api/main.go` — perlu tambah import `context`, `os/signal`, `syscall`, `net/http`

## Task (Daftar Pekerjaan)

- [ ] Wrap `e.Start()` dalam goroutine
- [ ] Listen untuk `SIGTERM`/`SIGINT`
- [ ] Panggil `e.Shutdown()` dengan timeout 30 detik
- [ ] Tutup koneksi database setelah server berhenti
- [ ] Verifikasi: kirim request panjang, `kill -TERM`, pastikan request selesai sebelum shutdown
