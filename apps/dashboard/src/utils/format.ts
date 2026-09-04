/** Format a Date object into YYYY-MM-DD string (for <input type="date">) */
export const formatDateInput = (date: Date): string => {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
};

export const formatCurrency = (amount: number): string => {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

export const formatDate = (dateString?: string): string => {
	if (!dateString) return "-";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return dateString;
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
};

/** Format month (1-12) + year into Indonesian "September 2026". */
export const formatMonthYear = (month?: number, year?: number): string => {
	if (!month || !year) return "-";
	return new Intl.DateTimeFormat("id-ID", {
		month: "long",
		year: "numeric",
	}).format(new Date(year, month - 1, 1));
};

export const formatDateTime = (dateString?: string): string => {
	if (!dateString) return "-";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return dateString;
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
};
