package utility

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// AppError is a typed application error with HTTP status code.
type AppError struct {
	Code    int
	Message string
	Err     error // optional wrapped error
}

func (e *AppError) Error() string { return e.Message }

func (e *AppError) Unwrap() error { return e.Err }

// Error constructors
func NewNotFoundError(msg string) *AppError {
	return &AppError{Code: http.StatusNotFound, Message: msg}
}

func NewConflictError(msg string) *AppError {
	return &AppError{Code: http.StatusConflict, Message: msg}
}

func NewValidationError(msg string) *AppError {
	return &AppError{Code: http.StatusBadRequest, Message: msg}
}

func NewUnprocessableError(msg string) *AppError {
	return &AppError{Code: http.StatusUnprocessableEntity, Message: msg}
}

// GetErrorStatusAndCode extracts HTTP status and error code from any error.
// Priority: echo.HTTPError > AppError > message-based heuristics.
func GetErrorStatusAndCode(err error) (int, string) {
	// 1. echo.HTTPError — already has a status code
	var he *echo.HTTPError
	if errors.As(err, &he) {
		code := he.Code
		msg := ""
		switch m := he.Message.(type) {
		case string:
			msg = m
		default:
			msg = "error"
		}
		return code, statusToCode(code, msg)
	}

	// 2. AppError — our custom typed error
	var ae *AppError
	if errors.As(err, &ae) {
		return ae.Code, statusToCode(ae.Code, ae.Message)
	}

	// 3. Fallback: message-based heuristics (backward compatible)
	msg := err.Error()
	if strings.Contains(msg, "tidak ditemukan") {
		return http.StatusNotFound, "NOT_FOUND"
	}
	if strings.Contains(msg, "sudah ada") || strings.Contains(msg, "sudah terdaftar") {
		return http.StatusConflict, "CONFLICT"
	}
	if strings.Contains(msg, "tidak bisa") || strings.Contains(msg, "tidak diperbolehkan") {
		return http.StatusUnprocessableEntity, "UNPROCESSABLE_ENTITY"
	}
	if strings.Contains(msg, "valid") || strings.Contains(msg, "format") || strings.Contains(msg, "wajib") {
		return http.StatusBadRequest, "VALIDATION_ERROR"
	}
	return http.StatusBadRequest, "BAD_REQUEST"
}

func statusToCode(status int, msg string) string {
	switch status {
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusUnauthorized:
		return "UNAUTHORIZED"
	case http.StatusForbidden:
		return "FORBIDDEN"
	case http.StatusBadRequest:
		if strings.Contains(strings.ToLower(msg), "validasi") || strings.Contains(strings.ToLower(msg), "validation") {
			return "VALIDATION_ERROR"
		}
		return "BAD_REQUEST"
	case http.StatusConflict:
		return "CONFLICT"
	case http.StatusUnprocessableEntity:
		return "UNPROCESSABLE_ENTITY"
	default:
		return "INTERNAL_ERROR"
	}
}
