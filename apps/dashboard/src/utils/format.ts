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
