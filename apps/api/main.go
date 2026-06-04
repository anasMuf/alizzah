package main

import (
	"api/config"
	"api/handler"
	"api/middleware"
	"api/model"
	"api/repository"
	"api/seeders"
	"api/service"
	"api/utility"
	"flag"
	"log"
	"os"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"

	_ "api/docs"
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

	// Reset data jika flag --reseed diberikan
	if *reseed != "" {
		if *reseed == "all" {
			seeders.ResetAll(db)
		} else {
			seeders.ResetGroups(db, *reseed)
		}
	}

	// Seed data (urutan penting karena ada dependency antar seeder)
	seeders.SeedUsers(db)              // 1. Users (semua role)
	seeders.SeedAcademicYears(db)      // 2. Tahun Ajaran
	seeders.SeedClassGroups(db)        // 3. Rombel (depends on #2)
	seeders.SeedExtracurriculars(db)   // 4. Ekskul/Pasta
	seeders.SeedFeeConfigs(db)         // 5. Tarif (depends on #2)
	seeders.SeedExpenseCategories(db)  // 6. Kategori Pengeluaran
	seeders.SeedStudentsFromLegacy(db) // 7. Siswa + Enrollment + Savings (depends on #1,2,3)
	seeders.SeedEffectiveDays(db)      // 8. Hari Efektif (depends on #3)
	seeders.SeedSampleTransactions(db)  // 9. Sample Tagihan/Bayar/Pengeluaran (depends on #5,7,8)
	seeders.SeedIncomeTransactions(db)  // 10. Sample Penerimaan Dana Bantuan (depends on #2)

	// Data migrations / fixes
	seeders.FixClassGroupSchedules(db) // Fix schedule JSON format from old "groups" to "weekdays/weekend"

	// Initialize Echo
	e := echo.New()
	e.HTTPErrorHandler = handler.CustomHTTPErrorHandler
	e.Validator = &utility.CustomValidator{Validator: validator.New()}

	// Global middleware
	e.Use(echoMiddleware.CORSWithConfig(echoMiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))
	e.Use(middleware.MiddlewareLogging)

	// Swagger
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// =====================
	// Dependency Injection
	// =====================

	// Repositories
	userRepo := repository.NewUserRepository(db)
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

	// Services
	authService := service.NewAuthService(userRepo)
	userService := service.NewUserService(userRepo)
	ayService := service.NewAcademicYearService(ayRepo)
	guardianService := service.NewGuardianService(guardianRepo, studentRepo)
	classGroupService := service.NewClassGroupService(classGroupRepo)

	// Batch 5: create generate service first (other services depend on it)
	invoiceGenService := service.NewInvoiceGenerateService(db, invoiceRepo, invoiceItemRepo, fcRepo, fcItemRepo, effectiveDayRepo, enrollmentRepo, extracurricularRepo, seRepo, ayRepo, daycareRepo)
	invoiceService := service.NewInvoiceService(invoiceRepo, invoiceItemRepo, invoiceInstallmentRepo)

	// Batch 6: create transaction infrastructure first
	txnWriterService := service.NewTransactionWriterService(cashTxnRepo, vaultTxnRepo)
	savingsService := service.NewSavingsService(db, savingsRepo, savingsTxnRepo, fcRepo, ayRepo, txnWriterService)
	paymentService := service.NewPaymentService(db, paymentRepo, paymentItemRepo, invoiceItemRepo, invoiceService, savingsRepo, savingsTxnRepo, studentRepo, txnWriterService)
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
	studentService := service.NewStudentService(db, studentRepo, enrollmentRepo, classGroupRepo, invoiceRepo, savingsService, invoiceGenService)
	enrollmentService := service.NewStudentEnrollmentService(enrollmentRepo, studentRepo, classGroupRepo)
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
	authHandler := handler.NewAuthHandler(authService)
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

	// Batch 7
	cashHandler := handler.NewCashHandler(cashService)
	vaultHandler := handler.NewVaultHandler(vaultService)
	dailyClosingHandler := handler.NewDailyClosingHandler(dailyClosingService)
	reportHandler := handler.NewReportHandler(reportService)

	// =====================
	// Routes — /api/v1
	// =====================
	api := e.Group("/api/v1")

	// Auth — public
	auth := api.Group("/auth")
	auth.POST("/login", authHandler.Login)

	// Auth — protected
	authProtected := api.Group("/auth", middleware.JWTAuth)
	authProtected.POST("/logout", authHandler.Logout)
	authProtected.GET("/me", authHandler.Me)

	// Users — superadmin only
	users := api.Group("/users", middleware.JWTAuth, middleware.RequireRoles("superadmin"))
	users.GET("", userHandler.List)
	users.POST("", userHandler.Create)
	users.GET("/:id", userHandler.Get)
	users.PUT("/:id", userHandler.Update)
	users.DELETE("/:id", userHandler.Delete)

	// Academic Years
	ay := api.Group("/academic-years", middleware.JWTAuth)
	ay.GET("", ayHandler.List, middleware.RequireRoles("superadmin", "admin_administrasi"))
	ay.POST("", ayHandler.Create, middleware.RequireRoles("superadmin", "admin_administrasi"))
	ay.GET("/:id", ayHandler.Get, middleware.RequireRoles("superadmin", "admin_administrasi"))
	ay.PUT("/:id", ayHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))
	ay.PATCH("/:id/activate", ayHandler.Activate, middleware.RequireRoles("superadmin"))

	// Students
	students := api.Group("/students", middleware.JWTAuth)
	students.GET("", studentHandler.List, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	students.POST("", studentHandler.Create, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.POST("/import", studentHandler.Import, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.GET("/:id", studentHandler.Get, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	students.PUT("/:id", studentHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.DELETE("/:id", studentHandler.Delete, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Batch 3: Student nested endpoints
	students.GET("/:id/enrollments", enrollmentHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	students.GET("/:id/extracurriculars", seHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.POST("/:id/extracurriculars", seHandler.Enroll, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.PUT("/:id/extracurriculars/:se_id", seHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.DELETE("/:id/extracurriculars/:se_id", seHandler.Unenroll, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.GET("/:id/academic-events", eventHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Enrollment management
	enrollments := api.Group("/enrollments", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_administrasi"))
	enrollments.PATCH("/:id/activate", enrollmentHandler.ActivateEnrollment)

	// Guardians (Standalone)
	guardians := api.Group("/guardians", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_administrasi"))
	guardians.POST("", guardianHandler.Create)
	guardians.GET("/:id", guardianHandler.Get)
	guardians.PUT("/:id", guardianHandler.Update)

	// Guardians (Nested under students)
	students.GET("/:id/guardians", guardianHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.POST("/:id/guardians", guardianHandler.LinkToStudent, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.DELETE("/:id/guardians/:guardian_id", guardianHandler.UnlinkFromStudent, middleware.RequireRoles("superadmin", "admin_administrasi"))
	students.PATCH("/:id/guardians/:guardian_id/primary", guardianHandler.SetPrimary, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Class Groups
	classGroups := api.Group("/class-groups", middleware.JWTAuth)
	classGroups.GET("", classGroupHandler.List, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	classGroups.POST("", classGroupHandler.Create, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.POST("/clone", classGroupHandler.Clone, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.GET("/:id", classGroupHandler.Get, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	classGroups.PUT("/:id", classGroupHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.DELETE("/:id", classGroupHandler.Delete, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Batch 3: Class Groups nested endpoints
	classGroups.GET("/:id/students", enrollmentHandler.GetStudentsByClassGroup, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	classGroups.GET("/:id/effective-days", effectiveDayHandler.List, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.POST("/:id/effective-days", effectiveDayHandler.Upsert, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.PUT("/:id/effective-days/:ed_id", effectiveDayHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Extracurriculars
	extracurriculars := api.Group("/extracurriculars", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_administrasi"))
	extracurriculars.POST("/sync-invoices", seHandler.SyncInvoices)
	extracurriculars.GET("", extracurricularHandler.List)
	extracurriculars.POST("", extracurricularHandler.Create)
	extracurriculars.PUT("/:id", extracurricularHandler.Update)
	extracurriculars.DELETE("/:id", extracurricularHandler.Delete)

	// Daycare Enrollments
	daycare := api.Group("/daycare-enrollments", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_administrasi"))
	daycare.GET("", daycareHandler.List)
	daycare.POST("", daycareHandler.Create)
	daycare.POST("/sync-invoices", daycareHandler.SyncInvoices)
	daycare.GET("/:id", daycareHandler.Get)
	daycare.PUT("/:id", daycareHandler.Update)
	daycare.PATCH("/:id/status", daycareHandler.UpdateStatus)

	// Batch 4: Academic Events
	events := api.Group("/academic-events", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_administrasi"))
	events.POST("/promotions/preview", eventHandler.PromotionPreview)
	events.POST("/promotions", eventHandler.Promotion)
	events.POST("/graduations", eventHandler.Graduation)
	events.POST("/class-changes", eventHandler.ClassChange)
	events.POST("/transfers", eventHandler.TransferIn)
	events.POST("/withdrawals", eventHandler.Withdrawal)

	// Batch 4: Fee Configs
	feeConfigs := api.Group("/fee-configs", middleware.JWTAuth, middleware.RequireRoles("superadmin"))
	feeConfigs.GET("", feeConfigHandler.List)
	feeConfigs.POST("", feeConfigHandler.Create)
	feeConfigs.GET("/:id", feeConfigHandler.Get)
	feeConfigs.PUT("/:id", feeConfigHandler.Update)
	feeConfigs.GET("/:id/items", feeConfigHandler.ListItems)
	feeConfigs.POST("/:id/items", feeConfigHandler.CreateItem)
	feeConfigs.PUT("/:id/items/:item_id", feeConfigHandler.UpdateItem)
	feeConfigs.DELETE("/:id/items/:item_id", feeConfigHandler.DeleteItem)

	// Batch 5: Invoices
	invoices := api.Group("/invoices", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_keuangan"))
	invoices.GET("", invoiceHandler.List)
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
	students.GET("/:id/invoices", invoiceHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_keuangan"))

	// Batch 6: Payments
	payments := api.Group("/payments", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_keuangan"))
	payments.GET("", paymentHandler.List)
	payments.POST("", paymentHandler.Create)
	payments.GET("/:id", paymentHandler.Get)
	students.GET("/:id/payments", paymentHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_keuangan"))

	// Batch 6: Savings (nested under students)
	students.GET("/:id/savings", savingsHandler.GetByStudent, middleware.RequireRoles("superadmin", "admin_keuangan"))
	students.GET("/:id/savings/transactions", savingsHandler.GetTransactions, middleware.RequireRoles("superadmin", "admin_keuangan"))
	students.POST("/:id/savings/withdrawals", savingsHandler.GuardianWithdrawal, middleware.RequireRoles("superadmin", "admin_keuangan"))

	// Batch 6: Expense Categories
	expCats := api.Group("/expense-categories", middleware.JWTAuth)
	expCats.GET("", expCatHandler.List, middleware.RequireRoles("superadmin", "admin_keuangan"))
	expCats.POST("", expCatHandler.Create, middleware.RequireRoles("superadmin", "admin_keuangan"))
	expCats.PUT("/:id", expCatHandler.Update, middleware.RequireRoles("superadmin"))
	expCats.DELETE("/:id", expCatHandler.Delete, middleware.RequireRoles("superadmin"))

	// Batch 6: Expenses
	expenses := api.Group("/expenses", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_keuangan"))
	expenses.GET("", expenseHandler.List)
	expenses.POST("", expenseHandler.Create)
	expenses.GET("/:id", expenseHandler.Get)
	expenses.PUT("/:id", expenseHandler.Update)
	expenses.DELETE("/:id", expenseHandler.Delete)

	// Income Transactions (Dana Bantuan)
	incomes := api.Group("/income-transactions", middleware.JWTAuth, middleware.RequireRoles("superadmin", "admin_keuangan"))
	incomes.GET("", incomeHandler.List)
	incomes.POST("", incomeHandler.Create)
	incomes.GET("/:id", incomeHandler.Get)
	incomes.PUT("/:id", incomeHandler.Update)
	incomes.DELETE("/:id", incomeHandler.Delete)

	// Batch 7: Cash
	cash := api.Group("/cash", middleware.JWTAuth)
	cash.GET("/balance", cashHandler.GetBalance, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	cash.GET("/transactions", cashHandler.GetTransactions, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	cash.POST("/transfers", cashHandler.TransferToVault, middleware.RequireRoles("superadmin", "admin_keuangan"))

	// Batch 7: Vault
	vault := api.Group("/vault", middleware.JWTAuth)
	vault.GET("/balance", vaultHandler.GetBalance, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	vault.GET("/transactions", vaultHandler.GetTransactions, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))

	// Batch 7: Daily Closings
	dc := api.Group("/daily-closings", middleware.JWTAuth)
	dc.GET("", dailyClosingHandler.List, middleware.RequireRoles("superadmin", "admin_keuangan"))
	dc.POST("", dailyClosingHandler.Create, middleware.RequireRoles("superadmin", "admin_keuangan"))
	dc.GET("/:id", dailyClosingHandler.Get, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah", "yayasan"))
	dc.PATCH("/:id/confirm", dailyClosingHandler.Confirm, middleware.RequireRoles("superadmin", "admin_keuangan"))

	// Batch 7: Reports
	reports := api.Group("/reports", middleware.JWTAuth)
	reports.GET("/daily", reportHandler.Daily, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/monthly", reportHandler.Monthly, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/annual", reportHandler.Annual, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah", "yayasan"))
	reports.GET("/posisi-kas", reportHandler.PosisiKas, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/saldo", reportHandler.Saldo, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/transaksi-pengeluaran", reportHandler.TransaksiPengeluaran, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/tabungan", reportHandler.TabunganReport, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))
	reports.GET("/savings/students/:id", reportHandler.TabunganSiswaReport, middleware.RequireRoles("superadmin", "admin_keuangan"))
	reports.GET("/students/:id", reportHandler.ByStudent, middleware.RequireRoles("superadmin", "admin_keuangan"))
	reports.GET("/class-groups/:id", reportHandler.ByClassGroup, middleware.RequireRoles("superadmin", "admin_keuangan", "kepala_sekolah"))

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
