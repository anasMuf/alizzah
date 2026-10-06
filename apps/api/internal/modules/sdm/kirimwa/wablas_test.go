package kirimwa

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// TestSendMessage_MengirimFormDanHeader memverifikasi kontrak Wablas: metode
// POST ke {domain}/api/send-message, nomor ternormalisasi di form, dan header
// Authorization berisi token.
func TestSendMessage_MengirimFormDanHeader(t *testing.T) {
	var gotMethod, gotAuth, gotPhone, gotMessage string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotAuth = r.Header.Get("Authorization")
		_ = r.ParseForm()
		gotPhone = r.PostFormValue("phone")
		gotMessage = r.PostFormValue("message")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":true}`))
	}))
	defer srv.Close()

	c := &Client{domain: srv.URL, token: "tok-rahasia", http: srv.Client()}
	if err := c.SendMessage("0812-3456-789", "halo"); err != nil {
		t.Fatalf("SendMessage error: %v", err)
	}
	if gotMethod != http.MethodPost {
		t.Errorf("method = %q, want POST", gotMethod)
	}
	if gotAuth != "tok-rahasia" {
		t.Errorf("Authorization = %q", gotAuth)
	}
	if gotPhone != "628123456789" {
		t.Errorf("phone = %q, want 628123456789 (ternormalisasi)", gotPhone)
	}
	if gotMessage != "halo" {
		t.Errorf("message = %q", gotMessage)
	}
}

// TestSendMessage_GagalMembawaPesanWablas memastikan pesan error dari Wablas
// diteruskan (agar tersimpan di PesanError).
func TestSendMessage_GagalMembawaPesanWablas(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":false,"message":"token device tidak valid"}`))
	}))
	defer srv.Close()

	c := &Client{domain: srv.URL, token: "x", http: srv.Client()}
	err := c.SendMessage("0812", "x")
	if err == nil || !strings.Contains(err.Error(), "token device tidak valid") {
		t.Fatalf("err = %v, want memuat pesan Wablas", err)
	}
}

func TestSendMessage_TolakTanpaKonfigurasi(t *testing.T) {
	c := &Client{}
	if err := c.SendMessage("0812", "x"); err == nil {
		t.Fatal("harus error bila domain/token kosong")
	}
}

func TestSendMessage_TolakNomorKosong(t *testing.T) {
	c := &Client{domain: "http://localhost:1", token: "x", http: http.DefaultClient}
	if err := c.SendMessage("abc", "x"); err == nil {
		t.Fatal("harus error bila nomor tidak valid")
	}
}
