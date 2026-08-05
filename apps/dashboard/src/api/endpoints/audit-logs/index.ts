/**
 * Wrapper: re-exports generated audit-logs API with legacy/consumer-friendly names.
 * Generated file audit-logs.ts uses Orval naming (useGetV1AuditLogs, etc).
 * Consumers import from this index to get the shorter aliases.
 */

// Legacy type alias (params shape from model, not from endpoint file)
// Legacy entry type alias
export type {
	DtoAuditLogResponse as AuditLogEntry,
	GetV1AuditLogsParams as AuditLogQueryParams,
} from "../../model";
export * from "./audit-logs";
// Legacy hook aliases — used by pengaturan/log.tsx
export {
	useGetV1AuditLogs as useAuditLogs,
	useGetV1AuditLogsId as useAuditLogDetail,
} from "./audit-logs";
