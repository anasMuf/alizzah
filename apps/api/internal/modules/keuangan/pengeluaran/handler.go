package pengeluaran

import (
	"api/dto"
	"api/middleware"
	"api/repository"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// Handler menggabungkan handler Expense + ExpenseCategory.
type Handler struct {
	Expense  *expenseHandler
	Category *categoryHandler
}

// New membuat Handler dengan semua dependency internal.
func New(db *gorm.DB, ayRepo repository.AcademicYearRepository) *Handler {
	expenseRepo := NewExpenseRepository(db)
	categoryRepo := NewCategoryRepository(db)
	expenseSvc := NewExpenseService(db, expenseRepo, categoryRepo, ayRepo)
	categorySvc := NewCategoryService(categoryRepo)

	return &Handler{
		Expense:  &expenseHandler{svc: expenseSvc},
		Category: &categoryHandler{svc: categorySvc},
	}
}

// Models mengembalikan model GORM milik fitur pengeluaran.
func (h *Handler) Models() []any {
	return Models()
}

// RegisterRoutes mendaftarkan route pengeluaran & kategori.
func (h *Handler) RegisterRoutes(api *echo.Group, jwt echo.MiddlewareFunc, guard *middleware.ModuleGuard) {
	// Expense Categories
	expCats := api.Group("/expense-categories", jwt)
	expCats.GET("", h.Category.List, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.POST("", h.Category.Create, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.PUT("/:id", h.Category.Update, guard.RequireModule(middleware.ModuleKeuangan))
	expCats.DELETE("/:id", h.Category.Delete, guard.RequireModule(middleware.ModuleKeuangan))

	// Expenses
	expenses := api.Group("/expenses", jwt, guard.RequireModule(middleware.ModuleKeuangan))
	expenses.GET("", h.Expense.List)
	expenses.POST("", h.Expense.Create)
	expenses.GET("/:id", h.Expense.Get)
	expenses.PUT("/:id", h.Expense.Update)
	expenses.DELETE("/:id", h.Expense.Delete)
}

// --- Expense Handler ---

type expenseHandler struct{ svc ExpenseService }

func (h *expenseHandler) List(c echo.Context) error {
	page, _ := strconv.Atoi(c.QueryParam("page"))
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	academicYearID, _ := strconv.Atoi(c.QueryParam("academic_year_id"))
	categoryID, _ := strconv.Atoi(c.QueryParam("expense_category_id"))

	params := ExpenseQueryParams{
		AcademicYearID:    uint(academicYearID),
		ExpenseCategoryID: uint(categoryID),
		StartDate:         c.QueryParam("start_date"),
		EndDate:           c.QueryParam("end_date"),
		Page:              page,
		Limit:             limit,
	}

	expenses, meta, err := h.svc.GetAll(params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Berhasil mengambil daftar pengeluaran",
		Data:    expenses,
		Meta:    *meta,
	})
}

func (h *expenseHandler) Create(c echo.Context) error {
	var req CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	createdBy, err := middleware.GetUserID(c)
	if err != nil {
		return err
	}
	expense, err := h.svc.Create(createdBy, req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil mencatat pengeluaran", Data: expense})
}

func (h *expenseHandler) Get(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	expense, err := h.svc.GetByID(uint(id))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil detail pengeluaran", Data: expense})
}

func (h *expenseHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	expense, err := h.svc.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui pengeluaran", Data: expense})
}

func (h *expenseHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.svc.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus pengeluaran"})
}

// --- Category Handler ---

type categoryHandler struct{ svc CategoryService }

func (h *categoryHandler) List(c echo.Context) error {
	categories, err := h.svc.GetAll()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil mengambil kategori pengeluaran", Data: categories})
}

func (h *categoryHandler) Create(c echo.Context) error {
	var req CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	cat, err := h.svc.Create(req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{Message: "Berhasil membuat kategori pengeluaran", Data: cat})
}

func (h *categoryHandler) Update(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	var req CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: err.Error()})
	}
	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "VALIDATION_ERROR", Message: err.Error()})
	}

	cat, err := h.svc.Update(uint(id), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil memperbarui kategori pengeluaran", Data: cat})
}

func (h *categoryHandler) Delete(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{Status: http.StatusBadRequest, Code: "BAD_REQUEST", Message: "ID tidak valid"})
	}

	if err := h.svc.Delete(uint(id)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{Status: status, Code: code, Message: err.Error()})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{Message: "Berhasil menghapus kategori pengeluaran"})
}
