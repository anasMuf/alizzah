package handler

import (
	"api/dto"
	"api/middleware"
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

// parseErrorCode maps HTTP status and message to a standardized error code.
func parseErrorCode(message string, status int) string {
	msg := strings.ToLower(message)
	switch status {
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusUnauthorized:
		return "UNAUTHORIZED"
	case http.StatusForbidden:
		return "FORBIDDEN"
	case http.StatusBadRequest:
		if strings.Contains(msg, "validasi") || strings.Contains(msg, "validation") || strings.Contains(msg, "invalid") {
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

// CustomHTTPErrorHandler is the global error handler for the Echo application.
func CustomHTTPErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	msg := "Internal Server Error"
	var details interface{}

	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
		switch m := he.Message.(type) {
		case string:
			msg = m
		case map[string]interface{}:
			if message, ok := m["message"].(string); ok {
				msg = message
			}
			if d, ok := m["details"]; ok {
				details = d
			}
		default:
			msg = fmt.Sprintf("%v", he.Message)
		}
	} else {
		msg = err.Error()
	}

	// Log error with Logrus
	middleware.MakeLogEntry(c).Error(msg)

	// Generate standardized error code
	errCode := parseErrorCode(msg, code)

	// Build response
	res := dto.ErrorResponse{
		Status:  code,
		Code:    errCode,
		Message: msg,
		Details: details,
	}

	if !c.Response().Committed {
		c.JSON(code, res)
	}
}
