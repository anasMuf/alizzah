# Coding Standards & Best Practices
# Sistem Keuangan Sekolah PAUD Unggulan Alizzah

> **Versi:** 1.0  
> **Tanggal:** 29 Januari 2026
> **Fokus:** High Quality Code, Maintainability, Graceful Error Handling

---

## 📋 Daftar Isi
1. [Prinsip Utama](#1-prinsip-utama)
2. [TypeScript Guidelines](#2-typescript-guidelines)
3. [Backend: Architecture & Error Handling](#3-backend-architecture--error-handling)
4. [Frontend: UI/UX & Graceful Degredation](#4-frontend-uiux--graceful-degredation)
5. [Naming Conventions](#5-naming-conventions)
6. [Git & Commit Standards](#6-git--commit-standards)

---

## 1. Prinsip Utama

### 1.1 SOLID & Clean Code
- **Single Responsibility Principle (SRP):** Satu fungsi/class hanya melakukan satu hal.
  - *Bad:* Fungsi `createInvoice` yang juga melakukan validasi user, send email, dan update stok.
  - *Good:* `InvoiceService.create` memanggil `EmailService.send` dan `InventoryService.update`.
- **DRY (Don't Repeat Yourself):** Jika logic yang sama muncul 2x, buat fungsi helper.
- **KISS (Keep It Simple, Stupid):** Pilih solusi yang paling mudah dipahami orang lain (dan diri sendiri di masa depan).

### 1.2 Type Safety First
- Aplikasi ini menggunakan **End-to-End Type Safety** (Hono RPC -> TanStack Query).
- **Haram hukumnya** menggunakan `any`. Jika mentok, gunakan `unknown` dan lakukan narrowing.
- Selalu define return type untuk fungsi publik/service.

---

## 2. TypeScript Guidelines

### 2.1 Explicit Types
Selalu definisikan tipe input dan output, terutama di Service Layer.

```typescript
// ✅ GOOD
async function getSiswaById(id: string): Promise<Siswa | null> {
  // ...
}

// ❌ BAD
async function getSiswaById(id) {
  // ...
}
```

### 2.2 Zod for Validation
Gunakan Zod untuk validasi runtime (terutama input API). Type TypeScript hilang saat compile, Zod tetap hidup saat runtime.

```typescript
export const createSiswaSchema = z.object({
  nama: z.string().min(3, "Nama minimal 3 karakter"),
  nis: z.string().regex(/^\d+$/, "NIS harus angka"),
});

// Infer type dari schema
export type CreateSiswaDTO = z.infer<typeof createSiswaSchema>;
```

---

## 3. Backend: Architecture & Error Handling

### 3.1 Graceful Error Handling Pattern
Kita menghindari `try-catch` yang berantakan di setiap controller. Gunakan **Centralized Error Handling** middleware.

**1. Custom AppError Class**
Gunakan class `AppError` untuk melempar error yang "diketahui" (expected).

```typescript
// lib/error.ts
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Error yang kita antisipasi (validation, logic)
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**2. Throwing Errors in Service**
Service *hanya* melempar error, tidak mengembalikan response HTTP.

```typescript
// modules/siswa/siswa.service.ts
class SiswaService {
  async update(id: string, data: UpdateSiswaDTO) {
    const exists = await prisma.siswa.findUnique({ where: { id } });
    if (!exists) {
      // 🚀 Throw AppError, jangan return { error: ... }
      throw new AppError("Siswa tidak ditemukan", 404);
    }
    return prisma.siswa.update({ ... });
  }
}
```

**3. Global Error Middleware (Hono)**
Middleware ini menangkap semua error dan format menjadi response standar JSON.

```typescript
// app.ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.statusCode,
        message: err.message,
      }
    }, err.statusCode as any);
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: {
        code: 400,
        message: "Validasi gagal",
        details: err.errors
      }
    }, 400);
  }

  // Unhandled/Internal Server Error
  console.error("🔥 SYSTEM ERROR:", err);
  return c.json({
    success: false,
    error: {
      code: 500,
      message: "Terjadi kesalahan internal server"
    }
  }, 500);
});
```

### 3.2 Response Structure Standard
Semua response API harus konsisten mengikuti format:

```typescript
// SUKSES
{
  "success": true,
  "data": { ... } // object atau array
}

// SUKSES DENGAN PAGINATION
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}

// ERROR
{
  "success": false,
  "error": {
    "code": 404,
    "message": "Resource not found",
    "details": [] // optional field validation details
  }
}
```

---

## 4. Frontend: UI/UX & Graceful Degredation

### 4.1 "Graceful" UI States
Antarmuka tidak boleh blank atau crash putih (WSOD). Harus handle 4 state dasar:

1.  **Loading:** Tampilkan Skeleton, bukan spinner blocking (jika memungkinkan).
2.  **Empty:** Jika data kosong (length 0), tampilkan ilustrasi/pesan "Belum ada data", bukan tabel kosong.
3.  **Error:** Tampilkan pesan error user-friendly dengan tombol "Coba Lagi".
4.  **Success:** Tampilkan konten.

```tsx
// ✅ GOOD EXAMPLE
if (isLoading) return <TableSkeleton columns={5} />;
if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
if (data.length === 0) return <EmptyState title="Belum ada tagihan" />;

return <DataTable data={data} />;
```

### 4.2 Error Boundaries
Bungkus bagian-bagian penting (atau seluruh page) dengan Error Boundary agar jika satu komponen crash, seluruh app tidak mati.

### 4.3 Optimistic Updates (TanStack Query)
Untuk UX yang *snappy*, gunakan Optimistic Update (update UI dulu sebelum server merespon) pada aksi kecil seperti "Mark as Paid" atau "Toggle Active".

### 4.4 Form Handling
- Gunakan `react-hook-form` + `zodResolver`.
- Validasi instan di client side (UX), tapi tetap validasi di server (Security).
- Tampilkan error tepat di bawah field yang salah.

### 4.5 Premium Aesthetic Standards
Pengguna harus merasa bangga menggunakan aplikasi ini. Ikuti standar visual ini:
1.  **Rich Colors & Shadow:** Hindari warna flat default. Gunakan palette modern (misal: Indigo-Blue dengan shadow soft berbayang warna biru).
2.  **Typography:** Gunakan font 'Plus Jakarta Sans' atau 'Inter' dengan weighting yang kontras untuk hierarki informasi.
3.  **Micro-animations:** Selalu tambahkan interaksi halus dengan `framer-motion` (misal: hover scale 1.05, fade-in slide-up untuk modal/dialog).
4.  **Glassmorphism & Blurs:** Gunakan `backdrop-blur` pada overlay (sidebar mobile, modal backdrop) untuk kesan modern dan premium.
5.  **Rounded Everything:** Gunakan `rounded-xl` (12px) atau `rounded-2xl` (16px) sebagai standar border radius.

---

## 5. Naming Conventions

### 5.1 Files & Folders
- **Folders:** `kebab-case` (e.g., `components/ui`, `modules/data-siswa`)
- **Files:** matches export default
  - React Component: `PascalCase.tsx` (e.g., `Button.tsx`, `SiswaList.tsx`)
  - Hook: `camelCase.ts` (e.g., `useSiswa.ts`)
  - Utilities: `kebab-case.ts` (e.g., `currency-formatter.ts`)

### 5.2 Variables & Functions
- **Variables/Functions:** `camelCase` (e.g., `const totalBayar`, `function calculateTotal()`)
- **Boolean:** Prefix `is`, `has`, `should` (e.g., `isActive`, `hasPaid`, `shouldRedirect`)
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT = 3`)

### 5.3 Database (Prisma/Postgres)
- **Table Name:** `snake_case` singular/plural consistency (di project ini kita pakai `snake_case` lowercase untuk table database mapping).
- **Column Name:** `snake_case` di DB, tapi di Prisma model gunakan `camelCase` dengan `@map`.

```prisma
// ✅ GOOD
model Siswa {
  namaLengkap String @map("nama_lengkap")
  @@map("siswa")
}
```

---

## 6. Git & Commit Standards

### 6.1 Conventional Commits
Format pesan commit: `<type>(<scope>): <description>`

- `feat`: Fitur baru
- `fix`: Perbaikan bug
- `docs`: Dokumentasi
- `refactor`: Perubahan code tanpa mengubah fitur
- `chore`: Update deps, konfigurasi build

**Contoh:**
- `feat(tagihan): add logic for partial payment`
- `fix(auth): resolve logout session bug`
- `docs(api): update swagger documentation`

### 6.2 Branching Strategy
- `main`: Production ready code.
- `dev`: Development branch.
- `feature/nama-fitur`: Untuk pengembangan fitur baru.
