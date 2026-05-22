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

	// Seed data
	seeders.SeedSuperAdmin(db)

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

	// Services
	authService := service.NewAuthService(userRepo)
	userService := service.NewUserService(userRepo)
	ayService := service.NewAcademicYearService(ayRepo)
	studentService := service.NewStudentService(studentRepo)
	guardianService := service.NewGuardianService(guardianRepo, studentRepo)
	classGroupService := service.NewClassGroupService(classGroupRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	ayHandler := handler.NewAcademicYearHandler(ayService)
	studentHandler := handler.NewStudentHandler(studentService)
	guardianHandler := handler.NewGuardianHandler(guardianService)
	classGroupHandler := handler.NewClassGroupHandler(classGroupService)

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
	classGroups.GET("/:id", classGroupHandler.Get, middleware.RequireRoles("superadmin", "admin_administrasi", "admin_keuangan"))
	classGroups.PUT("/:id", classGroupHandler.Update, middleware.RequireRoles("superadmin", "admin_administrasi"))
	classGroups.DELETE("/:id", classGroupHandler.Delete, middleware.RequireRoles("superadmin", "admin_administrasi"))

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	e.Logger.Fatal(e.Start(":" + port))
}
