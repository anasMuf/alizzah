package akademik

import (
	"api/handler"
	"api/internal/modules/akademik/daycare"
	"api/internal/modules/akademik/ekskul"
	"api/internal/modules/akademik/ekskulstudent"
	"api/internal/modules/akademik/eventakademik"
	"api/internal/modules/akademik/fasilitas"
	"api/internal/modules/akademik/pendaftaran"
	"api/internal/modules/akademik/rombonganbelajar"
	"api/internal/modules/akademik/siswa"
	"api/internal/modules/akademik/tahunajaran"
	"api/internal/modules/akademik/wali"
	"api/internal/shared"
	"api/middleware"
	"api/repository"

	"github.com/labstack/echo/v4"
)

type Module struct {
	Daycare          *daycare.Handler
	Ekskul           *ekskul.Handler
	EkskulStudent    *ekskulstudent.Handler
	EventAkademik    *eventakademik.Handler
	Fasilitas        *fasilitas.Handler
	Pendaftaran      *pendaftaran.Handler
	RombonganBelajar *rombonganbelajar.Handler
	Siswa            *siswa.Handler
	TahunAjaran      *tahunajaran.Handler
	Wali             *wali.Handler
	jwt              echo.MiddlewareFunc
	guard            *middleware.ModuleGuard
}

func New(deps *shared.Deps,
	ayHandler *handler.AcademicYearHandler,
	extracurricularHandler *handler.ExtracurricularHandler,
	classGroupHandler *handler.ClassGroupHandler,
	enrollmentHandler *handler.StudentEnrollmentHandler,
	effectiveDayHandler *handler.EffectiveDayHandler,
	guardianHandler *handler.GuardianHandler,
	facilityHandler *handler.FacilityHandler,
	seHandler *handler.StudentExtracurricularHandler,
	daycareHandler *handler.DaycareEnrollmentHandler,
	studentHandler *handler.StudentHandler,
	eventHandler *handler.AcademicEventHandler,
) *Module {
	db := deps.DB
	return &Module{
		Daycare:          daycare.New(daycareHandler),
		Ekskul:           ekskul.New(extracurricularHandler),
		EkskulStudent:    ekskulstudent.New(seHandler),
		EventAkademik:    eventakademik.New(eventHandler),
		Fasilitas:        fasilitas.New(facilityHandler),
		Pendaftaran:      pendaftaran.New(enrollmentHandler),
		RombonganBelajar: rombonganbelajar.New(classGroupHandler, enrollmentHandler, effectiveDayHandler),
		Siswa:            siswa.New(studentHandler),
		TahunAjaran:      tahunajaran.New(ayHandler),
		Wali:             wali.New(guardianHandler),
		jwt:              middleware.JWTAuth(repository.NewTokenBlacklistRepository(db)),
		guard:            middleware.NewModuleGuard(repository.NewUserModuleRepository(db)),
	}
}

func (m *Module) Models() []any { return nil }

func (m *Module) RegisterRoutes(api *echo.Group) {
	m.Daycare.RegisterRoutes(api, m.jwt, m.guard)
	m.Ekskul.RegisterRoutes(api, m.jwt, m.guard)
	m.EventAkademik.RegisterRoutes(api, m.jwt, m.guard)
	m.Fasilitas.RegisterRoutes(api, m.jwt, m.guard)
	m.Pendaftaran.RegisterRoutes(api, m.jwt, m.guard)
	m.RombonganBelajar.RegisterRoutes(api, m.jwt, m.guard)
	m.Siswa.RegisterRoutes(api, m.jwt, m.guard)
	m.TahunAjaran.RegisterRoutes(api, m.jwt, m.guard)
	m.Wali.RegisterRoutes(api, m.jwt, m.guard)
}

func (m *Module) RegisterNestedRoutes(students *echo.Group) {
	m.EkskulStudent.RegisterNested(students, m.guard)
	m.EventAkademik.RegisterNested(students, m.guard)
	m.Fasilitas.RegisterNested(students, m.guard)
	m.Pendaftaran.RegisterNested(students, m.guard)
	m.Wali.RegisterNested(students, m.guard)
}
