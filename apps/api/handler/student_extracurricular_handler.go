package handler

import (
	"api/dto"
	"api/service"
	"api/utility"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type StudentExtracurricularHandler struct {
	seService  service.StudentExtracurricularService
	invoiceGen service.InvoiceGenerateService
}

func NewStudentExtracurricularHandler(seService service.StudentExtracurricularService, invoiceGen service.InvoiceGenerateService) *StudentExtracurricularHandler {
	return &StudentExtracurricularHandler{seService: seService, invoiceGen: invoiceGen}
}

// GetByStudent godoc
// @Summary      Get student extracurriculars
// @Description  Get a list of extracurriculars for a specific student
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Student ID"
// @Param        academic_year_id  query  int  false  "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.StudentExtracurricularResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars [get]
func (h *StudentExtracurricularHandler) GetByStudent(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	params := dto.StudentExtracurricularQueryParams{}
	if ayID := c.QueryParam("academic_year_id"); ayID != "" {
		if id, err := strconv.Atoi(ayID); err == nil {
			params.AcademicYearID = uint(id)
		}
	}

	ses, err := h.seService.GetByStudentID(uint(studentID), params)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data ekstrakurikuler siswa",
		Data:    ses,
	})
}

// Enroll godoc
// @Summary      Enroll student in extracurricular
// @Description  Enroll a student in an extracurricular for a specific academic year
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                 true  "Student ID"
// @Param        request  body      dto.EnrollExtracurricularRequest    true  "Enrollment data"
// @Success      201      {object}  dto.SuccessResponse{data=dto.StudentExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      409      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars [post]
func (h *StudentExtracurricularHandler) Enroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	var req dto.EnrollExtracurricularRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	se, err := h.seService.Enroll(uint(studentID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		if err.Error() == "Siswa sudah terdaftar di ekstrakurikuler ini untuk tahun ajaran tersebut" {
			status = http.StatusConflict
			code = "CONFLICT"
		}
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, dto.SuccessResponse{
		Message: "Berhasil mendaftarkan ekstrakurikuler siswa",
		Data:    se,
	})
}

// Update godoc
// @Summary      Update student extracurricular
// @Description  Update student extracurricular details
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id       path      int                                      true  "Student ID"
// @Param        se_id    path      int                                      true  "Student Extracurricular ID"
// @Param        request  body      dto.UpdateStudentExtracurricularRequest  true  "Updated data"
// @Success      200      {object}  dto.SuccessResponse{data=dto.StudentExtracurricularResponse}
// @Failure      400      {object}  dto.ErrorResponse
// @Failure      401      {object}  dto.ErrorResponse
// @Failure      403      {object}  dto.ErrorResponse
// @Failure      404      {object}  dto.ErrorResponse
// @Failure      500      {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id} [put]
func (h *StudentExtracurricularHandler) Update(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID pendaftaran tidak valid",
		})
	}

	var req dto.UpdateStudentExtracurricularRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: err.Error(),
		})
	}

	if err := c.Validate(req); err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "VALIDATION_ERROR",
			Message: err.Error(),
		})
	}

	se, err := h.seService.Update(uint(studentID), uint(seID), req)
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil memperbarui data ekstrakurikuler siswa",
		Data:    se,
	})
}

// Unenroll godoc
// @Summary      Unenroll student from extracurricular
// @Description  Unenroll a student from an extracurricular
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id     path      int  true  "Student ID"
// @Param        se_id  path      int  true  "Student Extracurricular ID"
// @Success      200    {object}  dto.SuccessResponse
// @Failure      400    {object}  dto.ErrorResponse
// @Failure      401    {object}  dto.ErrorResponse
// @Failure      403    {object}  dto.ErrorResponse
// @Failure      404    {object}  dto.ErrorResponse
// @Failure      500    {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{se_id} [delete]
func (h *StudentExtracurricularHandler) Unenroll(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	seID, err := strconv.Atoi(c.Param("se_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID pendaftaran tidak valid",
		})
	}

	if err := h.seService.Unenroll(uint(studentID), uint(seID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mencabut ekstrakurikuler siswa",
	})
}

// GetStudentsByExtracurricular godoc
// @Summary      Get students in an extracurricular
// @Description  Get list of students that have PASTA billing items in the given
//
//	month range (billing-based). Without range params, defaults to the
//	full academic year.
//
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                path   int  true   "Extracurricular ID"
// @Param        academic_year_id  query  int  true   "Academic Year ID"
// @Param        month_from        query  int  false  "Bulan awal rentang (1-12); kosong = bulan pertama tahun ajaran"
// @Param        year_from         query  int  false  "Tahun awal rentang; kosong = tahun mulai tahun ajaran"
// @Param        month_to          query  int  false  "Bulan akhir rentang (1-12); kosong = bulan terakhir tahun ajaran"
// @Param        year_to           query  int  false  "Tahun akhir rentang; kosong = tahun akhir tahun ajaran"
// @Success      200  {object}  dto.SuccessResponse{data=dto.ExtracurricularExportItem}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      404  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/{id}/students [get]
func (h *StudentExtracurricularHandler) GetStudentsByExtracurricular(c echo.Context) error {
	exID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID ekstrakurikuler tidak valid",
		})
	}

	ayID, err := strconv.Atoi(c.QueryParam("academic_year_id"))
	if err != nil || ayID <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "academic_year_id wajib diisi",
		})
	}

	fromMonth, _ := strconv.Atoi(c.QueryParam("month_from"))
	fromYear, _ := strconv.Atoi(c.QueryParam("year_from"))
	toMonth, _ := strconv.Atoi(c.QueryParam("month_to"))
	toYear, _ := strconv.Atoi(c.QueryParam("year_to"))

	// Validasi bulan rentang (1-12); kosong (0) berarti pakai default tahun ajaran
	for name, val := range map[string]int{"month_from": fromMonth, "month_to": toMonth} {
		if val != 0 && (val < 1 || val > 12) {
			return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
				Status:  http.StatusBadRequest,
				Code:    "BAD_REQUEST",
				Message: name + " harus antara 1-12",
			})
		}
	}

	item, err := h.seService.GetStudentsByExtracurricular(uint(exID), uint(ayID), uint(fromMonth), uint(fromYear), uint(toMonth), uint(toYear))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data siswa",
		Data:    item,
	})
}

// Export godoc
// @Summary      Export extracurriculars with students
// @Description  Get all extracurriculars with their enrolled students for Excel export
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        academic_year_id  query   int  true   "Academic Year ID"
// @Success      200  {object}  dto.SuccessResponse{data=[]dto.ExtracurricularExportItem}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/export [get]
func (h *StudentExtracurricularHandler) Export(c echo.Context) error {
	ayID, err := strconv.Atoi(c.QueryParam("academic_year_id"))
	if err != nil || ayID <= 0 {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "academic_year_id wajib diisi",
		})
	}

	items, err := h.seService.ExportByAcademicYear(uint(ayID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Berhasil mengambil data export",
		Data:    items,
	})
}

// SyncInvoices godoc
// @Summary      Sync extracurricular monthly invoices
// @Description  Generate missing monthly invoice items for all active extracurricular enrollments
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=dto.ExtracurricularSyncResult}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/sync-invoices [post]
func (h *StudentExtracurricularHandler) SyncInvoices(c echo.Context) error {
	result, err := h.invoiceGen.SyncExtracurricularMonthlyInvoices()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Sinkronisasi tagihan ekstrakurikuler bulanan selesai",
		Data:    result,
	})
}

// PreviewSyncInvoices godoc
// @Summary      Preview extracurricular sync (dry-run)
// @Description  Hitung rencana sinkronisasi tagihan ekstrakurikuler bulanan
//
//	TANPA mengubah data: bulan mana yang akan ditambah item dan alasan bulan
//	 dilewati (skip/exclusion, sudah ada, invoice belum ada).
//
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Success      200  {object}  dto.SuccessResponse{data=dto.ExtracurricularPreviewResponse}
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/extracurriculars/preview-sync-invoices [post]
func (h *StudentExtracurricularHandler) PreviewSyncInvoices(c echo.Context) error {
	result, err := h.invoiceGen.PlanExtracurricularSync()
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Preview sinkronisasi ekstrakurikuler berhasil dihitung",
		Data:    result,
	})
}

// CleanupExtracurricularInvoices godoc
// @Summary      Hapus item unpaid ekskul dari invoice mulai bulan mulai mengikuti
// @Description  Recovery endpoint: menghapus item unpaid ekskul tertentu dari
//
//	invoice bulanan siswa (termasuk bulan-bulan sebelumnya) tanpa
//	hapus riwayat pembayaran. Gunakan ketika siswa pindah/pindah
//	ekskul dan invoice masih menampilkan tagihan ekskul lama.
//
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                  path  int  true  "Student ID"
// @Param        extracurricular_id  path  int  true  "Extracurricular ID"
// @Success      200  {object}  dto.SuccessResponse
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{extracurricular_id}/cleanup-invoices [post]
func (h *StudentExtracurricularHandler) CleanupExtracurricularInvoices(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	extracurricularID, err := strconv.Atoi(c.Param("extracurricular_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID ekstrakurikuler tidak valid",
		})
	}

	if err := h.invoiceGen.CleanupExtracurricularInvoices(uint(studentID), uint(extracurricularID)); err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Item ekstrakurikuler berhasil dibersihkan dari invoice mendatang",
	})
}

// PreviewCleanupExtracurricularInvoices godoc
// @Summary      Preview pembersihan tagihan PASTA (dry-run)
// @Description  Menampilkan item unpaid ekstrakurikuler yang AKAN dihapus dari
//
//	invoice bulanan siswa jika cleanup dijalankan — tanpa mengubah
//	data apa pun. Gunakan untuk memverifikasi aksi sebelum
//	mengeksekusi cleanup-invoices.
//
// @Tags         student-extracurriculars
// @Accept       json
// @Produce      json
// @Security     ApiKeyAuth
// @Param        id                  path  int  true  "Student ID"
// @Param        extracurricular_id  path  int  true  "Extracurricular ID"
// @Success      200  {object}  dto.SuccessResponse{data=dto.ExtracurricularCleanupPreviewResponse}
// @Failure      400  {object}  dto.ErrorResponse
// @Failure      401  {object}  dto.ErrorResponse
// @Failure      403  {object}  dto.ErrorResponse
// @Failure      500  {object}  dto.ErrorResponse
// @Router       /v1/students/{id}/extracurriculars/{extracurricular_id}/cleanup-invoices/preview [post]
func (h *StudentExtracurricularHandler) PreviewCleanupExtracurricularInvoices(c echo.Context) error {
	studentID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID siswa tidak valid",
		})
	}

	extracurricularID, err := strconv.Atoi(c.Param("extracurricular_id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, dto.ErrorResponse{
			Status:  http.StatusBadRequest,
			Code:    "BAD_REQUEST",
			Message: "ID ekstrakurikuler tidak valid",
		})
	}

	result, err := h.invoiceGen.PlanExtracurricularCleanupInvoices(uint(studentID), uint(extracurricularID))
	if err != nil {
		status, code := utility.GetErrorStatusAndCode(err)
		return c.JSON(status, dto.ErrorResponse{
			Status:  status,
			Code:    code,
			Message: err.Error(),
		})
	}

	return c.JSON(http.StatusOK, dto.SuccessResponse{
		Message: "Preview pembersihan tagihan PASTA",
		Data:    result,
	})
}
