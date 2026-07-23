// Package bootstrap menyediakan setup HTTP server yang dipakai bersama oleh
// seluruh entrypoint binary (cmd/api, cmd/koperasi, ...). Dengan ini setiap
// binary cukup memanggil NewEcho/APIGroup/Run tanpa menduplikasi konfigurasi.
//
// Lihat docs/architecture/adr-002-deployment-multi-binary.md.
package bootstrap

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"api/handler"
	"api/middleware"
	"api/utility"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "api/docs"
)

// NewEcho membuat instance Echo dengan error handler, validator, CORS, recover,
// logging, route swagger, dan health check standar — identik untuk semua binary.
func NewEcho() *echo.Echo {
	e := echo.New()
	e.HTTPErrorHandler = handler.CustomHTTPErrorHandler
	e.Validator = &utility.CustomValidator{Validator: utility.NewValidator()}

	corsOrigins := strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",")
	if len(corsOrigins) == 1 && corsOrigins[0] == "" {
		corsOrigins = []string{
			"http://localhost:3000",
			"http://localhost:5173",
			"https://dashboard.alizzah.anaslabs.my.id",
		}
	}
	e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins: corsOrigins,
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))
	e.Use(echoMiddleware.Recover())
	e.Use(echoMiddleware.BodyLimit("10M"))
	e.Use(middleware.MiddlewareLogging)

	e.GET("/swagger/*", echoSwagger.WrapHandler)
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	return e
}

// APIGroup membuat grup route /api/v1 dengan rate limiter standar.
func APIGroup(e *echo.Echo) *echo.Group {
	return e.Group("/api/v1", middleware.RateLimiter(20, 40))
}

// Port mengembalikan nilai env envKey, atau defaultPort bila kosong. Tiap binary
// me-resolve port-nya sendiri (cmd/api → PORT, cmd/koperasi → KOPERASI_PORT)
// agar dua binary di satu host (dev, berbagi satu .env) tidak berebut variabel
// PORT yang sama. Lihat docs/architecture/adr-002-deployment-multi-binary.md.
func Port(envKey, defaultPort string) string {
	if p := os.Getenv(envKey); p != "" {
		return p
	}
	return defaultPort
}

// Run menjalankan server pada port yang sudah di-resolve caller (lihat Port),
// dengan graceful shutdown saat menerima SIGINT/SIGTERM.
func Run(e *echo.Echo, port string) {
	go func() {
		if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("shutting down the server")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Menerima sinyal shutdown, menunggu request selesai...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
	log.Println("Server berhenti")
}
