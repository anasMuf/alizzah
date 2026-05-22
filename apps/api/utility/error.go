package utility

import (
	"net/http"
	"strings"
)

// GetErrorStatusAndCode maps error messages to HTTP status and specific code
func GetErrorStatusAndCode(err error) (int, string) {
	msg := err.Error()
	if strings.Contains(msg, "tidak ditemukan") {
		return http.StatusNotFound, "NOT_FOUND"
	}
	if strings.Contains(msg, "sudah") || strings.Contains(msg, "aktif") {
		return http.StatusConflict, "CONFLICT"
	}
	return http.StatusBadRequest, "BAD_REQUEST"
}
