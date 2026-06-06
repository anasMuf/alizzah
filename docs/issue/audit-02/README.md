# Audit 02 — Audit Frontend Dashboard

**Tanggal:** 2025-07-12
**Lingkup:** `apps/dashboard/src/` — seluruh layer (routes, features, components, api, utils, store)
**Stack:** React 19 + TanStack Router + TanStack Query + Orval + Jotai + Tailwind

## Ringkasan Temuan

| Severity | Jumlah | Area Terdampak |
|----------|--------|----------------|
| 🟡 Menengah | 5 | Type safety, Auth, Security, Network, Form validation |
| 🟢 Rendah | 6 | UX, Code quality, Perf |

## Daftar Issue

### 🟡 Menengah

| ID | Issue | Area | Dampak |
|----|-------|------|--------|
| [A02-M01](audit-02-m01-type-any-masif.md) | TypeScript `any` casting masif di response API | Semua page | Zero type safety, rentan typo runtime error |
| [A02-M02](audit-02-m02-auth-useeffect-loop.md) | AuthContext `useEffect` dependency loop risk | `features/auth/AuthContext.tsx` | Potensi infinite re-render |
| [A02-M03](audit-02-m03-token-localstorage-xss.md) | JWT token di localStorage — XSS risk | `AuthContext.tsx`, `custom-instance.ts` | Token bisa dicuri via XSS |
| [A02-M04](audit-02-m04-no-retry-offline.md) | Tidak ada retry / offline handling | `api/mutator/custom-instance.ts` | Request gagal tanpa recovery |
| [A02-M05](audit-02-m05-no-form-validation-lib.md) | Tidak ada form validation library | Semua halaman form | Validasi inkonsisten, input invalid lolos |

### 🟢 Rendah

| ID | Issue | Area |
|----|-------|------|
| [A02-L01](audit-02-l01-academicyear-null-loading.md) | `academicYearAtom` null → request gagal di page load pertama | Semua page |
| [A02-L02](audit-02-l02-loading-spinner-inconsistency.md) | Loading spinner tidak konsisten | `_authenticated.tsx`, list pages |
| [A02-L03](audit-02-l03-no-error-boundary.md) | Tidak ada ErrorBoundary | App root |
| [A02-L04](audit-02-l04-large-page-file.md) | File page terlalu besar (550+ baris) | `pembayaran/baru.tsx` |
| [A02-L05](audit-02-l05-n-plus-1-invoice-detail.md) | `useQueries` N+1 untuk invoice detail | `pembayaran/baru.tsx` |
| [A02-L06](audit-02-l06-dead-register-link.md) | Link register tidak ada fungsinya | `login.tsx` |

## Prioritas Perbaikan

1. **Minggu ini:** M01 — Type safety `any` → typed (mencegah runtime error)
2. **Minggu ini:** M02 — AuthContext loop fix
3. **Sprint ini:** M04 — Retry handling
4. **Sprint ini:** M03 — Token security (httpOnly cookie)
5. **Backlog:** M05, L01-L06
