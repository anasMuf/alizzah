package main

import (
	"flag"
	"log"
	"time"

	"api/config"
	"api/handler"
	"api/internal/bootstrap"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/seeders"
	"api/service"

	"api/internal/modules/akademik"
	"api/internal/modules/keuangan"
	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/kas"
	"api/internal/shared"
)

// @title          Alizzah Manajemen API
// @version        1.0
// @description    API for Alizzah School Management System
// @host           localhost:8080
// @BasePath       /api
// @securityDefinitions.apikey  ApiKeyAuth
// @in                          header
// @name                        Authorization
func main() {
	// CLI flags
	reseed := flag.String("reseed", "", "Reset & seed ulang. Nilai: 'all' untuk semua, atau nama grup dipisah koma (users,academic_years,class_groups,extracurriculars,fee_configs,expense_categories,students,effective_days,transactions)")
	flag.Parse()

	// Load environment
	config.LoadEnv()

	// Initialize database
	db := config.DBInit()

	// AutoMigrate
	if err := db.AutoMigrate(
		&model.User{},
		&model.AcademicYear{},
		// Batch 2
		&model.Student{},
		&model.Guardian{},
		&model.StudentGuardian{},
		&model.ClassGroup{},
		// Batch 3
		&model.StudentEnrollment{},
		&model.EffectiveDay{},
		&model.Extracurricular{},
		&model.StudentExtracurricular{},
		&model.StudentAcademicEvent{},
		&model.DaycareEnrollment{},
		// Batch 4
		&model.FeeConfig{},
		&model.FeeConfigItem{},
		// Batch 5
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.InvoiceInstallment{},
		// Batch 6
		&model.Payment{},
		&model.PaymentItem{},
		&model.StudentSavings{},
		&model.SavingsTransaction{},
		&model.ExpenseCategory{},
		&model.Expense{},
		&model.CashTransaction{},
		&model.VaultTransaction{},
		// Batch 7
		&model.DailyClosing{},
		// Income transactions
		&model.IncomeTransaction{},
		// Facilities
		&model.Facility{},
		&model.StudentFacility{},
		// Dispensations
		&model.Dispensation{},
		// Token blacklist
		&model.TokenBlacklist{},
		// RBAC by-modul: grant akses modul per-user
		&model.UserModule{},
	); err != nil {
		log.Fatal("Gagal AutoMigrate:", err)
	}

	// Drop legacy columns from starter kit (GORM AutoMigrate doesn't remove columns)
	legacyColumns := []string{"username", "phone", "address", "deposit"}
	for _, col := range legacyColumns {
		if db.Migrator().HasColumn(&model.User{}, col) {
			if err := db.Migrator().DropColumn(&model.User{}, col); err != nil {
				log.Printf("Warning: gagal drop kolom %s: %v", col, err)
			}
		}
	}
	log.Println("AutoMigrate berhasil")

	// Partial unique index: satu siswa hanya boleh punya satu enrollment aktif per tahun ajaran
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_active_enrollment_per_year
		ON student_enrollments (student_id, academic_year_id)
		WHERE status = 'active'`)

	// Unique constraint: satu tanggal hanya boleh ada satu tutup buku
	db.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_closing_date
		ON daily_closings (closing_date)`)

	// Reset data jika flag --reseed diberikan
	if *reseed != "" {
		if *reseed == "all" {
			seeders.ResetAll(db)
		} else {
			seeders.ResetGroups(db, *reseed)
		}
	}

	// Seed data (urutan penting karena ada dependency antar seeder)
	seeders.SeedUsers(db)              // 1. Users (superadmin saja; admin dibuat via UI)
	seeders.SeedAcademicYears(db)      // 2. Tahun Ajaran
	seeders.SeedClassGroups(db)        // 3. Rombel (depends on #2)
	seeders.SeedExtracurriculars(db)   // 4. Ekskul/Pasta
	seeders.SeedFeeConfigs(db)         // 5. Tarif (depends on #2)
	seeders.SeedExpenseCategories(db)  // 6. Kategori Pengeluaran
	seeders.SeedFacilities(db)         // 6b. Fasilitas (Antar Jemput, dll)
	seeders.SeedStudentsFromLegacy(db) // 7. Siswa + Enrollment + Savings (depends on #1,2,3)
	seeders.SeedEffectiveDays(db)      // 8. Hari Efektif (depends on #3)
	seeders.SeedDispensations(db)      // 8b. Dispensasi sample (depends on #2,7)
	seeders.SeedSampleTransactions(db) // 9. Sample Tagihan/Bayar/Pengeluaran (depends on #5,7,8)
	seeders.SeedIncomeTransactions(db) // 10. Sample Penerimaan Dana Bantuan (depends on #2)

	// Data migrations / fixes
	seeders.FixClassGroupSchedules(db)       // Fix schedule JSON format from old "groups" to "weekdays/weekend"
	seeders.MigrateRolesToModules(db)        // RBAC by-modul: role-bundle lama -> admin + grant modul
	seeders.BackfillInvoiceKoperasiFlags(db) // Backfill flag is_koperasi pada invoice_item lama yang belum lunas

	// Inisialisasi Echo + middleware global (error handler, validator, CORS,
	// recover, logging, swagger, health) — lihat internal/bootstrap.
	e := bootstrap.NewEcho()

	// =====================
	// Dependency Injection
	// =====================

	// Repositories
	userRepo := repository.NewUserRepository(db)
	userModuleRepo := repository.NewUserModuleRepository(db)
	tokenBlacklistRepo := repository.NewTokenBlacklistRepository(db)
	ayRepo := repository.NewAcademicYearRepository(db)
	studentRepo := repository.NewStudentRepository(db)
	classGroupRepo := repository.NewClassGroupRepository(db)

	// Batch 3
	enrollmentRepo := repository.NewStudentEnrollmentRepository(db)
	effectiveDayRepo := repository.NewEffectiveDayRepository(db)
	extracurricularRepo := repository.NewExtracurricularRepository(db)
	seRepo := repository.NewStudentExtracurricularRepository(db)
	eventRepo := repository.NewStudentAcademicEventRepository(db)
	daycareRepo := repository.NewDaycareEnrollmentRepository(db)

	// Batch 4
	fcRepo := repository.NewFeeConfigRepository(db)
	fcItemRepo := repository.NewFeeConfigItemRepository(db)

	// Batch 5
	invoiceRepo := repository.NewInvoiceRepository(db)
	invoiceItemRepo := repository.NewInvoiceItemRepository(db)
	invoiceInstallmentRepo := repository.NewInvoiceInstallmentRepository(db)

	// Batch 6
	paymentRepo := repository.NewPaymentRepository(db)
	paymentItemRepo := repository.NewPaymentItemRepository(db)
	savingsRepo := repository.NewStudentSavingsRepository(db)
	savingsTxnRepo := repository.NewSavingsTransactionRepository(db)
	cashTxnRepo := repository.NewCashTransactionRepository(db)
	vaultTxnRepo := repository.NewVaultTransactionRepository(db)

	// Batch 7
	dailyClosingRepo := repository.NewDailyClosingRepository(db)
	reportRepo := repository.NewReportRepository(db)

	// Otorisasi berbasis modul (RBAC by-modul). superadmin bypass; admin dibatasi
	// modul yang di-grant (lookup DB tiap request via user_modules).
	guard := middleware.NewModuleGuard(userModuleRepo)

	// Services
	authService := service.NewAuthService(userRepo, userModuleRepo)
	userService := service.NewUserService(userRepo, userModuleRepo)
	classGroupService := service.NewClassGroupService(classGroupRepo)

	// Batch 5: create generate service first (other services depend on it)
	// Facility repos (needed before invoiceGenService)
	facilityRepo := repository.NewFacilityRepository(db)
	sfRepo := repository.NewStudentFacilityRepository(db)

	// Dispensation repo (needed before invoiceGenService)
	dispensationRepo := repository.NewDispensationRepository(db)

	invoiceGenService := service.NewInvoiceGenerateService(db, invoiceRepo, invoiceItemRepo, fcRepo, fcItemRepo, effectiveDayRepo, enrollmentRepo, extracurricularRepo, seRepo, ayRepo, daycareRepo, facilityRepo, sfRepo, dispensationRepo)
	invoiceService := service.NewInvoiceService(invoiceRepo, invoiceItemRepo, invoiceInstallmentRepo, paymentRepo)

	// Batch 6: create transaction infrastructure first
	txnWriterService := service.NewTransactionWriterService(cashTxnRepo, vaultTxnRepo)
	savingsService := service.NewSavingsService(db, savingsRepo, savingsTxnRepo, fcRepo, ayRepo, txnWriterService)

	// Seam koperasi
	kopKasWriter := kas.NewWriter()
	kopBarangRepo := barang.NewRepository(db)
	koperasiSeam := service.NewKoperasiSeamService(db, kopKasWriter, kopBarangRepo)

	paymentService := service.NewPaymentService(db, paymentRepo, paymentItemRepo, invoiceItemRepo, invoiceService, savingsRepo, savingsTxnRepo, studentRepo, txnWriterService, koperasiSeam)

	// Income transactions
	// Modul keuangan (modular: pengeluaran + penerimaan)
	sharedDeps := shared.New(db)

	// Batch 7
	reportService := service.NewReportService(reportRepo, ayRepo, cashTxnRepo, vaultTxnRepo, dailyClosingRepo, studentRepo, invoiceRepo, invoiceItemRepo, paymentRepo, savingsService, classGroupRepo, savingsTxnRepo)

	// Batch 3 (updated with Batch 5+6 dependencies)
	studentService := service.NewStudentService(db, studentRepo, enrollmentRepo, classGroupRepo, invoiceRepo, extracurricularRepo, seRepo, fcRepo, fcItemRepo, savingsService, invoiceGenService)
	enrollmentService := service.NewStudentEnrollmentService(db, enrollmentRepo, studentRepo, classGroupRepo, extracurricularRepo, seRepo, fcRepo, fcItemRepo, invoiceGenService, savingsService)
	effectiveDayService := service.NewEffectiveDayService(effectiveDayRepo, classGroupRepo, invoiceGenService)
	seService := service.NewStudentExtracurricularService(seRepo, studentRepo, extracurricularRepo, ayRepo, invoiceGenService)
	eventService := service.NewStudentAcademicEventService(eventRepo, studentRepo)
	daycareService := service.NewDaycareEnrollmentService(db, daycareRepo, studentRepo, ayRepo, invoiceGenService)

	// Batch 4
	fcService := service.NewFeeConfigService(fcRepo, fcItemRepo, ayRepo)

	// Batch 4 — graduation
	invoiceCreator := service.NewInvoiceCreatorAdapter(invoiceGenService, invoiceRepo)
	savingsManager := service.NewSavingsManagerAdapter(savingsService)
	academicService := service.NewAcademicEventService(db, enrollmentRepo, studentRepo, eventRepo, classGroupRepo, ayRepo, invoiceCreator, savingsManager, invoiceGenService)

	// Handlers
	authHandler := handler.NewAuthHandler(authService, tokenBlacklistRepo)
	userHandler := handler.NewUserHandler(userService)
	studentHandler := handler.NewStudentHandler(studentService)
	classGroupHandler := handler.NewClassGroupHandler(classGroupService)

	// Batch 3
	enrollmentHandler := handler.NewStudentEnrollmentHandler(enrollmentService)
	effectiveDayHandler := handler.NewEffectiveDayHandler(effectiveDayService)
	seHandler := handler.NewStudentExtracurricularHandler(seService, invoiceGenService)
	eventHandler := handler.NewAcademicEventHandler(eventService, academicService)
	daycareHandler := handler.NewDaycareEnrollmentHandler(daycareService, invoiceGenService)

	// Batch 4
	feeConfigHandler := handler.NewFeeConfigHandler(fcService)

	// Batch 5
	invoiceHandler := handler.NewInvoiceHandler(invoiceService)

	// Batch 6
	paymentHandler := handler.NewPaymentHandler(paymentService)
	savingsHandler := handler.NewSavingsHandler(savingsService)
	// Dispensations
	dispensationService := service.NewDispensationService(dispensationRepo, studentRepo, ayRepo, invoiceGenService)
	dispensationHandler := handler.NewDispensationHandler(dispensationService)

	// Facilities
	sfService := service.NewStudentFacilityService(sfRepo, studentRepo, facilityRepo, ayRepo, invoiceGenService)

	// Batch 7
	reportHandler := handler.NewReportHandler(reportService)

	// Modul keuangan (modular)
	modKeuangan := keuangan.New(sharedDeps, reportHandler, savingsHandler, invoiceHandler, paymentHandler, feeConfigHandler, dispensationHandler)

	// Modul akademik (modular)
	modAkademik := akademik.New(sharedDeps, classGroupHandler, enrollmentHandler, effectiveDayHandler, seHandler, daycareHandler, studentHandler, eventHandler, sfService)

	// =====================
	// Routes — /api/v1
	// =====================
	api := bootstrap.APIGroup(e)

	// Rate limiting: 1 req/detik untuk login (anti brute-force)
	auth := api.Group("/auth")
	auth.POST("/login", authHandler.Login, middleware.RateLimiter(1, 5))

	// Auth — protected
	authProtected := api.Group("/auth", middleware.JWTAuth(tokenBlacklistRepo), middleware.RateLimiter(20, 40))
	authProtected.POST("/logout", authHandler.Logout)
	authProtected.GET("/me", authHandler.Me)

	// Users — superadmin only
	users := api.Group("/users", middleware.JWTAuth(tokenBlacklistRepo), middleware.RateLimiter(20, 40), middleware.RequireRoles("superadmin"))
	users.GET("", userHandler.List)
	users.POST("", userHandler.Create)
	users.GET("/:id", userHandler.Get)
	users.PUT("/:id", userHandler.Update)
	users.DELETE("/:id", userHandler.Delete)

	// Modular routes: akademik + keuangan
	students := api.Group("/students", middleware.JWTAuth(tokenBlacklistRepo))
	modAkademik.RegisterNestedRoutes(students)
	modAkademik.RegisterRoutes(api)
	modKeuangan.RegisterNestedRoutes(students)
	modKeuangan.RegisterRoutes(api)

	// Extracurricular sync invoices (masih flat — handler khusus, butuh invoiceGen)
	extracurriculars := api.Group("/extracurriculars", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	extracurriculars.POST("/sync-invoices", seHandler.SyncInvoices)

	// Batch 7: Cash
	// Batch 7: Vault
	// Batch 7: Daily Closings
	// Batch 7: Reports
	// Catatan: modul Koperasi dilayani oleh binary terpisah (cmd/koperasi) demi
	// deploy/restart & isolasi fault yang independen. Lihat docs/architecture/adr-002.

	// Background: hapus token blacklist expired tiap 10 menit
	go func() {
		for {
			time.Sleep(10 * time.Minute)
			if count, err := tokenBlacklistRepo.DeleteExpired(); err == nil && count > 0 {
				log.Printf("Token blacklist: %d token expired dihapus", count)
			}
		}
	}()

	// Start server + graceful shutdown. Port dari env PORT (default 8080).
	bootstrap.Run(e, bootstrap.Port("PORT", "8080"))
}
