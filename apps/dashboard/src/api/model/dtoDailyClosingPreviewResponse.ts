/**
 * Manually maintained (mirrors backend dto.DailyClosingPreviewResponse).
 * Alizzah Manajemen API
 */

export interface DtoDailyClosingPreviewResponse {
	already_closed?: boolean;
	closing_date?: string;
	opening_balance?: number;
	day_cash_in?: number;
	day_cash_out?: number;
	ledger_cash_amount?: number;
	system_cash_amount?: number;
	workaround_adjustment?: number;
}
