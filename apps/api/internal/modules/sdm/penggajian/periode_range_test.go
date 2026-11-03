package penggajian

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func dateAt(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.Local)
}

// TestMonthsInRange_DayFiveAnchor memastikan bulan yang dihitung memakai
// anchor tgl 5, dan batas tahun ajaran standar menghasilkan 11 bulan
// (Juli dikecualikan karena TA mulai tgl 13).
func TestMonthsInRange_DayFiveAnchor(t *testing.T) {
	got := monthsInRange(dateAt(2026, time.July, 13), dateAt(2027, time.June, 30))

	require.Len(t, got, 11)
	require.Equal(t, dateAt(2026, time.August, 5), got[0])
	require.Equal(t, dateAt(2027, time.June, 5), got[len(got)-1])
}

// TestMonthsInRange_EndsBeforePayday: TA berakhir tgl 4 → bulan terakhir (Juni)
// tidak ikut karena anchor tgl 5 berada setelah end_date.
func TestMonthsInRange_EndsBeforePayday(t *testing.T) {
	got := monthsInRange(dateAt(2026, time.July, 1), dateAt(2027, time.June, 4))

	require.Len(t, got, 11)
	require.Equal(t, dateAt(2026, time.July, 5), got[0])
	require.Equal(t, dateAt(2027, time.May, 5), got[len(got)-1])
}

// TestMonthsInRange_StartsAfterPayday: TA mulai tgl 6 → bulan pertama (Juli)
// tidak ikut karena anchor tgl 5 berada sebelum start_date.
func TestMonthsInRange_StartsAfterPayday(t *testing.T) {
	got := monthsInRange(dateAt(2026, time.July, 6), dateAt(2027, time.June, 30))

	require.Len(t, got, 11)
	require.Equal(t, dateAt(2026, time.August, 5), got[0])
}
