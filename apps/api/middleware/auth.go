package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"strings"

	"api/repository"

	"github.com/golang-jwt/jwt"
	"github.com/labstack/echo/v4"
)

var jwtSecret []byte

func getJWTSecret() []byte {
	if jwtSecret == nil {
		jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	}
	return jwtSecret
}

// JWTClaims defines the claims stored in JWT token.
type JWTClaims struct {
	UserID uint   `json:"user_id"`
	Role   string `json:"role"`
	jwt.StandardClaims
}

// HashToken computes SHA-256 hex digest of a token string.
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// JWTAuth returns middleware that validates JWT token, checks blacklist,
// and injects claims into context.
func JWTAuth(blacklistRepo repository.TokenBlacklistRepository) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				return echo.NewHTTPError(http.StatusUnauthorized, "Missing or invalid Authorization header")
			}
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			// Cek blacklist sebelum parse JWT (lebih cepat tolak token yang sudah logout)
			if blacklistRepo != nil {
				tokenHash := HashToken(tokenString)
				if blacklisted, _ := blacklistRepo.Exists(tokenHash); blacklisted {
					return echo.NewHTTPError(http.StatusUnauthorized, "Token sudah tidak berlaku (logout)")
				}
			}

			token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, echo.NewHTTPError(http.StatusUnauthorized, "Invalid signing method")
				}
				return getJWTSecret(), nil
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
			c.Set("token_raw", tokenString)
			return next(c)
		}
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

// GetUserID safely extracts the user ID from context with comma-ok check.
func GetUserID(c echo.Context) (uint, error) {
	id, ok := c.Get("user_id").(uint)
	if !ok {
		return 0, echo.NewHTTPError(http.StatusUnauthorized, "User ID tidak ditemukan di context")
	}
	return id, nil
}
