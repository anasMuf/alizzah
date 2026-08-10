package repository

import (
	"api/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DaycareMonthlyAttendanceRepository interface {
	FindByStudentMonthYear(studentID uint, month uint, year uint) (*model.DaycareMonthlyAttendance, error)
	Upsert(att *model.DaycareMonthlyAttendance) error
}

type daycareMonthlyAttendanceRepository struct {
	db *gorm.DB
}

func NewDaycareMonthlyAttendanceRepository(db *gorm.DB) DaycareMonthlyAttendanceRepository {
	return &daycareMonthlyAttendanceRepository{db: db}
}

func (r *daycareMonthlyAttendanceRepository) FindByStudentMonthYear(studentID uint, month uint, year uint) (*model.DaycareMonthlyAttendance, error) {
	var att model.DaycareMonthlyAttendance
	err := r.db.Preload("Student").Where("student_id = ? AND month = ? AND year = ?", studentID, month, year).First(&att).Error
	if err != nil {
		return nil, err
	}
	return &att, nil
}

func (r *daycareMonthlyAttendanceRepository) Upsert(att *model.DaycareMonthlyAttendance) error {
	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "student_id"}, {Name: "month"}, {Name: "year"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"spd_days", "meal_days", "overtime_minutes", "created_by", "updated_at",
		}),
	}).Create(att).Error
}
