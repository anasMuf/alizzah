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
		"groups": []map[string]interface{}{
			{"days": []string{"senin", "rabu"}, "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
			{"days": []string{"jumat"}, "start": "07:15", "end": "09:00", "end_calisan": "09:30"},
		},
	})
	scheduleMutiara456, _ := json.Marshal(map[string]interface{}{
		"groups": []map[string]interface{}{
			{"days": []string{"selasa", "kamis"}, "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
			{"days": []string{"sabtu"}, "start": "07:15", "end": "09:00", "end_calisan": "09:30"},
		},
	})
	scheduleIntan, _ := json.Marshal(map[string]interface{}{
		"groups": []map[string]interface{}{
			{"days": []string{"senin", "selasa", "rabu", "kamis"}, "start": "07:15", "end": "10:00", "end_calisan": "10:30"},
			{"days": []string{"jumat", "sabtu"}, "start": "07:15", "end": "09:00"},
		},
	})
	scheduleBerlian, _ := json.Marshal(map[string]interface{}{
		"groups": []map[string]interface{}{
			{"days": []string{"senin", "selasa", "rabu", "kamis"}, "start": "07:15", "end": "10:30", "end_calisan": "11:00"},
			{"days": []string{"jumat", "sabtu"}, "start": "07:15", "end": "09:00"},
		},
	})

	type classGroupDef struct {
		Name     string
		Level    string
		Schedule []byte
	}

	groups := []classGroupDef{
		{"Mutiara 1", "mutiara", scheduleMutiara123},
		{"Mutiara 2", "mutiara", scheduleMutiara123},
		{"Mutiara 3", "mutiara", scheduleMutiara123},
		{"Mutiara 4", "mutiara", scheduleMutiara456},
		{"Mutiara 5", "mutiara", scheduleMutiara456},
		{"Mutiara 6", "mutiara", scheduleMutiara456},
		{"Intan 1", "intan", scheduleIntan},
		{"Intan 2", "intan", scheduleIntan},
		{"Intan 3", "intan", scheduleIntan},
		{"Intan 4", "intan", scheduleIntan},
		{"Intan 5", "intan", scheduleIntan},
		{"Intan 6", "intan", scheduleIntan},
		{"Intan 7", "intan", scheduleIntan},
		{"Intan 8", "intan", scheduleIntan},
		{"Berlian 1", "berlian", scheduleBerlian},
		{"Berlian 2", "berlian", scheduleBerlian},
		{"Berlian 3", "berlian", scheduleBerlian},
		{"Berlian 4", "berlian", scheduleBerlian},
		{"Berlian 5", "berlian", scheduleBerlian},
		{"Berlian 6", "berlian", scheduleBerlian},
		{"Berlian 7", "berlian", scheduleBerlian},
		{"Berlian 8", "berlian", scheduleBerlian},
	}

	for _, g := range groups {
		cg := model.ClassGroup{
			AcademicYearID: activeYear.ID,
			Name:           g.Name,
			Level:          g.Level,
			Schedule:       g.Schedule,
		}
		if err := db.Create(&cg).Error; err != nil {
			log.Printf("Gagal membuat class group '%s': %v", g.Name, err)
		}
	}
	log.Println("Class group seeder berhasil (22 rombel)")
}
