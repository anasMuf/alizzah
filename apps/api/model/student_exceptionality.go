package model

// StudentExceptionality marks a student as exceptional (ABK - Anak Berkebutuhan Khusus).
// A student with an active exceptionality row gets 2× the normal monthly_spp rate
// during invoice generation.
type StudentExceptionality struct {
	PrimaryKey
	StudentID   uint   `gorm:"uniqueIndex;not null" json:"student_id"`
	Description string `gorm:"size:255" json:"description"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
	BaseModelTimeAt

	Student *Student `gorm:"foreignKey:StudentID" json:"student,omitempty"`
}

func (StudentExceptionality) TableName() string {
	return "student_exceptionalities"
}
