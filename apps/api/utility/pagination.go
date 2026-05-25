package utility

import (
	"strconv"

	"github.com/labstack/echo/v4"
)

// ParsePagination extracts page and limit from query parameters.
// Defaults: page=1, limit=20
func ParsePagination(c echo.Context) (page, limit int) {
	page = 1
	limit = 20

	if p, err := strconv.Atoi(c.QueryParam("page")); err == nil && p > 0 {
		page = p
	}
	if l, err := strconv.Atoi(c.QueryParam("limit")); err == nil && l > 0 {
		if l > 1000 {
			l = 1000 // cap at 1000 to prevent abuse
		}
		limit = l
	}

	return page, limit
}

// Offset calculates the SQL offset from page and limit.
func Offset(page, limit int) int {
	return (page - 1) * limit
}
