// @alizzah/auth — sesi & otentikasi bersama (JWT) untuk seluruh app Alizzah.
// Menyediakan AuthProvider, useAuth, dan helper token (getToken/hasToken/...).
// Saat dimuat, mendaftarkan token getter ke @alizzah/api-client (memutus siklus).
// Lihat docs/architecture/adr-001-modular-structure.md.
export * from "./AuthContext";
