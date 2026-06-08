/**
 * Custom hooks for Dispensations (fee discounts/waivers)
 */

import type {
	QueryClient,
	UseMutationOptions,
	UseQueryOptions,
} from "@tanstack/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// ─── Types ───────────────────────────────────────────────────────────

export interface DispensationResponse {
	id: number;
	student_id: number;
	academic_year: { id: number; name: string };
	fee_category: string;
	discount_type: string; // percent | fixed
	discount_value: number;
	is_permanent: boolean;
	start_month: number;
	start_year: number;
	end_month?: number;
	end_year?: number;
	reason: string;
	notes?: string;
	is_active: boolean;
	created_by: { id: number; full_name: string };
	created_at: string;
}

export interface CreateDispensationRequest {
	academic_year_id: number;
	fee_category?: string;
	discount_type: string;
	discount_value: number;
	is_permanent: boolean;
	start_month: number;
	start_year: number;
	end_month?: number;
	end_year?: number;
	reason: string;
	notes?: string;
}

export interface UpdateDispensationRequest {
	discount_type: string;
	discount_value: number;
	is_permanent: boolean;
	end_month?: number;
	end_year?: number;
	reason: string;
	notes?: string;
}

// ─── API Functions ───────────────────────────────────────────────────

const getStudentDispensations = async (
	studentId: number,
	params?: { academic_year_id?: number },
) =>
	customInstance<any>(`/v1/students/${studentId}/dispensations`, {
		method: "GET",
		params: params as Record<string, unknown>,
	});

const createDispensation = async (
	studentId: number,
	data: CreateDispensationRequest,
) =>
	customInstance<any>(`/v1/students/${studentId}/dispensations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

const updateDispensation = async (
	id: number,
	data: UpdateDispensationRequest,
) =>
	customInstance<any>(`/v1/dispensations/${id}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

const toggleDispensation = async (id: number) =>
	customInstance<any>(`/v1/dispensations/${id}/toggle`, { method: "PATCH" });

const deleteDispensation = async (id: number) =>
	customInstance<any>(`/v1/dispensations/${id}`, { method: "DELETE" });

// ─── Query Keys ──────────────────────────────────────────────────────

export const dispensationKeys = {
	studentList: (studentId: number) =>
		[`/v1/students/${studentId}/dispensations`] as const,
};

// ─── Hooks ───────────────────────────────────────────────────────────

export const useGetStudentDispensations = (
	studentId: number,
	params?: { academic_year_id?: number },
	options?: { query?: Partial<UseQueryOptions> },
) =>
	useQuery({
		queryKey: [...dispensationKeys.studentList(studentId), params],
		queryFn: () => getStudentDispensations(studentId, params),
		enabled: !!studentId,
		...options?.query,
	} as any);

export const useCreateDispensation = (
	options?: {
		mutation?: UseMutationOptions<
			any,
			Error,
			{ studentId: number; data: CreateDispensationRequest }
		>;
	},
	qc?: QueryClient,
) =>
	useMutation(
		{
			mutationFn: ({
				studentId,
				data,
			}: {
				studentId: number;
				data: CreateDispensationRequest;
			}) => createDispensation(studentId, data),
			...options?.mutation,
		},
		qc,
	);

export const useUpdateDispensation = (
	options?: {
		mutation?: UseMutationOptions<
			any,
			Error,
			{ id: number; data: UpdateDispensationRequest }
		>;
	},
	qc?: QueryClient,
) =>
	useMutation(
		{
			mutationFn: ({
				id,
				data,
			}: {
				id: number;
				data: UpdateDispensationRequest;
			}) => updateDispensation(id, data),
			...options?.mutation,
		},
		qc,
	);

export const useToggleDispensation = (
	options?: { mutation?: UseMutationOptions<any, Error, number> },
	qc?: QueryClient,
) =>
	useMutation(
		{
			mutationFn: (id: number) => toggleDispensation(id),
			...options?.mutation,
		},
		qc,
	);

export const useDeleteDispensation = (
	options?: { mutation?: UseMutationOptions<any, Error, number> },
	qc?: QueryClient,
) =>
	useMutation(
		{
			mutationFn: (id: number) => deleteDispensation(id),
			...options?.mutation,
		},
		qc,
	);
