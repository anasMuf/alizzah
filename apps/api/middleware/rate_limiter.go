package middleware

import (
	"net/http"
	"sync"

	"github.com/labstack/echo/v4"
	"golang.org/x/time/rate"
)

// RateLimiter returns an Echo middleware that limits requests per second.
// Every client is identified by IP address. Exceeded requests get 429.
func RateLimiter(rps float64, burst int) echo.MiddlewareFunc {
	type client struct {
		limiter  *rate.Limiter
		lastSeen int64 // unused for now; could be used for cleanup
	}

	var (
		mu      sync.Mutex
		clients = make(map[string]*rate.Limiter)
	)

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			ip := c.RealIP()

			mu.Lock()
			lim, ok := clients[ip]
			if !ok {
				lim = rate.NewLimiter(rate.Limit(rps), burst)
				clients[ip] = lim
			}
			mu.Unlock()

			if !lim.Allow() {
				return echo.NewHTTPError(http.StatusTooManyRequests, "Terlalu banyak request. Coba lagi nanti.")
			}
			return next(c)
		}
	}
}
