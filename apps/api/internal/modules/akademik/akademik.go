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
	"api/service"

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
	classGroupHandler *handler.ClassGroupHandler,
	enrollmentHandler *handler.StudentEnrollmentHandler,
	effectiveDayHandler *handler.EffectiveDayHandler,
	seHandler *handler.StudentExtracurricularHandler,
	daycareHandler *handler.DaycareEnrollmentHandler,
	studentHandler *handler.StudentHandler,
	eventHandler *handler.AcademicEventHandler,
	sfService service.StudentFacilityService,
) *Module {
	db := deps.DB
	ayRepo := repository.NewAcademicYearRepository(db)
	guardianRepo := repository.NewGuardianRepository(db)
	studentRepo := repository.NewStudentRepository(db)
	facilityRepo := repository.NewFacilityRepository(db)
	tokenBlacklistRepo := repository.NewTokenBlacklistRepository(db)
	userModuleRepo := repository.NewUserModuleRepository(db)

	return &Module{
		Daycare:          daycare.New(daycareHandler),
		Ekskul:           ekskul.New(db),
		EkskulStudent:    ekskulstudent.New(seHandler),
		EventAkademik:    eventakademik.New(eventHandler),
		Fasilitas:        fasilitas.New(facilityRepo, sfService),
		Pendaftaran:      pendaftaran.New(enrollmentHandler),
		RombonganBelajar: rombonganbelajar.New(classGroupHandler, enrollmentHandler, effectiveDayHandler),
		Siswa:            siswa.New(studentHandler),
		TahunAjaran:      tahunajaran.New(ayRepo),
		Wali:             wali.New(guardianRepo, studentRepo),
		jwt:              middleware.JWTAuth(tokenBlacklistRepo),
		guard:            middleware.NewModuleGuard(userModuleRepo),
	}
}

func (m *Module) Models() []any {
	var models []any
	models = append(models, m.Ekskul.Models()...)
	models = append(models, m.Fasilitas.Models()...)
	models = append(models, m.TahunAjaran.Models()...)
	models = append(models, m.Wali.Models()...)
	return models
}

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
