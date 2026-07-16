import { atom } from "jotai";

// Data Tahun Ajaran Minimal
export interface AcademicYear {
	id: number;
	name: string;
	is_active: boolean;
	start_date: string;
}

// Atom untuk menyimpan Tahun Ajaran yang sedang dipilih
// Nilai default akan diset null sampai data diload pertama kali dari API
export const academicYearAtom = atom<AcademicYear | null>(null);
