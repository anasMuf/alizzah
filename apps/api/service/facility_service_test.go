package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFacilityItemNameMatches(t *testing.T) {
	tests := []struct {
		name         string
		itemName     string
		facilityName string
		zoneNames    []string
		want         bool
	}{
		{
			name:         "cocok nama fasilitas persis",
			itemName:     "Antar Jemput",
			facilityName: "Antar Jemput",
			want:         true,
		},
		{
			name:         "cocok nama fasilitas dengan jumlah hari",
			itemName:     "Antar Jemput (24 hari)",
			facilityName: "Antar Jemput",
			want:         true,
		},
		{
			name:         "cocok nama zona dengan jumlah hari",
			itemName:     "ZONA 2 (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{"ZONA 2"},
			want:         true,
		},
		{
			name:         "zona prefix tidak ikut cocok (ZONA 2 vs ZONA 20)",
			itemName:     "ZONA 20 (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{"ZONA 2"},
			want:         false,
		},
		{
			name:         "zona prefix tidak ikut cocok (ZONA 1 vs ZONA 10)",
			itemName:     "ZONA 10 (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{"ZONA 1"},
			want:         false,
		},
		{
			name:         "substring di tengah tidak cocok",
			itemName:     "Layanan ZONA 2 Pagi (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{"ZONA 2"},
			want:         false,
		},
		{
			name:         "suffix lain selain format jumlah hari tidak cocok",
			itemName:     "Antar Jemput Reguler",
			facilityName: "Antar Jemput",
			want:         false,
		},
		{
			name:         "zona kosong diabaikan",
			itemName:     "Antar Jemput (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{""},
			want:         true,
		},
		{
			name:         "nama berbeda tidak cocok",
			itemName:     "Katering (24 hari)",
			facilityName: "Antar Jemput",
			zoneNames:    []string{"ZONA 2"},
			want:         false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := facilityItemNameMatches(tt.itemName, tt.facilityName, tt.zoneNames...)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestFacilityItemNameCondition(t *testing.T) {
	cond, args := facilityItemNameCondition("Antar Jemput", []string{"ZONA 2", ""})
	assert.Equal(t, "(name ILIKE ? OR name ILIKE ? OR name ILIKE ? OR name ILIKE ?)", cond)
	assert.Equal(t, []any{"Antar Jemput", "Antar Jemput (%", "ZONA 2", "ZONA 2 (%"}, args)
}

func TestFacilityItemNameCondition_Empty(t *testing.T) {
	// Semua nama kosong → kondisi harus tidak mencocokkan apa pun, bukan SQL invalid "()"
	cond, args := facilityItemNameCondition("", []string{""})
	assert.Equal(t, "1=0", cond)
	assert.Nil(t, args)
}

func TestFacilityItemNameCondition_EscapesWildcards(t *testing.T) {
	cond, args := facilityItemNameCondition("", []string{"ZONA_2%"})
	assert.Equal(t, "(name ILIKE ? OR name ILIKE ?)", cond)
	assert.Equal(t, []any{`ZONA\_2\%`, `ZONA\_2\% (%`}, args)
}
