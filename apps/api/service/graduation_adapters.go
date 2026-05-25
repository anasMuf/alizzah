package service

import (
	"api/dto"
	"api/repository"
)

type invoiceCreatorAdapter struct {
	invoiceGen  InvoiceGenerateService
	invoiceRepo repository.InvoiceRepository
}

func NewInvoiceCreatorAdapter(invoiceGen InvoiceGenerateService, invoiceRepo repository.InvoiceRepository) InvoiceCreator {
	return &invoiceCreatorAdapter{invoiceGen: invoiceGen, invoiceRepo: invoiceRepo}
}

func (a *invoiceCreatorAdapter) CreateGraduationInvoice(studentID, academicYearID uint, amount float64, createdBy uint) (uint, error) {
	invoice, err := a.invoiceGen.GenerateGraduation(dto.GenerateGraduationInvoiceParams{
		StudentID:      studentID,
		AcademicYearID: academicYearID,
		CreatedBy:      createdBy,
	})
	if err != nil {
		return 0, err
	}
	return invoice.ID, nil
}

func (a *invoiceCreatorAdapter) FullyPayInvoice(invoiceID uint, amount float64) error {
	return a.invoiceRepo.UpdateStatus(invoiceID, "paid", amount)
}

func (a *invoiceCreatorAdapter) PartialPayInvoice(invoiceID uint, amount float64) error {
	return a.invoiceRepo.UpdateStatus(invoiceID, "partial", amount)
}

type savingsManagerAdapter struct {
	savingsService SavingsService
}

func NewSavingsManagerAdapter(savingsService SavingsService) SavingsManager {
	return &savingsManagerAdapter{savingsService: savingsService}
}

func (a *savingsManagerAdapter) GetMandatoryBalance(studentID uint) (float64, error) {
	return a.savingsService.GetBalance(studentID, "mandatory")
}

func (a *savingsManagerAdapter) DebitMandatory(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error {
	return a.savingsService.DebitMandatory(studentID, amount, sourceType, &sourceID, "Debit tabungan wajib untuk kelulusan", createdBy, nil)
}

func (a *savingsManagerAdapter) CreditGeneral(studentID uint, amount float64, sourceType string, sourceID uint, createdBy uint) error {
	return a.savingsService.CreditGeneral(studentID, amount, sourceType, &sourceID, "Transfer surplus tabungan wajib", createdBy, nil)
}
