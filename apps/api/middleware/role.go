package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// RequireRoles returns a middleware that checks if the current user's role
// matches any of the allowed roles. Returns 403 if no match.
func RequireRoles(roles ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims := GetCurrentUser(c)
			for _, role := range roles {
				if claims.Role == role {
					return next(c)
				}
			}
			return echo.NewHTTPError(http.StatusForbidden, "Akses tidak diizinkan")
		}
	}
}
