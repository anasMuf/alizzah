package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/time/rate"
)

const (
	// rateLimiterCleanupInterval determines how often stale entries are evicted.
	rateLimiterCleanupInterval = 15 * time.Minute
	// rateLimiterMaxIdle is the duration after which an idle client is evicted.
	rateLimiterMaxIdle = 30 * time.Minute
)

// RateLimiter returns an Echo middleware that limits requests per second.
// Every client is identified by IP address. Exceeded requests get 429.
// A background goroutine periodically evicts idle clients to prevent
// unbounded memory growth.
func RateLimiter(rps float64, burst int) echo.MiddlewareFunc {
	type client struct {
		limiter  *rate.Limiter
		lastSeen time.Time
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*client)
	)

	// Background cleanup goroutine — evicts clients idle longer than maxIdle.
	go func() {
		ticker := time.NewTicker(rateLimiterCleanupInterval)
		defer ticker.Stop()
		for range ticker.C {
			mu.Lock()
			cutoff := time.Now().Add(-rateLimiterMaxIdle)
			for ip, c := range clients {
				if c.lastSeen.Before(cutoff) {
					delete(clients, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()

			mu.Lock()
			cl, ok := clients[ip]
			if !ok {
				cl = &client{
					limiter:  rate.NewLimiter(rate.Limit(rps), burst),
					lastSeen: time.Now(),
				}
				clients[ip] = cl
			}
			cl.lastSeen = time.Now()
			mu.Unlock()

			if !cl.limiter.Allow() {
				return echo.NewHTTPError(http.StatusTooManyRequests, "Terlalu banyak request. Coba lagi nanti.")
			}
			return next(c)
		}
	}
}
