import { useQuery } from "@tanstack/react-query";
import { customInstance } from "../../mutator/custom-instance";

// ── Types ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
	id: number;
	user_id: number;
	user_name: string;
	method: string;
	path: string;
	module: string;
	action: string;
	request_body?: string;
	status_code: number;
	error_message?: string;
	ip_address: string;
	latency_ms: number;
	created_at: string;
}

export interface AuditLogMeta {
	page: number;
	limit: number;
	total: number;
}

export interface AuditLogQueryParams {
	search?: string;
	user_id?: number;
	module?: string;
	method?: string;
	status_min?: number;
	status_max?: number;
	date_from?: string;
	date_to?: string;
	page?: number;
	limit?: number;
}

// ── Query hooks ─────────────────────────────────────────────────────────

function buildQuery(params: AuditLogQueryParams): Record<string, string> {
	const q: Record<string, string> = {};
	if (params.search) q.search = params.search;
	if (params.user_id) q.user_id = String(params.user_id);
	if (params.module) q.module = params.module;
	if (params.method) q.method = params.method;
	if (params.status_min !== undefined) q.status_min = String(params.status_min);
	if (params.status_max !== undefined) q.status_max = String(params.status_max);
	if (params.date_from) q.date_from = params.date_from;
	if (params.date_to) q.date_to = params.date_to;
	if (params.page) q.page = String(params.page);
	if (params.limit) q.limit = String(params.limit);
	return q;
}

// Matches Orval pattern: customInstance returns { data, status, headers },
// where `data` is the API response body { message, data: T[], meta }.
type WrappedResponse<T> = { data: T; status: number };

export function useAuditLogs(params: AuditLogQueryParams) {
	return useQuery({
		queryKey: ["audit-logs", params],
		queryFn: async () => {
			const searchParams = new URLSearchParams(buildQuery(params));
			const res = await customInstance<
				WrappedResponse<{
					message: string;
					data: AuditLogEntry[];
					meta: AuditLogMeta;
				}>
			>(`/v1/audit-logs?${searchParams.toString()}`);
			return res.data;
		},
	});
}

export function useAuditLogDetail(id: number | null) {
	return useQuery({
		queryKey: ["audit-logs", id],
		queryFn: async () => {
			const res = await customInstance<
				WrappedResponse<{ message: string; data: AuditLogEntry }>
			>(`/v1/audit-logs/${id}`);
			return res.data;
		},
		enabled: id !== null,
	});
}
