/**
 * Aturan penerapan item dispensasi pada pembayaran.
 *
 * Dispensasi disimpan sebagai item invoice bernilai negatif dengan
 * `offset_category` = kategori tagihan yang didiskon. Karena itu potongan hanya
 * boleh dihitung jika item pada kategori target benar-benar ikut dibayar.
 *
 * Khusus dispensasi daycare, backend mendiskon paket konsumsi (`daycare_meal`)
 * walau `offset_category`-nya tersimpan sebagai `daycare`.
 */

export function dispensationTargetCategory(
	offsetCategory?: string | null,
): string | undefined {
	if (!offsetCategory) return undefined;
	return offsetCategory === "daycare" ? "daycare_meal" : offsetCategory;
}

interface InvoiceDetailLike {
	id?: number;
	items?: Array<{ category?: string; offset_category?: string | null }>;
}

/** Peta invoiceId → kategori item yang menjadi target dispensasi. */
export function buildDispensationTargets(
	invoiceDetails: InvoiceDetailLike[],
): Map<number, Set<string>> {
	const targets = new Map<number, Set<string>>();
	for (const detail of invoiceDetails) {
		if (detail?.id == null) continue;
		for (const item of detail.items ?? []) {
			if (item.category !== "dispensation") continue;
			const target = dispensationTargetCategory(item.offset_category);
			if (!target) continue;
			const set = targets.get(detail.id) ?? new Set<string>();
			set.add(target);
			targets.set(detail.id, set);
		}
	}
	return targets;
}

export interface PaymentItemLike {
	id: number;
	invoice_id: number;
	category?: string;
	is_dispensation?: boolean;
	dispensation_target_category?: string;
}

/**
 * Dispensasi berlaku jika ada item non-dispensasi pada invoice & kategori
 * targetnya yang ikut dibayar. Bila `offset_category` kosong (data lama),
 * fallback ke "ada item positif apa pun di invoice yang sama".
 */
export function isDispensationApplicable(
	dispensation: PaymentItemLike,
	invoiceItems: PaymentItemLike[],
	payAmounts: Record<number, number>,
	excludedItems: number[],
): boolean {
	const paidItems = invoiceItems.filter(
		(item) =>
			item.invoice_id === dispensation.invoice_id &&
			!item.is_dispensation &&
			!excludedItems.includes(item.id) &&
			(payAmounts[item.id] ?? 0) > 0,
	);
	const target = dispensation.dispensation_target_category;
	if (target) return paidItems.some((item) => item.category === target);
	return paidItems.length > 0;
}

/**
 * Total yang harus dibayar dari item invoice, termasuk dispensasi yang berlaku.
 * Nilai negatif dispensasi yang targetnya tidak ikut dibayar tidak dihitung.
 */
export function computeInvoicePaymentTotal(
	invoiceItems: PaymentItemLike[],
	payAmounts: Record<number, number>,
	excludedItems: number[],
): number {
	return invoiceItems.reduce((sum, item) => {
		if (excludedItems.includes(item.id)) return sum;
		const amount = payAmounts[item.id] ?? 0;
		if (!item.is_dispensation) return sum + amount;
		return (
			sum +
			(isDispensationApplicable(item, invoiceItems, payAmounts, excludedItems)
				? amount
				: 0)
		);
	}, 0);
}
