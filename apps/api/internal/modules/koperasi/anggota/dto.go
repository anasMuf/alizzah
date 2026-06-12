package anggota

// CreateRequest dipakai untuk create & update anggota.
type CreateRequest struct {
	FullName   string `json:"full_name" validate:"required,max=100"`
	MemberType string `json:"member_type" validate:"required,oneof=pegawai pengurus_yayasan pihak_luar"`
	Phone      string `json:"phone" validate:"omitempty,max=20"`
	Address    string `json:"address" validate:"omitempty"`
	IsActive   *bool  `json:"is_active"`
}

type Response struct {
	ID         uint   `json:"id"`
	FullName   string `json:"full_name"`
	MemberType string `json:"member_type"`
	Phone      string `json:"phone,omitempty"`
	Address    string `json:"address,omitempty"`
	IsActive   bool   `json:"is_active"`
}

func toResponse(m Member) Response {
	return Response{
		ID:         m.ID,
		FullName:   m.FullName,
		MemberType: m.MemberType,
		Phone:      m.Phone,
		Address:    m.Address,
		IsActive:   m.IsActive,
	}
}
