package seeders

import (
	"api/model"
	"log"

	"gorm.io/gorm"
)

func SeedDispensations(db *gorm.DB) {
	var count int64
	db.Model(&model.Dispensation{}).Count(&count)
	if count > 0 {
		return
	}

	var activeYear model.AcademicYear
	if err := db.Where("is_active = ?", true).First(&activeYear).Error; err != nil {
		log.Println("Skip seed dispensations: no active academic year")
		return
	}

	var admin model.User
	if err := db.Where("role = ?", "superadmin").First(&admin).Error; err != nil {
		log.Println("Skip seed dispensations: no superadmin")
		return
	}

	// Get a few students to assign dispensations to
	var students []model.Student
	db.Limit(3).Find(&students)
	if len(students) < 3 {
		log.Println("Skip seed dispensations: not enough students")
		return
	}

	dispensations := []model.Dispensation{
		{
			StudentID:      students[0].ID,
			AcademicYearID: activeYear.ID,
			FeeCategory:    "monthly_spp",
			DiscountType:   "percent",
			DiscountValue:  50,
			IsPermanent:    true,
			StartMonth:     7,
			StartYear:      2025,
			Reason:         "Anak Guru",
			Notes:          "Ibu Siti - guru kelas Mutiara",
			IsActive:       true,
			CreatedBy:      admin.ID,
		},
		{
			StudentID:      students[0].ID,
			AcademicYearID: activeYear.ID,
			FeeCategory:    "monthly_spp",
			DiscountType:   "fixed",
			DiscountValue:  25000,
			IsPermanent:    true,
			StartMonth:     7,
			StartYear:      2025,
			Reason:         "Satu Dusun",
			Notes:          "Domisili di dusun yang sama dengan sekolah",
			IsActive:       true,
			CreatedBy:      admin.ID,
		},
		{
			StudentID:      students[1].ID,
			AcademicYearID: activeYear.ID,
			FeeCategory:    "monthly_spp",
			DiscountType:   "percent",
			DiscountValue:  25,
			IsPermanent:    true,
			StartMonth:     7,
			StartYear:      2025,
			Reason:         "Yatim",
			IsActive:       true,
			CreatedBy:      admin.ID,
		},
	}

	for _, d := range dispensations {
		if err := db.Create(&d).Error; err != nil {
			log.Printf("Gagal seed dispensation '%s' for student %d: %v", d.Reason, d.StudentID, err)
		}
	}

	log.Printf("Seeded %d dispensations", len(dispensations))
}
