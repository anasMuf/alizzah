package model

type StudentSavings struct {
	PrimaryKey
	StudentID uint    `gorm:"not null;uniqueIndex:uq_student_savings_type"`
	Type      string  `gorm:"size:20;not null;uniqueIndex:uq_student_savings_type"` // general | mandatory
	Balance   float64 `gorm:"type:decimal(15,2);not null;default:0"`
	BaseModelTimeAt

	Student      Student              `gorm:"foreignKey:StudentID"`
	Transactions []SavingsTransaction `gorm:"foreignKey:StudentSavingsID"`
}

func (StudentSavings) TableName() string {
	return "student_savings"
}
