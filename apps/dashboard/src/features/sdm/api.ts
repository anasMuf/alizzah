import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdmGet, sdmSend } from "./lib/client";

// ── Types ──

export interface Golongan {
	id: number;
	kode: string;
	from_day?: number | null;
	to_day?: number | null;
	keterangan: string;
	nilai: number;
}

export interface GolonganInput {
	kode: string;
	from_day?: number | null;
	to_day?: number | null;
	keterangan?: string;
	nilai: number;
}

export interface Kehadiran {
	id: number;
	nilai_per_hari: number;
}

export interface Kedisiplinan {
	id: number;
	kode: string;
	nama: string;
	nilai: number;
}

export interface KedisiplinanInput {
	kode: string;
	nama: string;
	nilai: number;
}

export interface MasterItem {
	id: number;
	nama: string;
	nilai?: number | null;
}

export interface MasterItemInput {
	nama: string;
	nilai?: number | null;
}

export interface GolonganBrief {
	id: number;
	kode: string;
	nilai: number;
	keterangan: string;
}

export interface Employee {
	id: number;
	legacy_id?: number | null;
	nama: string;
	tgl_masuk?: string | null;
	golongan_id?: number | null;
	golongan?: GolonganBrief | null;
	effective_golongan_id: number;
	sertifikasi: boolean;
	impasing: boolean;
	is_active: boolean;
}

export interface EmployeeInput {
	nama: string;
	tgl_masuk?: string | null;
	golongan_id?: number | null;
	sertifikasi: boolean;
	impasing: boolean;
	is_active: boolean;
}

export interface HRAttach {
	id: number;
	nama: string;
	nilai: number;
	// id master disimpan di field spesifik masing-masing tipe
}

export interface HRBundle {
	fungsional: Array<HRAttach & { fungsional_id: number }>;
	tugas_tambahan: Array<HRAttach & { tugas_tambahan_id: number }>;
	penanggung_jawab: Array<HRAttach & { penanggung_jawab_id: number }>;
	lainlain: Array<HRAttach & { lainlain_id: number }>;
}

export interface EmployeeDetail extends Employee {
	hr: HRBundle;
}

export interface AbsenRow {
	id: number;
	periode: string;
	employee_id: number;
	nama: string;
	hadir: number;
	hadir_siaga: number;
	hadir_terlambat: number;
	hadir_piket: number;
	pulang_awal: number;
}

export interface AbsenEntry {
	employee_id: number;
	hadir: number;
	hadir_siaga: number;
	hadir_terlambat: number;
	hadir_piket: number;
	pulang_awal: number;
}

export interface Pinjaman {
	id: number;
	employee_id: number;
	nama: string;
	tgl_pinjam: string;
	jumlah: number;
	angsuran_terbayar: number;
	sisa: number;
	is_lunas: boolean;
	tgl_lunas?: string | null;
}

export interface AngsuranItem {
	id: number;
	periode: string;
	angsuran: number;
	tanggal: string;
}

export interface PinjamanDetail extends Pinjaman {
	angsuran: AngsuranItem[];
}

export interface PayrollRow {
	employee_id: number;
	nama: string;
	golongan_kode: string;
	hr_pokok: number;
	sertifikasi: boolean;
	impasing: boolean;
	jumlah_hadir: number;
	kehadiran: number;
	jumlah_siaga: number;
	siaga: number;
	jumlah_piket: number;
	piket: number;
	jumlah_telat: number;
	bonus_terlambat: number;
	jumlah_pulang: number;
	bonus_pulang_awal: number;
	subtotal_absen: number;
	subtotal_f: number;
	subtotal_t: number;
	subtotal_p: number;
	subtotal_l: number;
	angsuran: number;
	total_gaji: number;
}

// PayrollStatus — hasil GET /penggajian: preview (dinamis) atau finalized (snapshot).
export interface PayrollStatus {
	status: "preview" | "finalized";
	finalized_at?: string;
	finalized_by?: string;
	total_gaji: number;
	rows: PayrollRow[];
}

// RekapBulan — ringkasan satu bulan dalam rekap per Tahun Ajaran.
export interface RekapBulan {
	periode: string; // YYYY-MM-05
	label: string;
	status: string;
	total_gaji: number;
	jumlah_karyawan: number;
}

export interface RekapResponse {
	academic_year_id: number;
	academic_year_name: string;
	per_bulan: RekapBulan[];
	total_gaji: number;
}

export interface SlipItem {
	nama: string;
	nominal: number;
}

export interface Slip extends PayrollRow {
	rincian_fungsional: SlipItem[];
	rincian_tugas_tambahan: SlipItem[];
	rincian_penanggung_jawab: SlipItem[];
	rincian_lainlain: SlipItem[];
}

export interface Summary {
	jumlah_karyawan_aktif: number;
	jumlah_golongan: number;
	pinjaman_aktif: number;
	total_sisa_pinjaman: number;
	total_gaji_bulan_ini: number;
	per_bulan: Array<{ bulan: string; total_gaji: number }>;
	guru_per_golongan: Array<{ kode: string; jumlah: number }>;
}

// ── Query keys ──

export const sdmKeys = {
	all: ["sdm"] as const,
	golongan: ["sdm", "golongan"] as const,
	kehadiran: ["sdm", "kehadiran"] as const,
	kedisiplinan: ["sdm", "kedisiplinan"] as const,
	fungsional: ["sdm", "fungsional"] as const,
	tugasTambahan: ["sdm", "tugas-tambahan"] as const,
	penanggungJawab: ["sdm", "penanggung-jawab"] as const,
	lainlain: ["sdm", "lainlain"] as const,
	employees: (search: string, active: boolean) =>
		["sdm", "employees", { search, active }] as const,
	employee: (id: number) => ["sdm", "employees", id] as const,
	employeeHR: (id: number) => ["sdm", "employees", id, "hr"] as const,
	absen: (periode: string) => ["sdm", "absen", periode] as const,
	pinjaman: (status: string) => ["sdm", "pinjaman", status] as const,
	pinjamanDetail: (id: number) => ["sdm", "pinjaman", id] as const,
	penggajian: (periode: string) => ["sdm", "penggajian", periode] as const,
	slip: (periode: string, employeeId: number) =>
		["sdm", "penggajian", periode, employeeId] as const,
	summary: (tahun: string) => ["sdm", "summary", tahun] as const,
};

// ── Master hooks ──

export function useGolongans() {
	return useQuery({
		queryKey: sdmKeys.golongan,
		queryFn: () => sdmGet<Golongan[]>("/golongan"),
	});
}

export function useKehadiran() {
	return useQuery({
		queryKey: sdmKeys.kehadiran,
		queryFn: () => sdmGet<Kehadiran>("/kehadiran"),
	});
}

export function useKedisiplinan() {
	return useQuery({
		queryKey: sdmKeys.kedisiplinan,
		queryFn: () => sdmGet<Kedisiplinan[]>("/kedisiplinan"),
	});
}

export function useFungsional() {
	return useQuery({
		queryKey: sdmKeys.fungsional,
		queryFn: () => sdmGet<MasterItem[]>("/fungsional"),
	});
}

export function useTugasTambahan() {
	return useQuery({
		queryKey: sdmKeys.tugasTambahan,
		queryFn: () => sdmGet<MasterItem[]>("/tugas-tambahan"),
	});
}

export function usePenanggungJawab() {
	return useQuery({
		queryKey: sdmKeys.penanggungJawab,
		queryFn: () => sdmGet<MasterItem[]>("/penanggung-jawab"),
	});
}

export function useLainlain() {
	return useQuery({
		queryKey: sdmKeys.lainlain,
		queryFn: () => sdmGet<MasterItem[]>("/lainlain"),
	});
}

// Generic mutation builder untuk master CRUD (golongan & kedisiplinan punya
// bentuk khusus; sisanya berbentuk {nama, nilai}).
function useMasterMutation<TVars, TRes>(
	path: string,
	queryKey: readonly unknown[],
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			method,
			id,
			body,
		}: {
			method: "POST" | "PUT" | "DELETE";
			id?: number;
			body?: TVars;
		}) => sdmSend<TRes>(method, id ? `${path}/${id}` : path, body),
		onSuccess: () => qc.invalidateQueries({ queryKey }),
	});
}

export function useSaveGolongan() {
	return useMasterMutation<GolonganInput, Golongan>(
		"/golongan",
		sdmKeys.golongan,
	);
}

export function useSaveKehadiran() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { nilai_per_hari: number }) =>
			sdmSend<Kehadiran>("PUT", "/kehadiran", body),
		onSuccess: () => qc.invalidateQueries({ queryKey: sdmKeys.kehadiran }),
	});
}

export function useSaveKedisiplinan() {
	return useMasterMutation<KedisiplinanInput, Kedisiplinan>(
		"/kedisiplinan",
		sdmKeys.kedisiplinan,
	);
}

export function useSaveMasterItem(path: string, queryKey: readonly unknown[]) {
	return useMasterMutation<MasterItemInput, MasterItem>(path, queryKey);
}

// ── Employee hooks ──

export function useEmployees(search = "", activeOnly = false) {
	return useQuery({
		queryKey: sdmKeys.employees(search, activeOnly),
		queryFn: () =>
			sdmGet<Employee[]>("/employees", {
				search: search || undefined,
				active: activeOnly || undefined,
			}),
	});
}

export function useEmployee(id?: number) {
	return useQuery({
		queryKey: sdmKeys.employee(id ?? 0),
		queryFn: () => sdmGet<EmployeeDetail>(`/employees/${id}`),
		enabled: !!id,
	});
}

function invalidateEmployees(qc: ReturnType<typeof useQueryClient>) {
	qc.invalidateQueries({ queryKey: ["sdm", "employees"] });
	qc.invalidateQueries({ queryKey: sdmKeys.all });
}

export function useSaveEmployee() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id?: number; body: EmployeeInput }) =>
			id
				? sdmSend<Employee>("PUT", `/employees/${id}`, body)
				: sdmSend<Employee>("POST", "/employees", body),
		onSuccess: () => invalidateEmployees(qc),
	});
}

export function useDeleteEmployee() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: number) => sdmSend<null>("DELETE", `/employees/${id}`),
		onSuccess: () => invalidateEmployees(qc),
	});
}

// ── Lampiran HR per karyawan ──

export function useAttachHR(employeeId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			type,
			body,
		}: {
			type: "fungsional" | "tugas_tambahan" | "penanggung_jawab" | "lainlain";
			body: Record<string, unknown>;
		}) => sdmSend<null>("POST", `/employees/${employeeId}/${type}`, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: sdmKeys.employeeHR(employeeId) });
			qc.invalidateQueries({ queryKey: sdmKeys.employee(employeeId) });
		},
	});
}

export function useDetachHR(employeeId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ type, detailId }: { type: string; detailId: number }) =>
			sdmSend<null>("DELETE", `/employees/${employeeId}/${type}/${detailId}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: sdmKeys.employeeHR(employeeId) });
			qc.invalidateQueries({ queryKey: sdmKeys.employee(employeeId) });
		},
	});
}

// ── Absen ──

export function useAbsen(periode: string) {
	return useQuery({
		queryKey: sdmKeys.absen(periode),
		queryFn: () => sdmGet<AbsenRow[]>("/absen", { periode }),
		enabled: !!periode,
	});
}

export function useSaveAbsen() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			periode,
			items,
		}: {
			periode: string;
			items: AbsenEntry[];
		}) => sdmSend<null>("PUT", "/absen", { periode, items }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sdm", "absen"] }),
	});
}

export function useDeleteAbsen() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (periode: string) =>
			sdmSend<null>("DELETE", `/absen?periode=${periode}`),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sdm", "absen"] }),
	});
}

// ── Pinjaman ──

export function usePinjaman(status = "") {
	return useQuery({
		queryKey: sdmKeys.pinjaman(status),
		queryFn: () =>
			sdmGet<Pinjaman[]>("/pinjaman", status ? { status } : undefined),
	});
}

export function usePinjamanDetail(id?: number) {
	return useQuery({
		queryKey: sdmKeys.pinjamanDetail(id ?? 0),
		queryFn: () => sdmGet<PinjamanDetail>(`/pinjaman/${id}`),
		enabled: !!id,
	});
}

export function useCreatePinjaman() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { employee_id: number; jumlah: number }) =>
			sdmSend<Pinjaman>("POST", "/pinjaman", body),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sdm", "pinjaman"] }),
	});
}

export function usePayAngsuran(id: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { periode: string; angsuran: number }) =>
			sdmSend<Pinjaman>("POST", `/pinjaman/${id}/angsuran`, body),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sdm", "pinjaman"] });
			qc.invalidateQueries({ queryKey: sdmKeys.pinjamanDetail(id) });
		},
	});
}

// ── Penggajian ──

export function useSlip(periode: string, employeeId?: number) {
	return useQuery({
		queryKey: sdmKeys.slip(periode, employeeId ?? 0),
		queryFn: () => sdmGet<Slip>(`/penggajian/${employeeId}`, { periode }),
		enabled: !!periode && !!employeeId,
	});
}

export function usePenggajian(periode: string) {
	return useQuery({
		queryKey: sdmKeys.penggajian(periode),
		queryFn: () => sdmGet<PayrollStatus>("/penggajian", { periode }),
		enabled: !!periode,
	});
}

function invalidatePayroll(
	qc: ReturnType<typeof useQueryClient>,
	periode: string,
) {
	qc.invalidateQueries({ queryKey: sdmKeys.penggajian(periode) });
	qc.invalidateQueries({ queryKey: sdmKeys.slip(periode, 0) });
	qc.invalidateQueries({ queryKey: ["sdm", "summary"] });
	qc.invalidateQueries({ queryKey: ["sdm", "rekap"] });
}

export function useFinalizePayroll() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (periode: string) =>
			sdmSend<PayrollStatus>("POST", "/penggajian/finalize", { periode }),
		onSuccess: (_d, periode) => invalidatePayroll(qc, periode),
	});
}

export function useUnlockPayroll() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (periode: string) =>
			sdmSend<null>("POST", "/penggajian/unlock", { periode }),
		onSuccess: (_d, periode) => invalidatePayroll(qc, periode),
	});
}

export function useRekap(academicYearId?: number) {
	return useQuery({
		queryKey: ["sdm", "rekap", academicYearId],
		queryFn: () =>
			sdmGet<RekapResponse>("/rekap", { academic_year_id: academicYearId }),
		enabled: !!academicYearId,
	});
}

export function useSummary(academicYearId?: number) {
	return useQuery({
		queryKey: sdmKeys.summary(academicYearId ? String(academicYearId) : ""),
		queryFn: () =>
			sdmGet<Summary>("/summary", {
				...(academicYearId ? { academic_year_id: academicYearId } : {}),
			}),
	});
}

// ── Utils periode ──

export function formatPeriode(periode: string): string {
	// Terima "YYYY-MM" atau "YYYY-MM-05"; tampil "Mei 2026 · payday 5".
	const m = periode.match(/^(\d{4})-(\d{2})/);
	if (!m) return periode;
	const name = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
		new Date(Number(m[1]), Number(m[2]) - 1, 1),
	);
	return `${name} ${m[1]}`;
}

export function formatPeriodePayday(periode: string): string {
	return `${formatPeriode(periode)} · payday 5`;
}

export function currentPeriode(): string {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Helper Tahun Ajaran → bulan ──

const MONTH_ID = [
	"Januari",
	"Februari",
	"Maret",
	"April",
	"Mei",
	"Juni",
	"Juli",
	"Agustus",
	"September",
	"Oktober",
	"November",
	"Desember",
];

// MonthOption — pilihan bulan dalam rentang Tahun Ajaran (payday = 5).
export interface MonthOption {
	value: string; // YYYY-MM
	label: string; // "Agustus 2025"
	periode: string; // YYYY-MM-05
}

// monthsInAcademicYear mengembalikan bulan-bulan yang payday-nya (tanggal 5)
// berada dalam rentang [start_date, end_date] tahun ajaran.
export function monthsInAcademicYear(ay: {
	start_date: string;
	end_date: string;
}): MonthOption[] {
	const start = new Date(ay.start_date);
	const end = new Date(ay.end_date);
	const out: MonthOption[] = [];
	const cur = new Date(start.getFullYear(), start.getMonth(), 1);
	while (cur <= end) {
		const payday = new Date(cur.getFullYear(), cur.getMonth(), 5);
		if (payday >= start && payday <= end) {
			const year = cur.getFullYear();
			const mm = String(cur.getMonth() + 1).padStart(2, "0");
			out.push({
				value: `${year}-${mm}`,
				label: `${MONTH_ID[cur.getMonth()]} ${year}`,
				periode: `${year}-${mm}-05`,
			});
		}
		cur.setMonth(cur.getMonth() + 1);
	}
	return out;
}
