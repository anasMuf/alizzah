package guru

import "testing"

func TestNormalizePhone(t *testing.T) {
	cases := map[string]string{
		"":                  "",
		"08123456789":       "+628123456789",
		"8123456789":        "+628123456789",
		"+62 812-3456-789":  "+628123456789",
		"62 812 3456 789":   "+628123456789",
		"021-1234567":       "+62211234567",
		"  0812 3456 789  ": "+628123456789",
		"+62812.3456.789":   "+628123456789",
		"no digits here":    "",
	}
	for in, want := range cases {
		if got := normalizePhone(in); got != want {
			t.Errorf("normalizePhone(%q) = %q, want %q", in, got, want)
		}
	}
}
