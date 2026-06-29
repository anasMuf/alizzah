package master

type CreateRequest struct {
	Name string `json:"name" validate:"required,max=50"`
}

type Response struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

func toResponse(m MasterData) Response { return Response{ID: m.ID, Name: m.Name} }
