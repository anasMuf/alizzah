// Package platform adalah tempat infrastruktur lintas-modul (config, database,
// middleware, helper HTTP/validator) saat struktur lama dimigrasikan ke layout
// modular. Saat ini infra tersebut masih berada di paket lama (config/,
// middleware/, utility/); paket ini menandai tujuan migrasi Fase 2.
//
// Lihat docs/architecture/adr-001-modular-structure.md.
package platform
