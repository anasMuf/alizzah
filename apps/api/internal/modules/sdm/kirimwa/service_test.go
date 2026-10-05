package kirimwa

import (
	"strings"
	"testing"
)

func TestNormalizePhone(t *testing.T) {
	cases := []struct {
		in   string
		want string
		ok   bool
	}{
		{"08123456789", "628123456789", true},
		{"+62 812-3456-789", "628123456789", true},
		{"628123456789", "628123456789", true},
		{"8123456789", "628123456789", true},
		{"", "", false},
		{"   ", "", false},
	}
	for _, c := range cases {
		got, ok := NormalizePhone(c.in)
		if ok != c.ok || got != c.want {
			t.Errorf("NormalizePhone(%q) = (%q,%v), mau (%q,%v)", c.in, got, ok, c.want, c.ok)
		}
	}
}

func TestBuildMessage(t *testing.T) {
	msg := BuildMessage("Abdul Rohim", "Oktober 2026", 1810000, "https://x/s/abc")
	for _, want := range []string{
		"Assalamu'alaikum, Abdul Rohim",
		"Alhamdulillah",
		"Semoga Barokah & membawa banyak manfaat",
		"Oktober 2026",
		"Rp 1.810.000",
		"https://x/s/abc",
	} {
		if !strings.Contains(msg, want) {
			t.Errorf("pesan tidak memuat %q:\n%s", want, msg)
		}
	}
}

func TestRupiah(t *testing.T) {
	cases := map[int]string{
		0:       "Rp 0",
		500:     "Rp 500",
		1000:    "Rp 1.000",
		1810000: "Rp 1.810.000",
	}
	for in, want := range cases {
		if got := rupiah(in); got != want {
			t.Errorf("rupiah(%d) = %q, mau %q", in, got, want)
		}
	}
}
