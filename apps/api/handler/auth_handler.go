package handler

import (
	"api/dto"
	"api/middleware"
	"api/service"
	"net/http"

	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Login godoc
// @Summary      Login user
// @Description  Authenticate user with email and password, returns JWT token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request  body      dto.LoginRequest  true  "Login credentials"
// @Success      200      {object}  dto.SuccessResponse{data=dto.LoginResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Router       /v1/auth/login [post]
func (h *AuthHandler) Login(c echo.Context) error {
	var req dto.LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Format request tidak valid")
	}
	if err := c.Validate(&req); err != nil {
		return err
	}

	result, err := h.authService.Login(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Login berhasil",
		Data:    result,
	})
}

// Logout godoc
// @Summary      Logout user
// @Description  Logout current user (client should discard the token)
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Router       /v1/auth/logout [post]
func (h *AuthHandler) Logout(c echo.Context) error {
	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Logout berhasil",
	})
}

// Me godoc
// @Summary      Get current user
// @Description  Get the profile of the currently authenticated user
// @Tags         auth
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=dto.UserResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Router       /v1/auth/me [get]
func (h *AuthHandler) Me(c echo.Context) error {
	userID := middleware.GetCurrentUserID(c)

	user, err := h.authService.GetMe(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, err.Error())
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Data retrieved successfully",
		Data:    user,
	})
}
