// Package publik menyediakan tampilan publik (tanpa login) untuk slip gaji
// karyawan via tautan ber-token stateless, plus endpoint admin untuk membuat
// tautan tsb. Lihat docs/sdm/kirim-wa-plan.md.
package publik

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

// secret diambil dari env; fallback ke JWT_SECRET agar dev tetap jalan.
func secret() []byte {
	s := os.Getenv("PUBLIC_LINK_SECRET")
	if s == "" {
		s = os.Getenv("JWT_SECRET")
	}
	return []byte(s)
}

func ttl() time.Duration {
	hours := 72
	if v := os.Getenv("PUBLIC_LINK_TTL_HOURS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			hours = n
		}
	}
	return time.Duration(hours) * time.Hour
}

// Sign menghasilkan token stateless untuk satu karyawan beserta waktu kedaluwarsa.
func Sign(employeeID uint) (token string, expiresAt time.Time) {
	expiresAt = time.Now().Add(ttl())
	payload := strconv.FormatUint(uint64(employeeID), 10) + "." + strconv.FormatInt(expiresAt.Unix(), 10)
	mac := hmac.New(sha256.New, secret())
	_, _ = mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + sig, expiresAt
}

// Verify memeriksa token & mengembalikan employee_id; error bila tidak valid
// atau kedaluwarsa.
func Verify(token string) (uint, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return 0, errors.New("tautan tidak valid")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return 0, errors.New("tautan tidak valid")
	}
	mac := hmac.New(sha256.New, secret())
	_, _ = mac.Write(payload)
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return 0, errors.New("tautan tidak valid")
	}
	seg := strings.SplitN(string(payload), ".", 2)
	if len(seg) != 2 {
		return 0, errors.New("tautan tidak valid")
	}
	id, err := strconv.ParseUint(seg[0], 10, 64)
	if err != nil || id == 0 {
		return 0, errors.New("tautan tidak valid")
	}
	exp, err := strconv.ParseInt(seg[1], 10, 64)
	if err != nil {
		return 0, errors.New("tautan tidak valid")
	}
	if time.Now().Unix() > exp {
		return 0, errors.New("tautan sudah kedaluwarsa")
	}
	return uint(id), nil
}

// PublicURL menyusun tautan publik lengkap dari PUBLIC_APP_URL.
func PublicURL(token string) string {
	base := strings.TrimRight(os.Getenv("PUBLIC_APP_URL"), "/")
	if base == "" {
		base = "http://localhost:3000"
	}
	return base + "/s/" + token
}
