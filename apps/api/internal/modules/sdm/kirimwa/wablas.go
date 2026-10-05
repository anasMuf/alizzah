package kirimwa

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

// Client — klien tipis Wablas untuk mengirim pesan teks (send-message).
// Domain & token dibaca dari env (JANGAN hardcode — lihat docs/sdm/kirim-wa-plan.md).
type Client struct {
	domain string
	token  string
	http   *http.Client
}

// NewClientFromEnv membangun klien dari WABLAS_DOMAIN & WABLAS_TOKEN.
func NewClientFromEnv() *Client {
	return &Client{
		domain: strings.TrimRight(os.Getenv("WABLAS_DOMAIN"), "/"),
		token:  os.Getenv("WABLAS_TOKEN"),
		http:   &http.Client{Timeout: 20 * time.Second},
	}
}

// Configured true bila domain & token tersedia.
func (c *Client) Configured() bool { return c.domain != "" && c.token != "" }

// NormalizePhone membersihkan nomor ke format internasional 62xxxxxxxxxx.
// Mengikuti normalisasiNomorWA() aplikasi lama; false bila kosong.
func NormalizePhone(phone string) (string, bool) {
	var b strings.Builder
	for _, r := range phone {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	p := b.String()
	if p == "" {
		return "", false
	}
	if strings.HasPrefix(p, "0") {
		p = "62" + p[1:]
	} else if !strings.HasPrefix(p, "62") {
		p = "62" + p
	}
	return p, true
}

// SendMessage mengirim pesan teks ke `phone`. Error berisi pesan dari Wablas
// bila server menolak (status != true).
func (c *Client) SendMessage(phone, message string) error {
	if !c.Configured() {
		return errors.New("Wablas belum dikonfigurasi (WABLAS_DOMAIN/WABLAS_TOKEN)")
	}
	dest, ok := NormalizePhone(phone)
	if !ok {
		return errors.New("nomor WA kosong/tidak valid")
	}

	form := url.Values{}
	form.Set("phone", dest)
	form.Set("message", message)

	req, err := http.NewRequest(http.MethodPost, c.domain+"/api/send-message", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("koneksi ke Wablas gagal: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	var out struct {
		Status  bool   `json:"status"`
		Message string `json:"message"`
	}
	_ = json.Unmarshal(body, &out)
	if out.Status {
		return nil
	}

	msg := strings.TrimSpace(out.Message)
	if msg == "" {
		msg = strings.TrimSpace(string(body))
	}
	if msg == "" {
		msg = fmt.Sprintf("Wablas mengembalikan HTTP %d", resp.StatusCode)
	}
	return errors.New(msg)
}
