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

	"api/internal/modules/koperasi/barang"
	"api/internal/modules/koperasi/kas"
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
	seeders.FixClassGroupSchedules(db) // Fix schedule JSON format from old "groups" to "weekdays/weekend"
	seeders.MigrateRolesToModules(db)  // RBAC by-modul: role-bundle lama -> admin + grant modul

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
	guardianRepo := repository.NewGuardianRepository(db)
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
	expCatRepo := repository.NewExpenseCategoryRepository(db)
	expenseRepo := repository.NewExpenseRepository(db)
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
	ayService := service.NewAcademicYearService(ayRepo)
	guardianService := service.NewGuardianService(guardianRepo, studentRepo)
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
	expCatService := service.NewExpenseCategoryService(expCatRepo)
	expenseService := service.NewExpenseService(db, expenseRepo, expCatRepo, ayRepo, txnWriterService)

	// Income transactions
	incomeRepo := repository.NewIncomeTransactionRepository(db)
	incomeService := service.NewIncomeTransactionService(db, incomeRepo, ayRepo, txnWriterService)

	// Batch 7
	cashService := service.NewCashService(db, cashTxnRepo, txnWriterService)
	vaultService := service.NewVaultService(vaultTxnRepo, savingsRepo)
	dailyClosingService := service.NewDailyClosingService(dailyClosingRepo, cashTxnRepo)
	reportService := service.NewReportService(reportRepo, ayRepo, cashTxnRepo, vaultTxnRepo, dailyClosingRepo, studentRepo, invoiceRepo, invoiceItemRepo, paymentRepo, savingsService, classGroupRepo, savingsTxnRepo)

	// Batch 3 (updated with Batch 5+6 dependencies)
	studentService := service.NewStudentService(db, studentRepo, enrollmentRepo, classGroupRepo, invoiceRepo, extracurricularRepo, seRepo, fcRepo, fcItemRepo, savingsService, invoiceGenService)
	enrollmentService := service.NewStudentEnrollmentService(db, enrollmentRepo, studentRepo, classGroupRepo, extracurricularRepo, seRepo, fcRepo, fcItemRepo, invoiceGenService, savingsService)
	effectiveDayService := service.NewEffectiveDayService(effectiveDayRepo, classGroupRepo, invoiceGenService)
	extracurricularService := service.NewExtracurricularService(extracurricularRepo)
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
	ayHandler := handler.NewAcademicYearHandler(ayService)
	studentHandler := handler.NewStudentHandler(studentService)
	guardianHandler := handler.NewGuardianHandler(guardianService)
	classGroupHandler := handler.NewClassGroupHandler(classGroupService)

	// Batch 3
	enrollmentHandler := handler.NewStudentEnrollmentHandler(enrollmentService)
	effectiveDayHandler := handler.NewEffectiveDayHandler(effectiveDayService)
	extracurricularHandler := handler.NewExtracurricularHandler(extracurricularService)
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
	expCatHandler := handler.NewExpenseCategoryHandler(expCatService)
	expenseHandler := handler.NewExpenseHandler(expenseService)

	// Income transactions
	incomeHandler := handler.NewIncomeTransactionHandler(incomeService)

	// Dispensations
	dispensationService := service.NewDispensationService(dispensationRepo, studentRepo, ayRepo, invoiceGenService)
	dispensationHandler := handler.NewDispensationHandler(dispensationService)

	// Facilities
	facilityService := service.NewFacilityService(facilityRepo)
	sfService := service.NewStudentFacilityService(sfRepo, studentRepo, facilityRepo, ayRepo, invoiceGenService)
	facilityHandler := handler.NewFacilityHandler(facilityService, sfService)

	// Batch 7
	cashHandler := handler.NewCashHandler(cashService)
	vaultHandler := handler.NewVaultHandler(vaultService)
	dailyClosingHandler := handler.NewDailyClosingHandler(dailyClosingService)
	reportHandler := handler.NewReportHandler(reportService)

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

	// Academic Years
	ay := api.Group("/academic-years", middleware.JWTAuth(tokenBlacklistRepo))
	// Baca daftar TA = data referensi untuk AcademicYearSelector di sidebar; semua
	// modul dashboard membutuhkannya (tiap dashboard ter-scope per TA). Tulis &
	// aktivasi = modul administrasi.
	ayRead := []string{middleware.ModuleAdministrasi, middleware.ModuleKeuangan, middleware.ModuleKoperasi, middleware.ModuleLaporan}
	ay.GET("", ayHandler.List, guard.RequireModule(ayRead...))
	ay.POST("", ayHandler.Create, guard.RequireModule(middleware.ModuleAdministrasi))
	ay.GET("/:id", ayHandler.Get, guard.RequireModule(ayRead...))
	ay.PUT("/:id", ayHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))
	ay.PATCH("/:id/activate", ayHandler.Activate, guard.RequireModule(middleware.ModuleAdministrasi))

	// Students
	students := api.Group("/students", middleware.JWTAuth(tokenBlacklistRepo))
	students.GET("", studentHandler.List, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan, middleware.ModuleKoperasi))
	students.POST("", studentHandler.Create, guard.RequireModule(middleware.ModuleAdministrasi))
	students.POST("/import", studentHandler.Import, guard.RequireModule(middleware.ModuleAdministrasi))
	students.GET("/:id", studentHandler.Get, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan))
	students.PUT("/:id", studentHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))
	students.DELETE("/:id", studentHandler.Delete, guard.RequireModule(middleware.ModuleAdministrasi))

	// Batch 3: Student nested endpoints
	students.GET("/:id/enrollments", enrollmentHandler.GetByStudent, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan))
	students.POST("/enrollments/batch", enrollmentHandler.EnrollBatch, guard.RequireModule(middleware.ModuleAdministrasi))
	students.POST("/:id/enrollments", enrollmentHandler.Enroll, guard.RequireModule(middleware.ModuleAdministrasi))
	students.GET("/:id/extracurriculars", seHandler.GetByStudent, guard.RequireModule(middleware.ModuleAdministrasi))
	students.POST("/:id/extracurriculars", seHandler.Enroll, guard.RequireModule(middleware.ModuleAdministrasi))
	students.PUT("/:id/extracurriculars/:se_id", seHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))
	students.DELETE("/:id/extracurriculars/:se_id", seHandler.Unenroll, guard.RequireModule(middleware.ModuleAdministrasi))
	students.GET("/:id/dispensations", dispensationHandler.ListByStudent, guard.RequireModule(middleware.ModuleKeuangan))
	students.POST("/:id/dispensations", dispensationHandler.Create, guard.RequireModule(middleware.ModuleKeuangan))
	students.GET("/:id/facilities", facilityHandler.ListByStudent, guard.RequireModule(middleware.ModuleAdministrasi))
	students.POST("/:id/facilities", facilityHandler.Enroll, guard.RequireModule(middleware.ModuleAdministrasi))
	students.DELETE("/:id/facilities/:facilityId", facilityHandler.Unenroll, guard.RequireModule(middleware.ModuleAdministrasi))
	students.GET("/:id/academic-events", eventHandler.GetByStudent, guard.RequireModule(middleware.ModuleAdministrasi))

	// Enrollment management
	enrollments := api.Group("/enrollments", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	enrollments.PATCH("/:id/activate", enrollmentHandler.ActivateEnrollment)

	// Guardians (Standalone)
	guardians := api.Group("/guardians", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	guardians.POST("", guardianHandler.Create)
	guardians.GET("/:id", guardianHandler.Get)
	guardians.PUT("/:id", guardianHandler.Update)

	// Guardians (Nested under students)
	students.GET("/:id/guardians", guardianHandler.GetByStudent, guard.RequireModule(middleware.ModuleAdministrasi))
	students.POST("/:id/guardians", guardianHandler.LinkToStudent, guard.RequireModule(middleware.ModuleAdministrasi))
	students.DELETE("/:id/guardians/:guardian_id", guardianHandler.UnlinkFromStudent, guard.RequireModule(middleware.ModuleAdministrasi))
	students.PATCH("/:id/guardians/:guardian_id/primary", guardianHandler.SetPrimary, guard.RequireModule(middleware.ModuleAdministrasi))

	// Class Groups
	classGroups := api.Group("/class-groups", middleware.JWTAuth(tokenBlacklistRepo))
	classGroups.GET("", classGroupHandler.List, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan))
	classGroups.POST("", classGroupHandler.Create, guard.RequireModule(middleware.ModuleAdministrasi))
	classGroups.POST("/clone", classGroupHandler.Clone, guard.RequireModule(middleware.ModuleAdministrasi))
	classGroups.GET("/:id", classGroupHandler.Get, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan))
	classGroups.PUT("/:id", classGroupHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))
	classGroups.DELETE("/:id", classGroupHandler.Delete, guard.RequireModule(middleware.ModuleAdministrasi))

	// Batch 3: Class Groups nested endpoints
	classGroups.GET("/:id/students", enrollmentHandler.GetStudentsByClassGroup, guard.RequireModule(middleware.ModuleAdministrasi, middleware.ModuleKeuangan))
	classGroups.GET("/:id/effective-days", effectiveDayHandler.List, guard.RequireModule(middleware.ModuleAdministrasi))
	classGroups.POST("/:id/effective-days", effectiveDayHandler.Upsert, guard.RequireModule(middleware.ModuleAdministrasi))
	classGroups.PUT("/:id/effective-days/:ed_id", effectiveDayHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))

	// Extracurriculars
	extracurriculars := api.Group("/extracurriculars", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	extracurriculars.POST("/sync-invoices", seHandler.SyncInvoices)
	extracurriculars.GET("", extracurricularHandler.List)
	extracurriculars.POST("", extracurricularHandler.Create)
	extracurriculars.PUT("/:id", extracurricularHandler.Update)
	extracurriculars.DELETE("/:id", extracurricularHandler.Delete)

	// Daycare Enrollments
	daycare := api.Group("/daycare-enrollments", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	daycare.GET("", daycareHandler.List)
	daycare.POST("", daycareHandler.Create)
	daycare.POST("/sync-invoices", daycareHandler.SyncInvoices)
	daycare.GET("/:id", daycareHandler.Get)
	daycare.PUT("/:id", daycareHandler.Update)
	daycare.PATCH("/:id/status", daycareHandler.UpdateStatus)

	// Batch 4: Academic Events
	events := api.Group("/academic-events", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleAdministrasi))
	events.POST("/promotions/preview", eventHandler.PromotionPreview)
	events.POST("/promotions", eventHandler.Promotion)
	events.POST("/graduations", eventHandler.Graduation)
	events.POST("/class-changes", eventHandler.ClassChange)
	events.POST("/transfers", eventHandler.TransferIn)
	events.POST("/withdrawals", eventHandler.Withdrawal)

	// Batch 4: Fee Configs (Tarif) — modul keuangan
	feeConfigs := api.Group("/fee-configs", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	feeConfigs.GET("", feeConfigHandler.List)
	feeConfigs.POST("", feeConfigHandler.Create)
	feeConfigs.GET("/:id", feeConfigHandler.Get)
	feeConfigs.PUT("/:id", feeConfigHandler.Update)
	feeConfigs.GET("/:id/items", feeConfigHandler.ListItems)
	feeConfigs.POST("/:id/items", feeConfigHandler.CreateItem)
	feeConfigs.PUT("/:id/items/:item_id", feeConfigHandler.UpdateItem)
	feeConfigs.DELETE("/:id/items/:item_id", feeConfigHandler.DeleteItem)

	// Batch 5: Invoices
	invoices := api.Group("/invoices", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	invoices.GET("", invoiceHandler.List)
	invoices.GET("/batch", invoiceHandler.Batch)
	invoices.GET("/:id", invoiceHandler.Get)
	invoices.POST("/:id/items", invoiceHandler.AddItem)
	invoices.PUT("/:id/items/:item_id", invoiceHandler.UpdateItem)
	invoices.PUT("/:id/items/:item_id/quantity", invoiceHandler.UpdateItemQuantity)
	invoices.DELETE("/:id/items/:item_id", invoiceHandler.DeleteItem)
	invoices.GET("/:id/installments", invoiceHandler.GetInstallments)
	invoices.POST("/:id/installments", invoiceHandler.CreateInstallments)
	invoices.PUT("/:id/installments/:inst_id", invoiceHandler.UpdateInstallment)
	invoices.DELETE("/:id/installments/:inst_id", invoiceHandler.DeleteInstallment)

	// Batch 5: Student invoices (nested)
	students.GET("/:id/invoices", invoiceHandler.GetByStudent, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 6: Payments
	payments := api.Group("/payments", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	payments.GET("", paymentHandler.List)
	payments.POST("", paymentHandler.Create)
	payments.GET("/:id", paymentHandler.Get)
	students.GET("/:id/payments", paymentHandler.GetByStudent, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 6: Savings (nested under students)
	students.GET("/:id/savings", savingsHandler.GetByStudent, guard.RequireModule(middleware.ModuleKeuangan))
	students.GET("/:id/savings/transactions", savingsHandler.GetTransactions, guard.RequireModule(middleware.ModuleKeuangan))
	students.POST("/:id/savings/withdrawals", savingsHandler.GuardianWithdrawal, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 6: Expense Categories
	expCats := api.Group("/expense-categories", middleware.JWTAuth(tokenBlacklistRepo))
	expCats.GET("", expCatHandler.List, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.POST("", expCatHandler.Create, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.PUT("/:id", expCatHandler.Update, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.DELETE("/:id", expCatHandler.Delete, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 6: Expenses
	expenses := api.Group("/expenses", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	expenses.GET("", expenseHandler.List)
	expenses.POST("", expenseHandler.Create)
	expenses.GET("/:id", expenseHandler.Get)
	expenses.PUT("/:id", expenseHandler.Update)
	expenses.DELETE("/:id", expenseHandler.Delete)

	// Dispensations
	dispensations := api.Group("/dispensations", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	dispensations.PUT("/:id", dispensationHandler.Update)
	dispensations.PATCH("/:id/toggle", dispensationHandler.Toggle)
	dispensations.DELETE("/:id", dispensationHandler.Delete)

	// Facilities (master)
	facilities := api.Group("/facilities", middleware.JWTAuth(tokenBlacklistRepo))
	facilities.GET("", facilityHandler.List, guard.RequireModule(middleware.ModuleAdministrasi))
	facilities.POST("", facilityHandler.Create, guard.RequireModule(middleware.ModuleAdministrasi))
	facilities.PUT("/:id", facilityHandler.Update, guard.RequireModule(middleware.ModuleAdministrasi))
	facilities.DELETE("/:id", facilityHandler.Delete, guard.RequireModule(middleware.ModuleAdministrasi))

	// Income Transactions (Dana Bantuan)
	incomes := api.Group("/income-transactions", middleware.JWTAuth(tokenBlacklistRepo), guard.RequireModule(middleware.ModuleKeuangan))
	incomes.GET("", incomeHandler.List)
	incomes.POST("", incomeHandler.Create)
	incomes.GET("/:id", incomeHandler.Get)
	incomes.PUT("/:id", incomeHandler.Update)
	incomes.DELETE("/:id", incomeHandler.Delete)

	// Batch 7: Cash
	cash := api.Group("/cash", middleware.JWTAuth(tokenBlacklistRepo))
	cash.GET("/balance", cashHandler.GetBalance, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	cash.GET("/transactions", cashHandler.GetTransactions, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	cash.POST("/transfers", cashHandler.TransferToVault, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 7: Vault
	vault := api.Group("/vault", middleware.JWTAuth(tokenBlacklistRepo))
	vault.GET("/balance", vaultHandler.GetBalance, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	vault.GET("/transactions", vaultHandler.GetTransactions, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))

	// Batch 7: Daily Closings
	dc := api.Group("/daily-closings", middleware.JWTAuth(tokenBlacklistRepo))
	dc.GET("", dailyClosingHandler.List, guard.RequireModule(middleware.ModuleKeuangan))
	dc.POST("", dailyClosingHandler.Create, guard.RequireModule(middleware.ModuleKeuangan))
	dc.GET("/:id", dailyClosingHandler.Get, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	dc.PATCH("/:id/confirm", dailyClosingHandler.Confirm, guard.RequireModule(middleware.ModuleKeuangan))

	// Batch 7: Reports
	reports := api.Group("/reports", middleware.JWTAuth(tokenBlacklistRepo))
	reports.GET("/daily", reportHandler.Daily, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/monthly", reportHandler.Monthly, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/annual", reportHandler.Annual, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/posisi-kas", reportHandler.PosisiKas, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/saldo", reportHandler.Saldo, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/transaksi-pengeluaran", reportHandler.TransaksiPengeluaran, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/tabungan", reportHandler.TabunganReport, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))
	reports.GET("/savings/students/:id", reportHandler.TabunganSiswaReport, guard.RequireModule(middleware.ModuleKeuangan))
	reports.GET("/students/:id", reportHandler.ByStudent, guard.RequireModule(middleware.ModuleKeuangan))
	reports.GET("/class-groups/:id", reportHandler.ByClassGroup, guard.RequireModule(middleware.ModuleKeuangan, middleware.ModuleLaporan))

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
