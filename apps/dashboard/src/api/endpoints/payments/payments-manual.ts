/**
 * Manual hooks for PUT /v1/payments/:id and DELETE /v1/payments/:id.
 * TODO: replace with orval-generated hooks after Swagger is updated.
 */

import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { DtoCreatePaymentRequest } from "../../model";
import { customInstance } from "../../mutator/custom-instance";

// ── Update Payment ──────────────────────────────────────────────

type PutV1PaymentsIdResult = { data: { data: any } };
type PutV1PaymentsIdVariables = { id: number; data: DtoCreatePaymentRequest };

export const putV1PaymentsId = (id: number, data: DtoCreatePaymentRequest) => {
	return customInstance<PutV1PaymentsIdResult>(`/v1/payments/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});
};

type PutV1PaymentsIdMutationOptions = {
	mutation?: UseMutationOptions<
		PutV1PaymentsIdResult,
		Error,
		PutV1PaymentsIdVariables
	>;
};

export const usePutV1PaymentsId = (
	options?: PutV1PaymentsIdMutationOptions,
) => {
	const { mutation: mutationOptions } = options ?? {};
	return useMutation<PutV1PaymentsIdResult, Error, PutV1PaymentsIdVariables>({
		...mutationOptions,
		mutationFn: ({ id, data }) => putV1PaymentsId(id, data),
	});
};

// ── Delete Payment ──────────────────────────────────────────────

type DeleteV1PaymentsIdResult = { data: any };

export const deleteV1PaymentsId = (id: number) => {
	return customInstance<DeleteV1PaymentsIdResult>(`/v1/payments/${id}`, {
		method: "DELETE",
	});
};

type DeleteV1PaymentsIdMutationOptions = {
	mutation?: UseMutationOptions<DeleteV1PaymentsIdResult, Error, number>;
};

export const useDeleteV1PaymentsId = (
	options?: DeleteV1PaymentsIdMutationOptions,
) => {
	const { mutation: mutationOptions } = options ?? {};
	return useMutation<DeleteV1PaymentsIdResult, Error, number>({
		...mutationOptions,
		mutationFn: (id: number) => deleteV1PaymentsId(id),
	});
};
