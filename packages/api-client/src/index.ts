// @alizzah/api-client — klien API bersama (HTTP mutator + hooks React Query hasil Orval).
// Endpoint & model di-generate Orval ke ./endpoints dan ./model, diimpor via subpath:
//   import { useGetV1Students } from "@alizzah/api-client/endpoints/students/students";
//   import type { DtoStudentResponse } from "@alizzah/api-client/model/dtoStudentResponse";
//
// Token getter disuntik oleh @alizzah/auth lewat setTokenGetter (memutus siklus auth<->api).
// Lihat docs/architecture/adr-001-modular-structure.md.
export { ApiError, customInstance, setTokenGetter } from "./mutator/custom-instance";
