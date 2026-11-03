package kirimwa

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func newWebhookCtx(method, target, body, contentType string) (echo.Context, *httptest.ResponseRecorder) {
	e := echo.New()
	req := httptest.NewRequest(method, target, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set(echo.HeaderContentType, contentType)
	}
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec), rec
}

func TestTrackingWebhook_TanpaSecretDitolak(t *testing.T) {
	t.Setenv(WebhookSecretEnv, "")
	h := NewHandler(&Service{})
	c, rec := newWebhookCtx(http.MethodPost, "/public/wablas/tracking", `{}`, echo.MIMEApplicationJSON)
	if err := h.TrackingWebhook(c); err != nil {
		t.Fatalf("TrackingWebhook error: %v", err)
	}
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, mau 503 (webhook belum dikonfigurasi)", rec.Code)
	}
}

func TestTrackingWebhook_SecretSalahDitolak(t *testing.T) {
	t.Setenv(WebhookSecretEnv, "rahasia")
	h := NewHandler(&Service{})
	c, rec := newWebhookCtx(http.MethodPost, "/public/wablas/tracking?secret=salah", `{}`, echo.MIMEApplicationJSON)
	if err := h.TrackingWebhook(c); err != nil {
		t.Fatalf("TrackingWebhook error: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, mau 401", rec.Code)
	}
}

// TestTrackingWebhook_MenyamakanStatus memastikan event `delivered` dari Wablas
// mengubah baris `unknown` (timeout) menjadi `sent`, dan event `cancel` tidak
// menurunkan baris yang sudah `sent`.
func TestTrackingWebhook_MenyamakanStatus(t *testing.T) {
	db := newTestDB(t)
	repo := NewRepository(db)
	p := time.Date(2026, 10, 5, 0, 0, 0, 0, time.Local)
	if err := repo.Upsert(&KirimWA{
		EmployeeID: 1, Periode: p, NoTelp: "+628111222", Status: StatusUnknown,
		PesanError: "Belum pasti: timeout",
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	t.Setenv(WebhookSecretEnv, "rahasia")
	h := NewHandler(&Service{repo: repo})

	call := func(body string) {
		c, rec := newWebhookCtx(http.MethodPost, "/public/wablas/tracking?secret=rahasia", body, echo.MIMEApplicationJSON)
		if err := h.TrackingWebhook(c); err != nil {
			t.Fatalf("TrackingWebhook error: %v", err)
		}
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, mau 200 (body: %s)", rec.Code, rec.Body.String())
		}
	}
	statusOf := func() (string, string) {
		var row struct {
			Status     string
			PesanError string
		}
		if err := db.Raw("SELECT status, pesan_error FROM sdm_kirim_wa LIMIT 1").Scan(&row).Error; err != nil {
			t.Fatalf("baca status: %v", err)
		}
		return row.Status, row.PesanError
	}

	call(`{"id":"abc","phone":"628111222","status":"delivered","deviceId":"D1"}`)
	if st, pesan := statusOf(); st != StatusSent || pesan != "" {
		t.Fatalf("setelah delivered: status=%q pesan=%q, mau sent tanpa pesan_error", st, pesan)
	}

	// Event lama `cancel` tidak boleh menurunkan baris yang sudah sent.
	call(`{"id":"abc","phone":"628111222","status":"cancel","deviceId":"D1"}`)
	if st, _ := statusOf(); st != StatusSent {
		t.Fatalf("setelah cancel: status=%q, mau tetap sent", st)
	}
}

// TestTrackingWebhook_StatusPendingDiabaikan memastikan event `pending` tidak
// mengubah status (baris belum dianggap terkirim sebelum ada bukti).
func TestTrackingWebhook_StatusPendingDiabaikan(t *testing.T) {
	db := newTestDB(t)
	repo := NewRepository(db)
	p := time.Date(2026, 10, 5, 0, 0, 0, 0, time.Local)
	if err := repo.Upsert(&KirimWA{
		EmployeeID: 1, Periode: p, NoTelp: "628111222", Status: StatusFailed, PesanError: "timeout",
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	t.Setenv(WebhookSecretEnv, "rahasia")
	h := NewHandler(&Service{repo: repo})
	c, rec := newWebhookCtx(http.MethodGet,
		"/public/wablas/tracking?secret=rahasia&phone=628111222&status=pending", "", "")
	if err := h.TrackingWebhook(c); err != nil {
		t.Fatalf("TrackingWebhook error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, mau 200", rec.Code)
	}
	var st string
	if err := db.Raw("SELECT status FROM sdm_kirim_wa LIMIT 1").Scan(&st).Error; err != nil {
		t.Fatalf("baca status: %v", err)
	}
	if st != StatusFailed {
		t.Fatalf("status = %q, mau tetap %q", st, StatusFailed)
	}
}

// TestTrackingWebhook_EventNonTrackingDiabaikan memastikan payload jenis lain
// (mis. pesan masuk / status device) dibalas 200 "ignored" — bukan 400 — agar
// Wablas tidak menandai webhook gagal ketika satu URL menerima semua event.
func TestTrackingWebhook_EventNonTrackingDiabaikan(t *testing.T) {
	t.Setenv(WebhookSecretEnv, "rahasia")
	h := NewHandler(&Service{})
	c, rec := newWebhookCtx(http.MethodPost, "/public/wablas/tracking?secret=rahasia",
		`{"id":"abc","sender":"628","status":"connected","deviceName":"X"}`,
		echo.MIMEApplicationJSON)
	if err := h.TrackingWebhook(c); err != nil {
		t.Fatalf("TrackingWebhook error: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, mau 200 (diabaikan)", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "ignored") {
		t.Fatalf("body = %s, mau memuat ignored", rec.Body.String())
	}
}
