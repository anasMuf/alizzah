package service

import (
	"api/dto"
	"api/model"
	"api/repository"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	db.AutoMigrate(
		&model.AcademicYear{},
		&model.ClassGroup{},
		&model.Student{},
		&model.StudentEnrollment{},
		&model.StudentAcademicEvent{},
		&model.User{},
	)
	return db
}

func seedPromotionData(t *testing.T, db *gorm.DB) (fromAY, toAY model.AcademicYear, fromCG, toCG model.ClassGroup, student model.Student) {
	t.Helper()

	user := model.User{Email: "admin@test.com", Password: "hashed", Role: "superadmin", FullName: "Admin"}
	db.Create(&user)

	fromAY = model.AcademicYear{Name: "2024/2025", StartDate: time.Date(2024, 7, 15, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2025, 6, 30, 0, 0, 0, 0, time.UTC), IsActive: false}
	db.Create(&fromAY)
	toAY = model.AcademicYear{Name: "2025/2026", StartDate: time.Date(2025, 7, 14, 0, 0, 0, 0, time.UTC), EndDate: time.Date(2026, 6, 30, 0, 0, 0, 0, time.UTC), IsActive: true}
	db.Create(&toAY)

	fromCG = model.ClassGroup{AcademicYearID: fromAY.ID, Name: "Mutiara 1", Level: "mutiara", Schedule: []byte(`{}`)}
	db.Create(&fromCG)
	toCG = model.ClassGroup{AcademicYearID: toAY.ID, Name: "Intan 1", Level: "intan", Schedule: []byte(`{}`)}
	db.Create(&toCG)

	student = model.Student{FullName: "Anak Satu", BirthPlace: "Jakarta", BirthDate: time.Date(2018, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "L", Status: "active"}
	db.Create(&student)

	enrollment := model.StudentEnrollment{
		StudentID: student.ID, ClassGroupID: fromCG.ID, AcademicYearID: fromAY.ID,
		StartDate: fromAY.StartDate, Status: "active", EnrollmentType: "new", CreatedBy: user.ID,
	}
	db.Create(&enrollment)

	return
}

func newTestAcademicEventService(db *gorm.DB) AcademicEventService {
	return NewAcademicEventService(
		db,
		repository.NewStudentEnrollmentRepository(db),
		repository.NewStudentRepository(db),
		repository.NewStudentAcademicEventRepository(db),
		repository.NewClassGroupRepository(db),
		repository.NewAcademicYearRepository(db),
		nil, nil, nil,
	)
}

// --- Promotion Tests ---

func TestProcessPromotion_InvalidDateFormat(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, _ := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	_, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "invalid-date",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Format event_date tidak valid")
}

func TestProcessPromotion_SameYear(t *testing.T) {
	db := setupTestDB(t)
	svc := newTestAcademicEventService(db)

	_, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: 1,
		ToAcademicYearID:   1,
		EventDate:          "2025-06-30",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tidak boleh sama")
}

func TestProcessPromotion_Success(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, student := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	result, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Promoted)
	assert.Equal(t, 0, result.Retained)
	assert.Empty(t, result.Errors)

	// Old enrollment closed
	var oldEnrollment model.StudentEnrollment
	db.Where("student_id = ? AND academic_year_id = ?", student.ID, fromAY.ID).First(&oldEnrollment)
	assert.Equal(t, "completed", oldEnrollment.Status)
	assert.NotNil(t, oldEnrollment.EndDate)

	// New enrollment created with CreatedBy set
	var newEnrollment model.StudentEnrollment
	db.Where("student_id = ? AND academic_year_id = ?", student.ID, toAY.ID).First(&newEnrollment)
	assert.Equal(t, "active", newEnrollment.Status)
	assert.Equal(t, uint(1), newEnrollment.CreatedBy)

	// Event logged
	var event model.StudentAcademicEvent
	db.Where("student_id = ?", student.ID).First(&event)
	assert.Equal(t, "promotion", event.EventType)
}

func TestProcessPromotion_WithMapping(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, fromCG, _, student := seedPromotionData(t, db)

	targetCG := model.ClassGroup{AcademicYearID: toAY.ID, Name: "Intan 3", Level: "intan", Schedule: []byte(`{}`)}
	db.Create(&targetCG)

	svc := newTestAcademicEventService(db)

	result, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
		Mappings: []dto.ClassGroupMapping{
			{FromClassGroupID: fromCG.ID, ToClassGroupID: targetCG.ID},
		},
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.Promoted)

	// Placed in mapped class, not first-by-level
	var newEnrollment model.StudentEnrollment
	db.Where("student_id = ? AND academic_year_id = ?", student.ID, toAY.ID).First(&newEnrollment)
	assert.Equal(t, targetCG.ID, newEnrollment.ClassGroupID)
}

func TestProcessPromotion_RetainedStudent(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, student := seedPromotionData(t, db)

	retainedCG := model.ClassGroup{AcademicYearID: toAY.ID, Name: "Mutiara 1", Level: "mutiara", Schedule: []byte(`{}`)}
	db.Create(&retainedCG)

	svc := newTestAcademicEventService(db)

	result, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
		RetainedStudentIDs: []uint{student.ID},
	})

	assert.NoError(t, err)
	assert.Equal(t, 0, result.Promoted)
	assert.Equal(t, 1, result.Retained)

	var newEnrollment model.StudentEnrollment
	db.Where("student_id = ? AND academic_year_id = ?", student.ID, toAY.ID).First(&newEnrollment)
	assert.Equal(t, retainedCG.ID, newEnrollment.ClassGroupID)
	assert.Equal(t, "retained", newEnrollment.EnrollmentType)
}

func TestProcessPromotion_DuplicatePrevention(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, _ := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	// First promotion
	_, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
	})
	assert.NoError(t, err)

	// Re-activate old enrollment to simulate re-run
	db.Model(&model.StudentEnrollment{}).Where("academic_year_id = ? AND status = ?", fromAY.ID, "completed").Update("status", "active")

	// Second run should skip
	result, err := svc.ProcessPromotion(1, dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
	})
	assert.NoError(t, err)
	assert.Equal(t, 0, result.Promoted)
	assert.Len(t, result.Errors, 1)
	assert.Contains(t, result.Errors[0].Message, "Sudah diproses")
}

// --- ClassChange Tests ---

func TestProcessClassChange_InvalidDate(t *testing.T) {
	db := setupTestDB(t)
	svc := newTestAcademicEventService(db)

	err := svc.ProcessClassChange(1, dto.ClassChangeRequest{
		StudentID: 1, FromClassGroupID: 1, ToClassGroupID: 2, EventDate: "not-a-date",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Format event_date tidak valid")
}

func TestProcessClassChange_SameClass(t *testing.T) {
	db := setupTestDB(t)
	svc := newTestAcademicEventService(db)

	err := svc.ProcessClassChange(1, dto.ClassChangeRequest{
		StudentID: 1, FromClassGroupID: 1, ToClassGroupID: 1, EventDate: "2025-06-30",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "tidak boleh sama")
}

func TestProcessClassChange_Success(t *testing.T) {
	db := setupTestDB(t)
	fromAY, _, fromCG, _, student := seedPromotionData(t, db)

	toCG := model.ClassGroup{AcademicYearID: fromAY.ID, Name: "Mutiara 2", Level: "mutiara", Schedule: []byte(`{}`)}
	db.Create(&toCG)

	svc := newTestAcademicEventService(db)

	err := svc.ProcessClassChange(1, dto.ClassChangeRequest{
		StudentID: student.ID, FromClassGroupID: fromCG.ID, ToClassGroupID: toCG.ID, EventDate: "2025-03-15",
	})

	assert.NoError(t, err)

	var newEnrollment model.StudentEnrollment
	db.Where("student_id = ? AND class_group_id = ?", student.ID, toCG.ID).First(&newEnrollment)
	assert.Equal(t, "active", newEnrollment.Status)
	assert.Equal(t, uint(1), newEnrollment.CreatedBy)
	assert.Equal(t, "class_change", newEnrollment.EnrollmentType)
}

func TestProcessClassChange_CrossLevelBlocked(t *testing.T) {
	db := setupTestDB(t)
	fromAY, _, fromCG, _, student := seedPromotionData(t, db)

	toCG := model.ClassGroup{AcademicYearID: fromAY.ID, Name: "Intan 1", Level: "intan", Schedule: []byte(`{}`)}
	db.Create(&toCG)

	svc := newTestAcademicEventService(db)

	err := svc.ProcessClassChange(1, dto.ClassChangeRequest{
		StudentID: student.ID, FromClassGroupID: fromCG.ID, ToClassGroupID: toCG.ID, EventDate: "2025-03-15",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "level yang sama")
}

// --- Withdrawal Tests ---

func TestProcessWithdrawal_InvalidDate(t *testing.T) {
	db := setupTestDB(t)
	svc := newTestAcademicEventService(db)

	err := svc.ProcessWithdrawal(1, dto.WithdrawalRequest{
		StudentID: 1, EventDate: "bad", EventType: "transfer_out",
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Format event_date tidak valid")
}

func TestProcessWithdrawal_Success(t *testing.T) {
	db := setupTestDB(t)
	db.AutoMigrate(&model.Invoice{})

	_, _, _, _, student := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	err := svc.ProcessWithdrawal(1, dto.WithdrawalRequest{
		StudentID: student.ID, EventDate: "2025-04-01", EventType: "transfer_out",
	})

	assert.NoError(t, err)

	var updatedStudent model.Student
	db.First(&updatedStudent, student.ID)
	assert.Equal(t, "transferred", updatedStudent.Status)

	var enrollment model.StudentEnrollment
	db.Where("student_id = ? AND status = ?", student.ID, "dropped").First(&enrollment)
	assert.NotNil(t, enrollment.EndDate)

	var event model.StudentAcademicEvent
	db.Where("student_id = ? AND event_type = ?", student.ID, "transfer_out").First(&event)
	assert.Equal(t, uint(1), event.CreatedBy)
}

func TestProcessWithdrawal_Dropout(t *testing.T) {
	db := setupTestDB(t)
	db.AutoMigrate(&model.Invoice{})

	_, _, _, _, student := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	err := svc.ProcessWithdrawal(1, dto.WithdrawalRequest{
		StudentID: student.ID, EventDate: "2025-04-01", EventType: "dropout",
	})

	assert.NoError(t, err)

	var updatedStudent model.Student
	db.First(&updatedStudent, student.ID)
	assert.Equal(t, "dropped", updatedStudent.Status)
}

// --- Preview Tests ---

func TestPreviewPromotion_Success(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, _ := seedPromotionData(t, db)
	svc := newTestAcademicEventService(db)

	result, err := svc.PreviewPromotion(dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.TotalStudents)
	assert.Equal(t, 1, result.ToPromote)
	assert.Equal(t, 0, result.ToRetain)
	assert.Len(t, result.Students, 1)
	assert.Equal(t, "promotion", result.Students[0].Action)
	assert.Equal(t, "Mutiara 1", result.Students[0].FromClass)
	assert.Equal(t, "Intan 1", result.Students[0].ToClass)

	// Verify NO data was written
	var enrollmentCount int64
	db.Model(&model.StudentEnrollment{}).Where("academic_year_id = ?", toAY.ID).Count(&enrollmentCount)
	assert.Equal(t, int64(0), enrollmentCount)
}

func TestPreviewPromotion_WithRetained(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, student := seedPromotionData(t, db)

	// Add mutiara class in target year for retained
	db.Create(&model.ClassGroup{AcademicYearID: toAY.ID, Name: "Mutiara 1", Level: "mutiara", Schedule: []byte(`{}`)})

	svc := newTestAcademicEventService(db)

	result, err := svc.PreviewPromotion(dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
		RetainedStudentIDs: []uint{student.ID},
	})

	assert.NoError(t, err)
	assert.Equal(t, 0, result.ToPromote)
	assert.Equal(t, 1, result.ToRetain)
	assert.Equal(t, "retained", result.Students[0].Action)
	assert.Equal(t, "Mutiara 1", result.Students[0].ToClass)
}

func TestPreviewPromotion_BerlianSkipped(t *testing.T) {
	db := setupTestDB(t)
	fromAY, toAY, _, _, _ := seedPromotionData(t, db)

	// Add a berlian student
	berlianCG := model.ClassGroup{AcademicYearID: fromAY.ID, Name: "Berlian 1", Level: "berlian", Schedule: []byte(`{}`)}
	db.Create(&berlianCG)
	berlianStudent := model.Student{FullName: "Anak Berlian", BirthPlace: "Bandung", BirthDate: time.Date(2012, 1, 1, 0, 0, 0, 0, time.UTC), Gender: "P", Status: "active"}
	db.Create(&berlianStudent)
	db.Create(&model.StudentEnrollment{
		StudentID: berlianStudent.ID, ClassGroupID: berlianCG.ID, AcademicYearID: fromAY.ID,
		StartDate: fromAY.StartDate, Status: "active", EnrollmentType: "new", CreatedBy: 1,
	})

	svc := newTestAcademicEventService(db)

	result, err := svc.PreviewPromotion(dto.PromotionRequest{
		FromAcademicYearID: fromAY.ID,
		ToAcademicYearID:   toAY.ID,
		EventDate:          "2025-06-30",
	})

	assert.NoError(t, err)
	assert.Equal(t, 2, result.TotalStudents)
	assert.Equal(t, 1, result.Skipped)

	// Find the berlian student in preview
	var berlianPreview *dto.PromotionPreviewStudent
	for _, s := range result.Students {
		if s.StudentID == berlianStudent.ID {
			berlianPreview = &s
			break
		}
	}
	assert.NotNil(t, berlianPreview)
	assert.Equal(t, "skipped_berlian", berlianPreview.Action)
}
