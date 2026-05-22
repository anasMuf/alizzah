package repository

import (
	"api/model"

	"gorm.io/gorm"
)

type StudentAcademicEventRepository interface {
	FindByStudentID(studentID uint) ([]model.StudentAcademicEvent, error)
	Create(event *model.StudentAcademicEvent) error // dipakai di Batch 4
}

type studentAcademicEventRepository struct {
	db *gorm.DB
}

func NewStudentAcademicEventRepository(db *gorm.DB) StudentAcademicEventRepository {
	return &studentAcademicEventRepository{db: db}
}

func (r *studentAcademicEventRepository) FindByStudentID(studentID uint) ([]model.StudentAcademicEvent, error) {
	var events []model.StudentAcademicEvent
	err := r.db.Preload("AcademicYear").Preload("FromClassGroup").Preload("ToClassGroup").Preload("Creator").
		Where("student_id = ?", studentID).Order("event_date DESC").Find(&events).Error
	return events, err
}

func (r *studentAcademicEventRepository) Create(event *model.StudentAcademicEvent) error {
	return r.db.Create(event).Error
}
