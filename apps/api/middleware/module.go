package middleware

import (
	"net/http"

	"api/repository"

	"github.com/labstack/echo/v4"
)

// Role level (RBAC by-modul). Hanya dua: superadmin (bypass semua modul) & admin.
const (
	RoleSuperadmin = "superadmin"
	RoleAdmin      = "admin"
)

// Modul yang dapat di-grant ke user. Akses dibatasi per-modul (tanpa view/manage).
const (
	ModuleAdministrasi = "administrasi"
	ModuleKeuangan     = "keuangan"
	ModuleKoperasi     = "koperasi"
	ModuleLaporan      = "laporan"
)

// ModuleGuard membangun middleware otorisasi berbasis modul. Sumber kebenaran
// akses = tabel user_modules (lookup DB tiap request), sehingga perubahan grant
// langsung berlaku tanpa user perlu login ulang. superadmin selalu bypass.
type ModuleGuard struct {
	repo repository.UserModuleRepository
}

func NewModuleGuard(repo repository.UserModuleRepository) *ModuleGuard {
	return &ModuleGuard{repo: repo}
}

// RequireModule mengizinkan request bila user superadmin, atau (untuk admin)
// memiliki minimal satu dari modules yang diberikan. 403 bila tidak cocok.
func (g *ModuleGuard) RequireModule(modules ...string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims := GetCurrentUser(c)
			if claims.Role == RoleSuperadmin {
				return next(c)
			}
			ok, err := g.repo.HasAnyModule(claims.UserID, modules)
			if err != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "Gagal memeriksa akses modul")
			}
			if !ok {
				return echo.NewHTTPError(http.StatusForbidden, "Akses tidak diizinkan")
			}
			return next(c)
		}
	}
}
