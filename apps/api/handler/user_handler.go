package handler

import (
	"api/dto"
	"api/middleware"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(userService service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// List godoc
// @Summary      List all users
// @Description  Get paginated list of users with optional search and role filter
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        search  query   string  false  "Search by name or email"
// @Param        role    query   string  false  "Filter by role"
// @Param        page    query   int     false  "Page number"  default(1)
// @Param        limit   query   int     false  "Items per page"  default(20)
// @Success      200  {object}  dto.PaginatedResponse{data=[]dto.UserResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Router       /v1/users [get]
func (h *UserHandler) List(c echo.Context) error {
	page, limit := utility.ParsePagination(c)
	params := dto.UserQueryParams{
		Search: c.QueryParam("search"),
		Role:   c.QueryParam("role"),
		Page:   page,
		Limit:  limit,
	}

	users, meta, err := h.userService.GetAll(params)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, dto.PaginatedResponse{
		Message: "Data retrieved successfully",
		Data:    users,
		Meta:    *meta,
	})
}

// Create godoc
// @Summary      Create a new user
// @Description  Create a new user (superadmin only)
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        request  body      dto.CreateUserRequest  true  "User data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.UserResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Router       /v1/users [post]
func (h *UserHandler) Create(c echo.Context) error {
	var req dto.CreateUserRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	user, err := h.userService.Create(req)
	if err != nil {
		if err.Error() == "Email sudah digunakan" {
			return echo.NewHTTPError(http.StatusConflict, err.Error())
		}
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "User berhasil dibuat",
		Data:    user,
	})
}

// Get godoc
// @Summary      Get user by ID
// @Description  Get a single user's detail
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "User ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.UserResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/users/{id} [get]
func (h *UserHandler) Get(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	user, err := h.userService.GetByID(uint(id))
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    user,
	})
}

// Update godoc
// @Summary      Update a user
// @Description  Update user data (superadmin only)
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                    true  "User ID"
// @Param        request  body      dto.UpdateUserRequest  true  "Updated user data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.UserResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Router       /v1/users/{id} [put]
func (h *UserHandler) Update(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	var req dto.UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	user, err := h.userService.Update(uint(id), req)
	if err != nil {
		switch err.Error() {
		case "User tidak ditemukan":
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		case "Email sudah digunakan":
			return echo.NewHTTPError(http.StatusConflict, err.Error())
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "User berhasil diperbarui",
		Data:    user,
	})
}

// Delete godoc
// @Summary      Delete a user
// @Description  Soft delete a user (superadmin only, cannot delete self)
// @Tags         users
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id   path      int  true  "User ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      422  {object}  dto.ErrorResponse
// @Router       /v1/users/{id} [delete]
func (h *UserHandler) Delete(c echo.Context) error {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "ID tidak valid")
	}

	currentUserID := middleware.GetCurrentUserID(c)

	err = h.userService.Delete(uint(id), currentUserID)
	if err != nil {
		switch err.Error() {
		case "User tidak ditemukan":
			return echo.NewHTTPError(http.StatusNotFound, err.Error())
		case "Tidak dapat menghapus akun sendiri":
			return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "User berhasil dihapus",
	})
}
