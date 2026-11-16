/**
 * Filter status invoice yang masih memiliki sisa tagihan.
 *
 * Dipakai saat meminta daftar tagihan untuk Total Tunggakan: `partial` juga
 * harus ikut, karena `total_outstanding` dihitung dari `total_amount - paid_amount`.
 */
export const OUTSTANDING_INVOICE_STATUSES = "unpaid,partial";
