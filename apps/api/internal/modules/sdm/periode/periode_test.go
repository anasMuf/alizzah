package periode

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestDefaultPayDate(t *testing.T) {
	require.Equal(t, time.Date(2026, time.November, 5, 0, 0, 0, 0, time.Local),
		DefaultPayDate(MustParse("2026-10")))

	// Pergantian tahun: gaji Desember dibayar 5 Januari tahun berikutnya.
	require.Equal(t, time.Date(2027, time.January, 5, 0, 0, 0, 0, time.Local),
		DefaultPayDate(MustParse("2026-12")))
}

func TestParsePayDate(t *testing.T) {
	got, err := ParsePayDate("2026-11-03")
	require.NoError(t, err)
	require.Equal(t, time.Date(2026, time.November, 3, 0, 0, 0, 0, time.Local), got)

	_, err = ParsePayDate("03/11/2026")
	require.Error(t, err)
}
