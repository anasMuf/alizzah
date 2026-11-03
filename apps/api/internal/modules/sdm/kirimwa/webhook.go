package kirimwa

import (
	"crypto/subtle"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
)

// WebhookSecretEnv — nama env berisi secret yang ikut di URL tracking Wablas
// (`.../v1/public/wablas/tracking?secret=...`). Endpoint ini tanpa JWT, jadi
// secret adalah satu-satunya penjaga.
const WebhookSecretEnv = "WABLAS_WEBHOOK_SECRET"

// webhookPayload — payload tracking Wablas (lihat dokumentasi "Webhook For
// Tracking Whatsapp Message").
type webhookPayload struct {
	ID       string `json:"id"`
	Phone    string `json:"phone"`
	Status   string `json:"status"`
	DeviceID string `json:"deviceId"`
}

type webhookResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
}

// RegisterPublicRoutes mendaftarkan webhook tracking Wablas TANPA JWT.
func (h *Handler) RegisterPublicRoutes(api *echo.Group) {
	api.POST("/public/wablas/tracking", h.TrackingWebhook)
	// Wablas dapat mengirim via query string; sediakan GET agar kompatibel.
	api.GET("/public/wablas/tracking", h.TrackingWebhook)
}

// TrackingWebhook menerima callback status pesan dari Wablas lalu menyamakan
// status baris di `sdm_kirim_wa` (khususnya yang berstatus `unknown` karena
// timeout saat mengirim). Idempoten — aman menerima event berulang.
func (h *Handler) TrackingWebhook(c echo.Context) error {
	secret := strings.TrimSpace(os.Getenv(WebhookSecretEnv))
	if secret == "" {
		return c.JSON(http.StatusServiceUnavailable, webhookResponse{
			Status:  false,
			Message: "webhook belum dikonfigurasi (WABLAS_WEBHOOK_SECRET kosong)",
		})
	}
	got := c.QueryParam("secret")
	if got == "" {
		got = c.FormValue("secret")
	}
	if subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
		return c.JSON(http.StatusUnauthorized, webhookResponse{Status: false, Message: "secret tidak valid"})
	}

	var p webhookPayload
	_ = c.Bind(&p) // JSON body (format utama Wablas); abaikan error tipe konten.
	phone := firstNonEmpty(p.Phone, c.FormValue("phone"), c.QueryParam("phone"))
	status := firstNonEmpty(p.Status, c.FormValue("status"), c.QueryParam("status"))
	if phone == "" || status == "" {
		// Satu URL webhook di Wablas bisa menerima beberapa jenis event (pesan
		// masuk, tracking, status device). Event selain tracking tidak memuat
		// pasangan phone+status → abaikan dengan 200 agar Wablas tidak menganggap
		// webhook gagal/retry. Catat di log untuk diagnosis.
		log.Printf("[sdm-kirimwa] webhook diabaikan (bukan tracking) id=%s phone=%q status=%q device=%s",
			p.ID, phone, status, p.DeviceID)
		return c.JSON(http.StatusOK, webhookResponse{Status: true, Message: "ignored"})
	}

	synced, err := h.svc.SyncFromWablas(phone, status)
	if err != nil {
		log.Printf("[sdm-kirimwa] webhook status gagal (%s/%s): %v", phone, status, err)
		return c.JSON(http.StatusInternalServerError, webhookResponse{Status: false, Message: "gagal menyimpan status"})
	}
	log.Printf("[sdm-kirimwa] webhook status phone=%s status=%s id=%s device=%s tersinkron=%v",
		phone, status, p.ID, p.DeviceID, synced)
	return c.JSON(http.StatusOK, webhookResponse{Status: true, Message: "ok"})
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if s := strings.TrimSpace(v); s != "" {
			return s
		}
	}
	return ""
}
