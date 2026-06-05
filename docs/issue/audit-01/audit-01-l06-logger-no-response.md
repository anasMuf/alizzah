# A01-L06: Logger Hanya Log Request, Tidak Response

## Problem (Masalah / Konteks)

Middleware logging hanya mencatat "incoming request" tanpa mencatat:
- HTTP status code response
- Latency (response time)
- Error (jika ada)

Akibatnya, log tidak berguna untuk debugging atau monitoring.

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/middleware/logrus_logger.go:28-31`

```go
func MiddlewareLogging(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        MakeLogEntry(c).Info("incoming request")
        return next(c)
    }
}
```

## Expected Behavior (Kondisi yang Diharapkan)

Gunakan approach yang sudah umum — tangkap response setelah handler selesai:

```go
func MiddlewareLogging(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        start := time.Now()
        err := next(c)
        
        entry := MakeLogEntry(c).WithFields(log.Fields{
            "status":   c.Response().Status,
            "latency":  time.Since(start).String(),
        })
        
        if err != nil {
            entry.WithError(err).Error("request failed")
        } else {
            entry.Info("request completed")
        }
        
        return err
    }
}
```

## Relevant Files / Area

- `apps/api/middleware/logrus_logger.go` — MiddlewareLogging

## Task (Daftar Pekerjaan)

- [ ] Update `MiddlewareLogging` untuk mencatat status code, latency, dan error
- [ ] Format log agar mudah dicari (JSON format di production)
- [ ] Tambahkan request ID untuk tracing request antar log entry
