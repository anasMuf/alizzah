package middleware

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"api/model"
	"api/utility"

	"github.com/labstack/echo/v4"
)

const maxBodyBytes = 100 * 1024 // 100 KB

// AuditWriter adalah interface minimal yang dibutuhkan middleware untuk menulis
// audit entry — menghindari import cycle (middleware → service → middleware).
type AuditWriter interface {
	LogAsync(entry model.AuditEntry)
}

// AuditMiddleware merekam setiap request non-GET ke database.
// Dipasang setelah JWTAuth agar punya akses ke user context.
type AuditMiddleware struct {
	writer AuditWriter
}

func NewAuditMiddleware(writer AuditWriter) *AuditMiddleware {
	return &AuditMiddleware{writer: writer}
}

// Capture adalah middleware handler yang membaca request body, memproses request,
// lalu menulis audit entry secara async.
func (m *AuditMiddleware) Capture(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		// Skip GET (read-only) — tidak relevan untuk audit debugging
		if c.Request().Method == http.MethodGet {
			return next(c)
		}

		start := time.Now()

		// Capture raw request body
		var bodyStr string
		if c.Request().Body != nil {
			bodyBytes, err := io.ReadAll(c.Request().Body)
			if err == nil {
				// Restore body agar handler tetap bisa membacanya
				c.Request().Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

				if len(bodyBytes) > maxBodyBytes {
					bodyStr = "[body too large: " + humanizeBytes(len(bodyBytes)) + "]"
				} else {
					bodyStr = string(bodyBytes)
				}
			}
		}

		// Jalankan handler
		err := next(c)

		// Build audit entry
		entry := model.AuditEntry{
			Method:      c.Request().Method,
			Path:        c.Request().URL.Path,
			Module:      utility.ModuleFromPath(c.Request().URL.Path),
			Action:      utility.ActionFromMethod(c.Request().Method),
			RequestBody: bodyStr,
			StatusCode:  c.Response().Status,
			IPAddress:   c.RealIP(),
			LatencyMs:   int(time.Since(start).Milliseconds()),
		}

		// Extract user info dari JWT context
		if claims := GetCurrentUser(c); claims != nil {
			entry.UserID = claims.UserID
		}
		// Try get user name dari context (jika diset oleh login handler, dll)
		if name, ok := c.Get("user_name").(string); ok {
			entry.UserName = name
		}

		// Extract error message jika handler mengembalikan HTTPError
		if err != nil {
			if httpErr, ok := err.(*echo.HTTPError); ok {
				if msg, ok := httpErr.Message.(string); ok {
					entry.ErrorMessage = msg
				}
			} else {
				entry.ErrorMessage = err.Error()
			}
		}

		// Write async — non-blocking
		m.writer.LogAsync(entry)

		return err
	}
}

func humanizeBytes(n int) string {
	if n < 1024 {
		return itoa(n) + " bytes"
	}
	if n < 1024*1024 {
		return itoa(n/1024) + " KB"
	}
	return itoa(n/(1024*1024)) + " MB"
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
