package utility

import "strings"

// modulePrefixMap memetakan prefix path ke nama modul yang ditampilkan di UI.
var modulePrefixMap = map[string]string{
	"students":            "administrasi",
	"class-groups":        "administrasi",
	"academic-years":      "administrasi",
	"guardians":           "administrasi",
	"enrollments":         "administrasi",
	"effective-days":      "administrasi",
	"extracurriculars":    "administrasi",
	"daycare-enrollments": "administrasi",
	"facilities":          "administrasi",
	"invoices":            "keuangan",
	"payments":            "keuangan",
	"savings":             "keuangan",
	"cash":                "keuangan",
	"vault":               "keuangan",
	"expenses":            "keuangan",
	"expense-categories":  "keuangan",
	"fee-configs":         "keuangan",
	"income-transactions": "keuangan",
	"dispensations":       "keuangan",
	"reports":             "laporan",
	"daily-closings":      "laporan",
	"users":               "pengaturan",
	"backups":             "pengaturan",
	"sdm":                 "sdm",
	"auth":                "auth",
}

// ModuleFromPath mengekstrak nama modul dari URL path.
// Contoh: "/api/v1/students/123" → "administrasi"
func ModuleFromPath(path string) string {
	trimmed := strings.TrimPrefix(path, "/api/v1/")
	trimmed = strings.TrimPrefix(trimmed, "/")
	segments := strings.SplitN(trimmed, "/", 2)
	if len(segments) == 0 {
		return ""
	}
	return modulePrefixMap[segments[0]]
}

// ActionFromMethod mengkonversi HTTP method ke label aksi.
func ActionFromMethod(method string) string {
	switch method {
	case "POST":
		return "CREATE"
	case "PUT", "PATCH":
		return "UPDATE"
	case "DELETE":
		return "DELETE"
	default:
		return method
	}
}
