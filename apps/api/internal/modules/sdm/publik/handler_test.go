package publik

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func newCtx(method, target string) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(method, target, nil)
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

// Handler publik menolak token kosong/ngawur TANPA menyentuh service (aman:
// New(nil, nil) tidak dipanggil pada jalur ini).
func TestGetSlip_TolakTokenKosong(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	h := New(nil, nil)
	c, rec := newCtx(http.MethodGet, "/api/v1/public/slip")
	if err := h.GetSlip(c); err != nil {
		t.Fatalf("GetSlip error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "UNAUTHORIZED") {
		t.Errorf("body = %s, want memuat UNAUTHORIZED", rec.Body.String())
	}
}

func TestGetSlip_TolakTokenNgawur(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	h := New(nil, nil)
	c, rec := newCtx(http.MethodGet, "/api/v1/public/slip?token=abc.def")
	_ = h.GetSlip(c)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestGetSlipDetail_TolakTokenNgawur(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	h := New(nil, nil)
	c, rec := newCtx(http.MethodGet, "/api/v1/public/slip/detail?token=abc.def&periode=2026-10")
	_ = h.GetSlipDetail(c)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

// Token valid tanpa periode → 400 (validasi) sebelum menyentuh service.
func TestGetSlipDetail_WajibPeriode(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	token, _ := Sign(1)
	h := New(nil, nil)
	c, rec := newCtx(http.MethodGet, "/api/v1/public/slip/detail?token="+token)
	if err := h.GetSlipDetail(c); err != nil {
		t.Fatalf("GetSlipDetail error: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 (periode wajib)", rec.Code)
	}
}
