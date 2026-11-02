package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"api/model"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/require"
)

type recordingAuditWriter struct {
	entries []model.AuditEntry
}

func (w *recordingAuditWriter) LogAsync(e model.AuditEntry) { w.entries = append(w.entries, e) }

// TestCapture_HTTPErrorStatus memastikan status audit mengikuti *echo.HTTPError
// meskipun Echo baru menulis respons setelah chain middleware selesai.
func TestCapture_HTTPErrorStatus(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/sdm/employees/1/fungsional/abc", nil)
	c := e.NewContext(req, httptest.NewRecorder())

	writer := &recordingAuditWriter{}
	handler := NewAuditMiddleware(writer).Capture(func(c echo.Context) error {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	})

	require.Error(t, handler(c))
	require.Len(t, writer.entries, 1)
	require.Equal(t, http.StatusBadRequest, writer.entries[0].StatusCode)
	require.Equal(t, "ID tidak valid", writer.entries[0].ErrorMessage)
	require.Equal(t, "sdm", writer.entries[0].Module)
}

// TestCapture_SkipsGET memastikan request baca tidak dicatat (by design).
func TestCapture_SkipsGET(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/sdm/employees", nil)
	c := e.NewContext(req, httptest.NewRecorder())

	writer := &recordingAuditWriter{}
	handler := NewAuditMiddleware(writer).Capture(func(c echo.Context) error {
		return c.NoContent(http.StatusOK)
	})

	require.NoError(t, handler(c))
	require.Empty(t, writer.entries)
}
