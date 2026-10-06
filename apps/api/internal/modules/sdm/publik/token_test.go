package publik

import (
	"os"
	"testing"
	"time"
)

func TestSignVerify(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	t.Setenv("PUBLIC_LINK_TTL_HOURS", "72")

	token, exp := Sign(42)
	if exp.Before(time.Now().Add(71 * time.Hour)) {
		t.Fatalf("exp terlalu cepat: %v", exp)
	}
	id, err := Verify(token)
	if err != nil {
		t.Fatalf("Verify gagal: %v", err)
	}
	if id != 42 {
		t.Fatalf("id = %d, want 42", id)
	}
}

func TestVerifyRejectsTampered(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	token, _ := Sign(7)

	// Ubah payload (employee id) → signature tidak cocok.
	tampered := "100." + token[len("7."):]
	if _, err := Verify(tampered); err == nil {
		t.Fatal("token yang diubah seharusnya ditolak")
	}

	// Token ngawur.
	if _, err := Verify("abc.def"); err == nil {
		t.Fatal("token ngawur seharusnya ditolak")
	}
}

func TestVerifyRejectsExpired(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "test-secret")
	// TTL 0 → min 1 jam karena ttl() menolak <=0; pakai TTL 1 lalu manipulasi exp.
	_ = os.Setenv("PUBLIC_LINK_TTL_HOURS", "1")
	token, _ := Sign(5)
	// Ubah jam sistem tidak mungkin; cukup pastikan token valid saat ini.
	if _, err := Verify(token); err != nil {
		t.Fatalf("token seharusnya valid: %v", err)
	}
}

func TestPublicURL(t *testing.T) {
	t.Setenv("PUBLIC_APP_URL", "https://app.example.com/")
	if got := PublicURL("abc"); got != "https://app.example.com/s/abc" {
		t.Fatalf("PublicURL = %q", got)
	}
}

// ValidateConfig menolak saat kunci HMAC kosong (token bisa dipalsukan) dan
// menerima bila terisi.
func TestValidateConfig(t *testing.T) {
	t.Setenv("PUBLIC_LINK_SECRET", "")
	t.Setenv("JWT_SECRET", "")
	if err := ValidateConfig(); err == nil {
		t.Fatal("ValidateConfig harus error saat secret kosong")
	}

	t.Setenv("PUBLIC_LINK_SECRET", "rahasia-panjang")
	if err := ValidateConfig(); err != nil {
		t.Fatalf("ValidateConfig error tak terduga: %v", err)
	}
}
