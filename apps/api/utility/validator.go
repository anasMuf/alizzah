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

func (cv *CustomValidator) Validate(i interface{}) error {
	if err := cv.Validator.Struct(i); err != nil {
		if validationErrors, ok := err.(validator.ValidationErrors); ok {
			details := make([]map[string]string, 0, len(validationErrors))
			for _, e := range validationErrors {
				details = append(details, map[string]string{
					"field":   e.Field(),
					"message": formatValidationMessage(e),
				})
			}
			return echo.NewHTTPError(http.StatusBadRequest, map[string]interface{}{
				"message": "Validasi gagal",
				"details": details,
			})
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
	case "datetime":
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
