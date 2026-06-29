package pemasok

type CreateRequest struct {
	Name          string `json:"name" validate:"required,max=100"`
	ContactPerson string `json:"contact_person" validate:"omitempty,max=100"`
	Phone         string `json:"phone" validate:"omitempty,max=20"`
	Address       string `json:"address" validate:"omitempty"`
}

type Response struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	ContactPerson string `json:"contact_person,omitempty"`
	Phone         string `json:"phone,omitempty"`
	Address       string `json:"address,omitempty"`
}

func toResponse(s Supplier) Response {
	return Response{
		ID:            s.ID,
		Name:          s.Name,
		ContactPerson: s.ContactPerson,
		Phone:         s.Phone,
		Address:       s.Address,
	}
}
