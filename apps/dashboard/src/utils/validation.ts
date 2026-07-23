import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────────────────────

export const loginSchema = z.object({
	email: z.string().email("Email tidak valid"),
	password: z.string().min(1, "Password wajib diisi"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
	full_name: z.string().min(3, "Nama minimal 3 karakter").max(100),
	username: z.string().min(3, "Username minimal 3 karakter").max(50),
	email: z.string().email("Format email tidak valid").max(100),
	password: z.string().min(6, "Password minimal 6 karakter").max(100),
	phone: z.string().min(5, "Nomor telepon tidak valid").max(15),
	address: z.string().min(1, "Alamat wajib diisi"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Payment ────────────────────────────────────────────────────────────

export const paymentItemSchema = z.object({
	invoice_item_id: z
		.number({ message: "ID item tagihan tidak valid" })
		.positive(),
	amount: z.number({ message: "Jumlah pembayaran harus > 0" }).positive(),
});

export const incidentalItemSchema = z.object({
	name: z.string().min(1, "Nama item wajib diisi").max(100),
	amount: z.number({ message: "Jumlah harus > 0" }).positive(),
});

export const paymentSchema = z.object({
	student_id: z.number({ message: "Siswa wajib dipilih" }).positive(),
	academic_year_id: z
		.number({ message: "Tahun ajaran wajib diisi" })
		.positive(),
	payment_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
	source: z.enum(["cash", "savings"], {
		message: "Sumber dana harus cash atau savings",
	}),
	notes: z.string().optional(),
	items: z
		.array(paymentItemSchema)
		.min(1, "Minimal satu item pembayaran")
		.optional()
		.default([]),
	incidental_items: z.array(incidentalItemSchema).optional().default([]),
	savings_deposit: z.number().min(0).optional().default(0),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ─── Expense ────────────────────────────────────────────────────────────

export const expenseSchema = z.object({
	academic_year_id: z
		.number({ message: "Tahun ajaran wajib diisi" })
		.positive(),
	expense_category_id: z
		.number({ message: "Kategori wajib dipilih" })
		.positive(),
	expense_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
	amount: z
		.number({ message: "Jumlah wajib diisi" })
		.positive("Jumlah harus > 0"),
	description: z.string().min(1, "Deskripsi wajib diisi"),
	receipt_url: z.string().url().optional().or(z.literal("")),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
