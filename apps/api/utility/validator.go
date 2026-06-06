package utility

import (
	"fmt"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type CustomValidator struct {
	Validator *validator.Validate
}

// NewValidator membuat instance validator dengan aturan kustom terdaftar.
func NewValidator() *validator.Validate {
	v := validator.New()

	// "dateonly": menerima tanggal "YYYY-MM-DD" maupun RFC3339
	// (mis. "2026-01-02T00:00:00Z"), konsisten dengan utility.ParseDate.
	// Menggantikan "datetime=2006-01-02" yang menolak input ISO datetime dari frontend.
	_ = v.RegisterValidation("dateonly", func(fl validator.FieldLevel) bool {
		s := fl.Field().String()
		if s == "" {
			return true // biarkan required/omitempty yang menangani kekosongan
		}
		_, err := ParseDate(s)
		return err == nil
	})

	return v
}

func (cv *CustomValidator) Validate(i interface{}) error {
	if err := cv.Validator.Struct(i); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			// Build a human-readable message from all validation errors
			messages := make([]string, 0, len(validationErrors))
			for _, e := range validationErrors {
				messages = append(messages, formatValidationMessage(e))
			}
			combined := messages[0]
			if len(messages) > 1 {
				combined = fmt.Sprintf("%s (dan %d kesalahan lainnya)", messages[0], len(messages)-1)
			}
			return echo.NewHTTPError(http.StatusBadRequest, combined)
		}
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	return nil
}

func formatValidationMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s wajib diisi", e.Field())
	case "email":
		return fmt.Sprintf("%s harus berupa alamat email yang valid", e.Field())
	case "min":
		return fmt.Sprintf("%s minimal %s karakter", e.Field(), e.Param())
	case "max":
		return fmt.Sprintf("%s maksimal %s karakter", e.Field(), e.Param())
	case "oneof":
		return fmt.Sprintf("%s harus salah satu dari: %s", e.Field(), e.Param())
	case "dateonly", "datetime":
		return fmt.Sprintf("%s harus berformat tanggal yang valid (YYYY-MM-DD)", e.Field())
	case "gt":
		return fmt.Sprintf("%s harus lebih besar dari %s", e.Field(), e.Param())
	case "gte":
		return fmt.Sprintf("%s harus lebih besar atau sama dengan %s", e.Field(), e.Param())
	case "url":
		return fmt.Sprintf("%s harus berupa URL yang valid", e.Field())
	default:
		return fmt.Sprintf("%s tidak valid", e.Field())
	}
}
