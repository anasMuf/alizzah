package seeders

import (
	"api/model"
	"encoding/json"
	"log"

	"gorm.io/gorm"
)

func SeedClassGroups(db *gorm.DB) {
	var count int64
	db.Model(&model.ClassGroup{}).Count(&count)
	if count > 0 {
		log.Println("Class groups sudah ada, skip seeder")
		return
	}

	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Gagal cari tahun ajaran aktif untuk class group seeder:", err)
		return
	}

	scheduleMutiara123, _ := json.Marshal(map[string]interface{}{
		"weekdays": map[string]interface{}{
			"days": []string{"senin", "rabu"}, "time_in": "07:15", "time_out": "10:00", "time_out_calisan": "10:30",
		},
		"weekend": map[string]interface{}{
			"days": []string{"jumat"}, "time_in": "07:15", "time_out": "09:00", "time_out_calisan": "09:30",
		},
	})
	scheduleMutiara456, _ := json.Marshal(map[string]interface{}{
		"weekdays": map[string]interface{}{
			"days": []string{"selasa", "kamis"}, "time_in": "07:15", "time_out": "10:00", "time_out_calisan": "10:30",
		},
		"weekend": map[string]interface{}{
			"days": []string{"sabtu"}, "time_in": "07:15", "time_out": "09:00", "time_out_calisan": "09:30",
		},
	})
	scheduleIntan, _ := json.Marshal(map[string]interface{}{
		"weekdays": map[string]interface{}{
			"days": []string{"senin", "selasa", "rabu", "kamis"}, "time_in": "07:15", "time_out": "10:00", "time_out_calisan": "10:30",
		},
		"weekend": map[string]interface{}{
			"days": []string{"jumat", "sabtu"}, "time_in": "07:15", "time_out": "09:00",
		},
	})
	scheduleBerlian, _ := json.Marshal(map[string]interface{}{
		"weekdays": map[string]interface{}{
			"days": []string{"senin", "selasa", "rabu", "kamis"}, "time_in": "07:15", "time_out": "10:30", "time_out_calisan": "11:00",
		},
		"weekend": map[string]interface{}{
			"days": []string{"jumat", "sabtu"}, "time_in": "07:15", "time_out": "09:00",
		},
	})

	type classGroupDef struct {
		Name       string
		Level      string
		Schedule   []byte
		IsMutation bool
	}

	groups := []classGroupDef{
		{"Mutiara 1", "mutiara", scheduleMutiara123, false},
		{"Mutiara 2", "mutiara", scheduleMutiara123, false},
		{"Mutiara 3", "mutiara", scheduleMutiara123, false},
		{"Mutiara 4", "mutiara", scheduleMutiara456, false},
		{"Mutiara 5", "mutiara", scheduleMutiara456, false},
		{"Intan 1", "intan", scheduleIntan, true},
		{"Intan 2", "intan", scheduleIntan, false},
		{"Intan 3", "intan", scheduleIntan, false},
		{"Intan 4", "intan", scheduleIntan, false},
		{"Intan 5", "intan", scheduleIntan, false},
		{"Intan 6", "intan", scheduleIntan, false},
		{"Intan 7", "intan", scheduleIntan, false},
		{"Intan 8", "intan", scheduleIntan, true},
		{"Berlian 1", "berlian", scheduleBerlian, false},
		{"Berlian 2", "berlian", scheduleBerlian, false},
		{"Berlian 3", "berlian", scheduleBerlian, false},
		{"Berlian 4", "berlian", scheduleBerlian, false},
		{"Berlian 5", "berlian", scheduleBerlian, false},
		{"Berlian 6", "berlian", scheduleBerlian, false},
		{"Berlian 7", "berlian", scheduleBerlian, false},
		{"Berlian 8", "berlian", scheduleBerlian, false},
	}

	for _, g := range groups {
		cg := model.ClassGroup{
			AcademicYearID: activeYear.ID,
			Name:           g.Name,
			Level:          g.Level,
			Schedule:       g.Schedule,
			IsMutation:     g.IsMutation,
		}
		if err := db.Create(&cg).Error; err != nil {
			log.Printf("Gagal membuat class group '%s': %v", g.Name, err)
		}
	}
	log.Println("Class group seeder berhasil (21 rombel)")
}

// FixClassGroupSchedules migrates schedule data from old "groups" format to new "weekdays/weekend" format.
func FixClassGroupSchedules(db *gorm.DB) {
	var classGroups []model.ClassGroup
	db.Find(&classGroups)

	fixed := 0
	for _, cg := range classGroups {
		var raw map[string]interface{}
		if err := json.Unmarshal(cg.Schedule, &raw); err != nil {
			continue
		}

		// Check if using old "groups" format
		groups, ok := raw["groups"]
		if !ok {
			continue // Already in new format
		}

		groupSlice, ok := groups.([]interface{})
		if !ok || len(groupSlice) == 0 {
			continue
		}

		var weekdays, weekend map[string]interface{}

		if len(groupSlice) >= 1 {
			if g, ok := groupSlice[0].(map[string]interface{}); ok {
				weekdays = map[string]interface{}{
					"days":     g["days"],
					"time_in":  g["start"],
					"time_out": g["end"],
				}
				if cal, exists := g["end_calisan"]; exists {
					weekdays["time_out_calisan"] = cal
				}
			}
		}
		if len(groupSlice) >= 2 {
			if g, ok := groupSlice[1].(map[string]interface{}); ok {
				weekend = map[string]interface{}{
					"days":     g["days"],
					"time_in":  g["start"],
					"time_out": g["end"],
				}
				if cal, exists := g["end_calisan"]; exists {
					weekend["time_out_calisan"] = cal
				}
			}
		}

		newSchedule := map[string]interface{}{}
		if weekdays != nil {
			newSchedule["weekdays"] = weekdays
		}
		if weekend != nil {
			newSchedule["weekend"] = weekend
		}

		newJSON, err := json.Marshal(newSchedule)
		if err != nil {
			continue
		}

		db.Model(&cg).Update("schedule", newJSON)
		fixed++
	}

	if fixed > 0 {
		log.Printf("Fixed schedule format for %d class groups", fixed)
	}
}
