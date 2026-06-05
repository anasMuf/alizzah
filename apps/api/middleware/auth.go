package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt"
	"github.com/labstack/echo/v4"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// JWTClaims defines the claims stored in JWT token.
type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// JWTAuth is middleware that validates JWT token and injects claims into context.
func JWTAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		authHeader := c.Request().Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return echo.NewHTTPError(http.StatusUnauthorized, "Missing or invalid Authorization header")
		}
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Invalid signing method")
			}
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired token")
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			return echo.NewHTTPError(http.StatusUnauthorized, "Invalid token claims")
		}

		c.Set("user", token)
		c.Set("user_id", claims.UserID)
		c.Set("role", claims.Role)
		return next(c)
	}
}

// GetCurrentUser extracts JWTClaims from the Echo context.
func GetCurrentUser(c echo.Context) *JWTClaims {
	token := c.Get("user").(*jwt.Token)
	return token.Claims.(*JWTClaims)
}

// GetCurrentUserID extracts the user ID from the Echo context.
func GetCurrentUserID(c echo.Context) uint {
	claims := GetCurrentUser(c)
	return claims.UserID
}
