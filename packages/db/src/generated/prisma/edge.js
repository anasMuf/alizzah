
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/edge.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TahunAjaranScalarFieldEnum = {
  id: 'id',
  nama: 'nama',
  tanggalMulai: 'tanggalMulai',
  tanggalSelesai: 'tanggalSelesai',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JenjangScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  nama: 'nama',
  kelompok: 'kelompok',
  urutan: 'urutan',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RombelScalarFieldEnum = {
  id: 'id',
  jenjangId: 'jenjangId',
  tahunAjaranId: 'tahunAjaranId',
  nama: 'nama',
  waliKelas: 'waliKelas',
  kapasitas: 'kapasitas',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiswaScalarFieldEnum = {
  id: 'id',
  nis: 'nis',
  namaLengkap: 'namaLengkap',
  jenisKelamin: 'jenisKelamin',
  tempatLahir: 'tempatLahir',
  tanggalLahir: 'tanggalLahir',
  alamat: 'alamat',
  namaOrtu: 'namaOrtu',
  noHpOrtu: 'noHpOrtu',
  emailOrtu: 'emailOrtu',
  rombelId: 'rombelId',
  status: 'status',
  tanggalMasuk: 'tanggalMasuk',
  foto: 'foto',
  ikutDaycare: 'ikutDaycare',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JenisPembayaranScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  nama: 'nama',
  kategori: 'kategori',
  tipe: 'tipe',
  nominalDefault: 'nominalDefault',
  jenjangIds: 'jenjangIds',
  sifat: 'sifat',
  jatuhTempoHari: 'jatuhTempoHari',
  keterangan: 'keterangan',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JenisPembayaranTarifScalarFieldEnum = {
  id: 'id',
  jenisPembayaranId: 'jenisPembayaranId',
  tahunAjaranId: 'tahunAjaranId',
  jenjangId: 'jenjangId',
  jenisKelamin: 'jenisKelamin',
  nominal: 'nominal',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiskonScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  nama: 'nama',
  jenisPembayaranId: 'jenisPembayaranId',
  tipePotongan: 'tipePotongan',
  nilaiPotongan: 'nilaiPotongan',
  keterangan: 'keterangan',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PastaScalarFieldEnum = {
  id: 'id',
  nama: 'nama',
  hari: 'hari',
  jamMulai: 'jamMulai',
  jamSelesai: 'jamSelesai',
  biaya: 'biaya',
  jenjangIds: 'jenjangIds',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BankScalarFieldEnum = {
  id: 'id',
  nama: 'nama',
  nomorRekening: 'nomorRekening',
  atasNama: 'atasNama',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  email: 'email',
  password: 'password',
  namaLengkap: 'namaLengkap',
  role: 'role',
  isAktif: 'isAktif',
  lastLogin: 'lastLogin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SiswaPastaScalarFieldEnum = {
  id: 'id',
  siswaId: 'siswaId',
  pastaId: 'pastaId',
  createdAt: 'createdAt'
};

exports.Prisma.SiswaDiskonScalarFieldEnum = {
  id: 'id',
  siswaId: 'siswaId',
  diskonId: 'diskonId',
  tanggalMulai: 'tanggalMulai',
  tanggalBerakhir: 'tanggalBerakhir',
  catatan: 'catatan',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.TagihanScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  siswaId: 'siswaId',
  periode: 'periode',
  rombelSnapshot: 'rombelSnapshot',
  jenjangSnapshot: 'jenjangSnapshot',
  tanggalTagihan: 'tanggalTagihan',
  jatuhTempo: 'jatuhTempo',
  totalTagihan: 'totalTagihan',
  totalDiskon: 'totalDiskon',
  totalBayar: 'totalBayar',
  sisaTagihan: 'sisaTagihan',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TagihanItemScalarFieldEnum = {
  id: 'id',
  tagihanId: 'tagihanId',
  jenisPembayaranId: 'jenisPembayaranId',
  namaItem: 'namaItem',
  nominalAwal: 'nominalAwal',
  nominalDiskon: 'nominalDiskon',
  nominalAkhir: 'nominalAkhir',
  catatan: 'catatan',
  createdAt: 'createdAt'
};

exports.Prisma.PembayaranScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  siswaId: 'siswaId',
  tanggal: 'tanggal',
  totalBayar: 'totalBayar',
  metode: 'metode',
  bankId: 'bankId',
  buktiTransfer: 'buktiTransfer',
  catatan: 'catatan',
  kasirId: 'kasirId',
  status: 'status',
  voidReason: 'voidReason',
  voidBy: 'voidBy',
  voidAt: 'voidAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PembayaranAlokasiScalarFieldEnum = {
  id: 'id',
  pembayaranId: 'pembayaranId',
  tagihanId: 'tagihanId',
  nominalAlokasi: 'nominalAlokasi',
  createdAt: 'createdAt'
};

exports.Prisma.TabunganScalarFieldEnum = {
  id: 'id',
  siswaId: 'siswaId',
  jenis: 'jenis',
  saldo: 'saldo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransaksiTabunganScalarFieldEnum = {
  id: 'id',
  tabunganId: 'tabunganId',
  tipe: 'tipe',
  nominal: 'nominal',
  potonganAdmin: 'potonganAdmin',
  nominalBersih: 'nominalBersih',
  keterangan: 'keterangan',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.KasScalarFieldEnum = {
  id: 'id',
  tipe: 'tipe',
  nama: 'nama',
  saldo: 'saldo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PosPengeluaranScalarFieldEnum = {
  id: 'id',
  kode: 'kode',
  nama: 'nama',
  prioritasSumberDanaId: 'prioritasSumberDanaId',
  keterangan: 'keterangan',
  isAktif: 'isAktif',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransaksiKasScalarFieldEnum = {
  id: 'id',
  kasId: 'kasId',
  tipeTransaksi: 'tipeTransaksi',
  sumberDanaId: 'sumberDanaId',
  posPengeluaranId: 'posPengeluaranId',
  referensiId: 'referensiId',
  referensiTipe: 'referensiTipe',
  kategori: 'kategori',
  nominal: 'nominal',
  keterangan: 'keterangan',
  bukti: 'bukti',
  transferKeKasId: 'transferKeKasId',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.JenisKelamin = exports.$Enums.JenisKelamin = {
  L: 'L',
  P: 'P'
};

exports.StatusSiswa = exports.$Enums.StatusSiswa = {
  AKTIF: 'AKTIF',
  LULUS: 'LULUS',
  KELUAR: 'KELUAR'
};

exports.KategoriPembayaran = exports.$Enums.KategoriPembayaran = {
  INFAQ_RUTIN: 'INFAQ_RUTIN',
  REGISTRASI: 'REGISTRASI',
  PERLENGKAPAN: 'PERLENGKAPAN',
  DAYCARE: 'DAYCARE'
};

exports.TipePembayaran = exports.$Enums.TipePembayaran = {
  BULANAN: 'BULANAN',
  TAHUNAN: 'TAHUNAN',
  SEKALI: 'SEKALI',
  HARIAN: 'HARIAN',
  INSIDENTIL: 'INSIDENTIL'
};

exports.SifatPembayaran = exports.$Enums.SifatPembayaran = {
  WAJIB: 'WAJIB',
  OPSIONAL: 'OPSIONAL'
};

exports.TipePotongan = exports.$Enums.TipePotongan = {
  PERSENTASE: 'PERSENTASE',
  NOMINAL: 'NOMINAL'
};

exports.Hari = exports.$Enums.Hari = {
  SENIN: 'SENIN',
  SELASA: 'SELASA',
  RABU: 'RABU',
  KAMIS: 'KAMIS',
  JUMAT: 'JUMAT',
  SABTU: 'SABTU'
};

exports.UserRole = exports.$Enums.UserRole = {
  ADMIN: 'ADMIN',
  KEPALA_SEKOLAH: 'KEPALA_SEKOLAH',
  BENDAHARA_YAYASAN: 'BENDAHARA_YAYASAN'
};

exports.StatusTagihan = exports.$Enums.StatusTagihan = {
  DRAFT: 'DRAFT',
  UNPAID: 'UNPAID',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
};

exports.MetodePembayaran = exports.$Enums.MetodePembayaran = {
  TUNAI: 'TUNAI',
  TRANSFER: 'TRANSFER'
};

exports.StatusPembayaran = exports.$Enums.StatusPembayaran = {
  AKTIF: 'AKTIF',
  VOID: 'VOID'
};

exports.JenisTabungan = exports.$Enums.JenisTabungan = {
  WAJIB_BERLIAN: 'WAJIB_BERLIAN',
  UMUM: 'UMUM'
};

exports.TipeTransaksiTabungan = exports.$Enums.TipeTransaksiTabungan = {
  SETOR: 'SETOR',
  TARIK: 'TARIK'
};

exports.TipeKas = exports.$Enums.TipeKas = {
  KAS: 'KAS',
  BERANGKAS: 'BERANGKAS'
};

exports.TipeTransaksiKas = exports.$Enums.TipeTransaksiKas = {
  MASUK: 'MASUK',
  KELUAR: 'KELUAR',
  TRANSFER: 'TRANSFER'
};

exports.Prisma.ModelName = {
  TahunAjaran: 'TahunAjaran',
  Jenjang: 'Jenjang',
  Rombel: 'Rombel',
  Siswa: 'Siswa',
  JenisPembayaran: 'JenisPembayaran',
  JenisPembayaranTarif: 'JenisPembayaranTarif',
  Diskon: 'Diskon',
  Pasta: 'Pasta',
  Bank: 'Bank',
  User: 'User',
  SiswaPasta: 'SiswaPasta',
  SiswaDiskon: 'SiswaDiskon',
  Tagihan: 'Tagihan',
  TagihanItem: 'TagihanItem',
  Pembayaran: 'Pembayaran',
  PembayaranAlokasi: 'PembayaranAlokasi',
  Tabungan: 'Tabungan',
  TransaksiTabungan: 'TransaksiTabungan',
  Kas: 'Kas',
  PosPengeluaran: 'PosPengeluaran',
  TransaksiKas: 'TransaksiKas'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/Users/anasmufti/Projects/Web/alizzah/app/packages/db/src/generated/prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "darwin-arm64",
        "native": true
      }
    ],
    "previewFeatures": [],
    "sourceFilePath": "/Users/anasmufti/Projects/Web/alizzah/app/packages/db/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null,
    "schemaEnvPath": "../../../.env"
  },
  "relativePath": "../../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// packages/db/prisma/schema.prisma\n\ngenerator client {\n  provider = \"prisma-client-js\"\n  output   = \"../src/generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\n// ==================== ENUMS ====================\n\nenum JenisKelamin {\n  L\n  P\n}\n\nenum StatusSiswa {\n  AKTIF\n  LULUS\n  KELUAR\n}\n\nenum KategoriPembayaran {\n  INFAQ_RUTIN\n  REGISTRASI\n  PERLENGKAPAN\n  DAYCARE\n}\n\nenum TipePembayaran {\n  BULANAN\n  TAHUNAN\n  SEKALI\n  HARIAN\n  INSIDENTIL\n}\n\nenum SifatPembayaran {\n  WAJIB\n  OPSIONAL\n}\n\nenum TipePotongan {\n  PERSENTASE\n  NOMINAL\n}\n\nenum Hari {\n  SENIN\n  SELASA\n  RABU\n  KAMIS\n  JUMAT\n  SABTU\n}\n\nenum UserRole {\n  ADMIN\n  KEPALA_SEKOLAH\n  BENDAHARA_YAYASAN\n}\n\nenum StatusTagihan {\n  DRAFT\n  UNPAID\n  DUE\n  OVERDUE\n  PARTIAL\n  PAID\n  CANCELLED\n}\n\nenum MetodePembayaran {\n  TUNAI\n  TRANSFER\n}\n\nenum StatusPembayaran {\n  AKTIF\n  VOID\n}\n\nenum JenisTabungan {\n  WAJIB_BERLIAN\n  UMUM\n}\n\nenum TipeTransaksiTabungan {\n  SETOR\n  TARIK\n}\n\nenum TipeKas {\n  KAS\n  BERANGKAS\n}\n\nenum TipeTransaksiKas {\n  MASUK\n  KELUAR\n  TRANSFER\n}\n\n// ==================== MODELS ====================\n\nmodel TahunAjaran {\n  id             String   @id @default(uuid())\n  nama           String   @unique @db.VarChar(20)\n  tanggalMulai   DateTime @map(\"tanggal_mulai\") @db.Date\n  tanggalSelesai DateTime @map(\"tanggal_selesai\") @db.Date\n  isAktif        Boolean  @default(false) @map(\"is_aktif\")\n  createdAt      DateTime @default(now()) @map(\"created_at\")\n  updatedAt      DateTime @updatedAt @map(\"updated_at\")\n\n  rombels Rombel[]\n  tarifs  JenisPembayaranTarif[]\n\n  @@map(\"tahun_ajaran\")\n}\n\nmodel Jenjang {\n  id        String   @id @default(uuid())\n  kode      String   @unique @db.VarChar(10)\n  nama      String   @db.VarChar(50)\n  kelompok  String   @db.VarChar(20)\n  urutan    Int\n  createdAt DateTime @default(now()) @map(\"created_at\")\n  updatedAt DateTime @updatedAt @map(\"updated_at\")\n\n  rombels Rombel[]\n  tarifs  JenisPembayaranTarif[]\n\n  @@map(\"jenjang\")\n}\n\nmodel Rombel {\n  id            String   @id @default(uuid())\n  jenjangId     String   @map(\"jenjang_id\")\n  tahunAjaranId String   @map(\"tahun_ajaran_id\")\n  nama          String   @db.VarChar(30)\n  waliKelas     String?  @map(\"wali_kelas\") @db.VarChar(100)\n  kapasitas     Int      @default(25)\n  createdAt     DateTime @default(now()) @map(\"created_at\")\n  updatedAt     DateTime @updatedAt @map(\"updated_at\")\n\n  jenjang     Jenjang     @relation(fields: [jenjangId], references: [id])\n  tahunAjaran TahunAjaran @relation(fields: [tahunAjaranId], references: [id])\n  siswas      Siswa[]\n\n  @@unique([jenjangId, tahunAjaranId, nama])\n  @@map(\"rombel\")\n}\n\nmodel Siswa {\n  id           String       @id @default(uuid())\n  nis          String       @unique @db.VarChar(20)\n  namaLengkap  String       @map(\"nama_lengkap\") @db.VarChar(100)\n  jenisKelamin JenisKelamin @map(\"jenis_kelamin\")\n  tempatLahir  String?      @map(\"tempat_lahir\") @db.VarChar(50)\n  tanggalLahir DateTime?    @map(\"tanggal_lahir\") @db.Date\n  alamat       String?      @db.Text\n  namaOrtu     String       @map(\"nama_ortu\") @db.VarChar(100)\n  noHpOrtu     String       @map(\"no_hp_ortu\") @db.VarChar(20)\n  emailOrtu    String?      @map(\"email_ortu\") @db.VarChar(100)\n  rombelId     String       @map(\"rombel_id\")\n  status       StatusSiswa  @default(AKTIF)\n  tanggalMasuk DateTime     @map(\"tanggal_masuk\") @db.Date\n  foto         String?      @db.VarChar(255)\n  ikutDaycare  Boolean      @default(false) @map(\"ikut_daycare\")\n  createdAt    DateTime     @default(now()) @map(\"created_at\")\n  updatedAt    DateTime     @updatedAt @map(\"updated_at\")\n\n  rombel       Rombel        @relation(fields: [rombelId], references: [id])\n  siswaPastas  SiswaPasta[]\n  siswaDiskons SiswaDiskon[]\n  tagihans     Tagihan[]\n  pembayarans  Pembayaran[]\n  tabungans    Tabungan[]\n\n  @@map(\"siswa\")\n}\n\nmodel JenisPembayaran {\n  id             String             @id @default(uuid())\n  kode           String             @unique @db.VarChar(20)\n  nama           String             @db.VarChar(100)\n  kategori       KategoriPembayaran\n  tipe           TipePembayaran\n  nominalDefault Decimal            @map(\"nominal_default\") @db.Decimal(12, 2)\n  jenjangIds     String[]           @map(\"jenjang_ids\")\n  sifat          SifatPembayaran\n  jatuhTempoHari Int                @default(1) @map(\"jatuh_tempo_hari\")\n  keterangan     String?            @db.Text\n  isAktif        Boolean            @default(true) @map(\"is_aktif\")\n  createdAt      DateTime           @default(now()) @map(\"created_at\")\n  updatedAt      DateTime           @updatedAt @map(\"updated_at\")\n\n  tarifs          JenisPembayaranTarif[]\n  diskons         Diskon[]\n  tagihanItems    TagihanItem[]\n  transaksis      TransaksiKas[]\n  posPengeluarans PosPengeluaran[]\n\n  @@map(\"jenis_pembayaran\")\n}\n\nmodel JenisPembayaranTarif {\n  id                String        @id @default(uuid())\n  jenisPembayaranId String        @map(\"jenis_pembayaran_id\")\n  tahunAjaranId     String        @map(\"tahun_ajaran_id\")\n  jenjangId         String?       @map(\"jenjang_id\")\n  jenisKelamin      JenisKelamin? @map(\"jenis_kelamin\")\n  nominal           Decimal       @db.Decimal(12, 2)\n  createdAt         DateTime      @default(now()) @map(\"created_at\")\n  updatedAt         DateTime      @updatedAt @map(\"updated_at\")\n\n  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])\n  tahunAjaran     TahunAjaran     @relation(fields: [tahunAjaranId], references: [id])\n  jenjang         Jenjang?        @relation(fields: [jenjangId], references: [id])\n\n  @@unique([jenisPembayaranId, tahunAjaranId, jenjangId, jenisKelamin])\n  @@map(\"jenis_pembayaran_tarif\")\n}\n\nmodel Diskon {\n  id                String       @id @default(uuid())\n  kode              String       @unique @db.VarChar(20)\n  nama              String       @db.VarChar(100)\n  jenisPembayaranId String       @map(\"jenis_pembayaran_id\")\n  tipePotongan      TipePotongan @map(\"tipe_potongan\")\n  nilaiPotongan     Decimal      @map(\"nilai_potongan\") @db.Decimal(12, 2)\n  keterangan        String?      @db.Text\n  isAktif           Boolean      @default(true) @map(\"is_aktif\")\n  createdAt         DateTime     @default(now()) @map(\"created_at\")\n  updatedAt         DateTime     @updatedAt @map(\"updated_at\")\n\n  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])\n  siswaDiskons    SiswaDiskon[]\n\n  @@map(\"diskon\")\n}\n\nmodel Pasta {\n  id         String   @id @default(uuid())\n  nama       String   @db.VarChar(50)\n  hari       Hari\n  jamMulai   DateTime @map(\"jam_mulai\") @db.Time\n  jamSelesai DateTime @map(\"jam_selesai\") @db.Time\n  biaya      Decimal  @db.Decimal(12, 2)\n  jenjangIds String[] @map(\"jenjang_ids\")\n  isAktif    Boolean  @default(true) @map(\"is_aktif\")\n  createdAt  DateTime @default(now()) @map(\"created_at\")\n  updatedAt  DateTime @updatedAt @map(\"updated_at\")\n\n  siswaPastas SiswaPasta[]\n\n  @@map(\"pasta\")\n}\n\nmodel Bank {\n  id            String   @id @default(uuid())\n  nama          String   @db.VarChar(50)\n  nomorRekening String   @map(\"nomor_rekening\") @db.VarChar(30)\n  atasNama      String   @map(\"atas_nama\") @db.VarChar(100)\n  isAktif       Boolean  @default(true) @map(\"is_aktif\")\n  createdAt     DateTime @default(now()) @map(\"created_at\")\n  updatedAt     DateTime @updatedAt @map(\"updated_at\")\n\n  pembayarans Pembayaran[]\n\n  @@map(\"bank\")\n}\n\nmodel User {\n  id          String    @id @default(uuid())\n  username    String    @unique @db.VarChar(50)\n  email       String?   @unique @db.VarChar(100)\n  password    String    @db.VarChar(255)\n  namaLengkap String    @map(\"nama_lengkap\") @db.VarChar(100)\n  role        UserRole\n  isAktif     Boolean   @default(true) @map(\"is_aktif\")\n  lastLogin   DateTime? @map(\"last_login\")\n  createdAt   DateTime  @default(now()) @map(\"created_at\")\n  updatedAt   DateTime  @updatedAt @map(\"updated_at\")\n\n  siswaDiskonsCreated SiswaDiskon[]       @relation(\"DiskonCreatedBy\")\n  pembayaransAsKasir  Pembayaran[]        @relation(\"PembayaranKasir\")\n  pembayaransVoidedBy Pembayaran[]        @relation(\"PembayaranVoidBy\")\n  transaksiTabungans  TransaksiTabungan[]\n  transaksiKas        TransaksiKas[]\n\n  @@map(\"user\")\n}\n\n// ==================== JUNCTION TABLES ====================\n\nmodel SiswaPasta {\n  id        String   @id @default(uuid())\n  siswaId   String   @map(\"siswa_id\")\n  pastaId   String   @map(\"pasta_id\")\n  createdAt DateTime @default(now()) @map(\"created_at\")\n\n  siswa Siswa @relation(fields: [siswaId], references: [id], onDelete: Cascade)\n  pasta Pasta @relation(fields: [pastaId], references: [id], onDelete: Cascade)\n\n  @@unique([siswaId, pastaId])\n  @@map(\"siswa_pasta\")\n}\n\nmodel SiswaDiskon {\n  id              String    @id @default(uuid())\n  siswaId         String    @map(\"siswa_id\")\n  diskonId        String    @map(\"diskon_id\")\n  tanggalMulai    DateTime  @map(\"tanggal_mulai\") @db.Date\n  tanggalBerakhir DateTime? @map(\"tanggal_berakhir\") @db.Date\n  catatan         String?   @db.Text\n  createdBy       String    @map(\"created_by\")\n  createdAt       DateTime  @default(now()) @map(\"created_at\")\n\n  siswa         Siswa  @relation(fields: [siswaId], references: [id], onDelete: Cascade)\n  diskon        Diskon @relation(fields: [diskonId], references: [id], onDelete: Cascade)\n  createdByUser User   @relation(\"DiskonCreatedBy\", fields: [createdBy], references: [id])\n\n  @@map(\"siswa_diskon\")\n}\n\n// ==================== TAGIHAN & PEMBAYARAN ====================\n\nmodel Tagihan {\n  id              String        @id @default(uuid())\n  kode            String        @unique @db.VarChar(30)\n  siswaId         String        @map(\"siswa_id\")\n  periode         String        @db.VarChar(7) // \"2026-01\"\n  rombelSnapshot  String        @map(\"rombel_snapshot\") @db.VarChar(50)\n  jenjangSnapshot String        @map(\"jenjang_snapshot\") @db.VarChar(30)\n  tanggalTagihan  DateTime      @map(\"tanggal_tagihan\") @db.Date\n  jatuhTempo      DateTime      @map(\"jatuh_tempo\") @db.Date\n  totalTagihan    Decimal       @map(\"total_tagihan\") @db.Decimal(12, 2)\n  totalDiskon     Decimal       @default(0) @map(\"total_diskon\") @db.Decimal(12, 2)\n  totalBayar      Decimal       @default(0) @map(\"total_bayar\") @db.Decimal(12, 2)\n  sisaTagihan     Decimal       @map(\"sisa_tagihan\") @db.Decimal(12, 2)\n  status          StatusTagihan @default(UNPAID)\n  createdAt       DateTime      @default(now()) @map(\"created_at\")\n  updatedAt       DateTime      @updatedAt @map(\"updated_at\")\n\n  siswa              Siswa               @relation(fields: [siswaId], references: [id])\n  tagihanItems       TagihanItem[]\n  pembayaranAlokasis PembayaranAlokasi[]\n\n  @@unique([siswaId, periode])\n  @@map(\"tagihan\")\n}\n\nmodel TagihanItem {\n  id                String   @id @default(uuid())\n  tagihanId         String   @map(\"tagihan_id\")\n  jenisPembayaranId String   @map(\"jenis_pembayaran_id\")\n  namaItem          String   @map(\"nama_item\") @db.VarChar(100)\n  nominalAwal       Decimal  @map(\"nominal_awal\") @db.Decimal(12, 2)\n  nominalDiskon     Decimal  @default(0) @map(\"nominal_diskon\") @db.Decimal(12, 2)\n  nominalAkhir      Decimal  @map(\"nominal_akhir\") @db.Decimal(12, 2)\n  catatan           String?  @db.Text\n  createdAt         DateTime @default(now()) @map(\"created_at\")\n\n  tagihan         Tagihan         @relation(fields: [tagihanId], references: [id], onDelete: Cascade)\n  jenisPembayaran JenisPembayaran @relation(fields: [jenisPembayaranId], references: [id])\n\n  @@map(\"tagihan_item\")\n}\n\nmodel Pembayaran {\n  id            String           @id @default(uuid())\n  kode          String           @unique @db.VarChar(30)\n  siswaId       String           @map(\"siswa_id\")\n  tanggal       DateTime         @default(now())\n  totalBayar    Decimal          @map(\"total_bayar\") @db.Decimal(12, 2)\n  metode        MetodePembayaran\n  bankId        String?          @map(\"bank_id\")\n  buktiTransfer String?          @map(\"bukti_transfer\") @db.VarChar(255)\n  catatan       String?          @db.Text\n  kasirId       String           @map(\"kasir_id\")\n  status        StatusPembayaran @default(AKTIF)\n  voidReason    String?          @map(\"void_reason\") @db.Text\n  voidBy        String?          @map(\"void_by\")\n  voidAt        DateTime?        @map(\"void_at\")\n  createdAt     DateTime         @default(now()) @map(\"created_at\")\n  updatedAt     DateTime         @updatedAt @map(\"updated_at\")\n\n  siswa      Siswa @relation(fields: [siswaId], references: [id])\n  bank       Bank? @relation(fields: [bankId], references: [id])\n  kasir      User  @relation(\"PembayaranKasir\", fields: [kasirId], references: [id])\n  voidByUser User? @relation(\"PembayaranVoidBy\", fields: [voidBy], references: [id])\n\n  pembayaranAlokasis PembayaranAlokasi[]\n\n  @@map(\"pembayaran\")\n}\n\nmodel PembayaranAlokasi {\n  id             String   @id @default(uuid())\n  pembayaranId   String   @map(\"pembayaran_id\")\n  tagihanId      String   @map(\"tagihan_id\")\n  nominalAlokasi Decimal  @map(\"nominal_alokasi\") @db.Decimal(12, 2)\n  createdAt      DateTime @default(now()) @map(\"created_at\")\n\n  pembayaran Pembayaran @relation(fields: [pembayaranId], references: [id], onDelete: Cascade)\n  tagihan    Tagihan    @relation(fields: [tagihanId], references: [id])\n\n  @@map(\"pembayaran_alokasi\")\n}\n\n// ==================== TABUNGAN ====================\n\nmodel Tabungan {\n  id        String        @id @default(uuid())\n  siswaId   String        @map(\"siswa_id\")\n  jenis     JenisTabungan\n  saldo     Decimal       @default(0) @db.Decimal(12, 2)\n  createdAt DateTime      @default(now()) @map(\"created_at\")\n  updatedAt DateTime      @updatedAt @map(\"updated_at\")\n\n  siswa      Siswa               @relation(fields: [siswaId], references: [id])\n  transaksis TransaksiTabungan[]\n\n  @@unique([siswaId, jenis])\n  @@map(\"tabungan\")\n}\n\nmodel TransaksiTabungan {\n  id            String                @id @default(uuid())\n  tabunganId    String                @map(\"tabungan_id\")\n  tipe          TipeTransaksiTabungan\n  nominal       Decimal               @db.Decimal(12, 2)\n  potonganAdmin Decimal               @default(0) @map(\"potongan_admin\") @db.Decimal(12, 2)\n  nominalBersih Decimal               @map(\"nominal_bersih\") @db.Decimal(12, 2)\n  keterangan    String?               @db.Text\n  createdBy     String                @map(\"created_by\")\n  createdAt     DateTime              @default(now()) @map(\"created_at\")\n\n  tabungan      Tabungan @relation(fields: [tabunganId], references: [id])\n  createdByUser User     @relation(fields: [createdBy], references: [id])\n\n  @@map(\"transaksi_tabungan\")\n}\n\n// ==================== KAS & BERANGKAS ====================\n\nmodel Kas {\n  id        String   @id @default(uuid())\n  tipe      TipeKas\n  nama      String   @db.VarChar(50)\n  saldo     Decimal  @default(0) @db.Decimal(15, 2)\n  createdAt DateTime @default(now()) @map(\"created_at\")\n  updatedAt DateTime @updatedAt @map(\"updated_at\")\n\n  transaksis        TransaksiKas[] @relation(\"KasTransaksi\")\n  transfersReceived TransaksiKas[] @relation(\"KasTransferTo\")\n\n  @@map(\"kas\")\n}\n\nmodel PosPengeluaran {\n  id                    String   @id @default(uuid())\n  kode                  String   @unique @db.VarChar(20)\n  nama                  String   @db.VarChar(100)\n  prioritasSumberDanaId String?  @map(\"prioritas_sumber_dana_id\")\n  keterangan            String?  @db.Text\n  isAktif               Boolean  @default(true) @map(\"is_aktif\")\n  createdAt             DateTime @default(now()) @map(\"created_at\")\n  updatedAt             DateTime @updatedAt @map(\"updated_at\")\n\n  prioritasSumberDana JenisPembayaran? @relation(fields: [prioritasSumberDanaId], references: [id])\n  transaksis          TransaksiKas[]\n\n  @@map(\"pos_pengeluaran\")\n}\n\nmodel TransaksiKas {\n  id               String           @id @default(uuid())\n  kasId            String           @map(\"kas_id\")\n  tipeTransaksi    TipeTransaksiKas @map(\"tipe_transaksi\")\n  sumberDanaId     String?          @map(\"sumber_dana_id\") // FK ke JenisPembayaran\n  posPengeluaranId String?          @map(\"pos_pengeluaran_id\") // FK ke PosPengeluaran\n  referensiId      String?          @map(\"referensi_id\")\n  referensiTipe    String?          @map(\"referensi_tipe\") @db.VarChar(50)\n  kategori         String?          @db.VarChar(50)\n  nominal          Decimal          @db.Decimal(12, 2)\n  keterangan       String?          @db.Text\n  bukti            String?          @db.VarChar(255)\n  transferKeKasId  String?          @map(\"transfer_ke_kas_id\")\n  createdBy        String           @map(\"created_by\")\n  createdAt        DateTime         @default(now()) @map(\"created_at\")\n\n  kas            Kas              @relation(\"KasTransaksi\", fields: [kasId], references: [id])\n  transferKeKas  Kas?             @relation(\"KasTransferTo\", fields: [transferKeKasId], references: [id])\n  createdByUser  User             @relation(fields: [createdBy], references: [id])\n  sumberDana     JenisPembayaran? @relation(fields: [sumberDanaId], references: [id])\n  posPengeluaran PosPengeluaran?  @relation(fields: [posPengeluaranId], references: [id])\n\n  @@map(\"transaksi_kas\")\n}\n",
  "inlineSchemaHash": "a4a02832ded82c9e2ca7d27c58c9186d463096dcd488216bb62a109827262cf6",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"TahunAjaran\":{\"dbName\":\"tahun_ajaran\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalMulai\",\"dbName\":\"tanggal_mulai\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalSelesai\",\"dbName\":\"tanggal_selesai\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rombels\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rombel\",\"relationName\":\"RombelToTahunAjaran\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tarifs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaranTarif\",\"relationName\":\"JenisPembayaranTarifToTahunAjaran\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Jenjang\":{\"dbName\":\"jenjang\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kelompok\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"urutan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Int\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rombels\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rombel\",\"relationName\":\"JenjangToRombel\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tarifs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaranTarif\",\"relationName\":\"JenisPembayaranTarifToJenjang\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Rombel\":{\"dbName\":\"rombel\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjangId\",\"dbName\":\"jenjang_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tahunAjaranId\",\"dbName\":\"tahun_ajaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"waliKelas\",\"dbName\":\"wali_kelas\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kapasitas\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":25,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"jenjang\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Jenjang\",\"relationName\":\"JenjangToRombel\",\"relationFromFields\":[\"jenjangId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tahunAjaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TahunAjaran\",\"relationName\":\"RombelToTahunAjaran\",\"relationFromFields\":[\"tahunAjaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"RombelToSiswa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"jenjangId\",\"tahunAjaranId\",\"nama\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"jenjangId\",\"tahunAjaranId\",\"nama\"]}],\"isGenerated\":false},\"Siswa\":{\"dbName\":\"siswa\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nis\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"namaLengkap\",\"dbName\":\"nama_lengkap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisKelamin\",\"dbName\":\"jenis_kelamin\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisKelamin\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tempatLahir\",\"dbName\":\"tempat_lahir\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalLahir\",\"dbName\":\"tanggal_lahir\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"alamat\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"namaOrtu\",\"dbName\":\"nama_ortu\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"noHpOrtu\",\"dbName\":\"no_hp_ortu\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"emailOrtu\",\"dbName\":\"email_ortu\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rombelId\",\"dbName\":\"rombel_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"StatusSiswa\",\"default\":\"AKTIF\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalMasuk\",\"dbName\":\"tanggal_masuk\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"foto\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"ikutDaycare\",\"dbName\":\"ikut_daycare\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":false,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"rombel\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Rombel\",\"relationName\":\"RombelToSiswa\",\"relationFromFields\":[\"rombelId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaPastas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SiswaPasta\",\"relationName\":\"SiswaToSiswaPasta\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaDiskons\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SiswaDiskon\",\"relationName\":\"SiswaToSiswaDiskon\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tagihan\",\"relationName\":\"SiswaToTagihan\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayarans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pembayaran\",\"relationName\":\"PembayaranToSiswa\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tabungans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tabungan\",\"relationName\":\"SiswaToTabungan\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"JenisPembayaran\":{\"dbName\":\"jenis_pembayaran\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kategori\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"KategoriPembayaran\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipe\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipePembayaran\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalDefault\",\"dbName\":\"nominal_default\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjangIds\",\"dbName\":\"jenjang_ids\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sifat\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SifatPembayaran\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jatuhTempoHari\",\"dbName\":\"jatuh_tempo_hari\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Int\",\"default\":1,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"keterangan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"tarifs\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaranTarif\",\"relationName\":\"JenisPembayaranToJenisPembayaranTarif\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"diskons\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Diskon\",\"relationName\":\"DiskonToJenisPembayaran\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihanItems\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TagihanItem\",\"relationName\":\"JenisPembayaranToTagihanItem\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transaksis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiKas\",\"relationName\":\"JenisPembayaranToTransaksiKas\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"posPengeluarans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PosPengeluaran\",\"relationName\":\"JenisPembayaranToPosPengeluaran\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"JenisPembayaranTarif\":{\"dbName\":\"jenis_pembayaran_tarif\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisPembayaranId\",\"dbName\":\"jenis_pembayaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tahunAjaranId\",\"dbName\":\"tahun_ajaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjangId\",\"dbName\":\"jenjang_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisKelamin\",\"dbName\":\"jenis_kelamin\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisKelamin\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"jenisPembayaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaran\",\"relationName\":\"JenisPembayaranToJenisPembayaranTarif\",\"relationFromFields\":[\"jenisPembayaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tahunAjaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TahunAjaran\",\"relationName\":\"JenisPembayaranTarifToTahunAjaran\",\"relationFromFields\":[\"tahunAjaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjang\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Jenjang\",\"relationName\":\"JenisPembayaranTarifToJenjang\",\"relationFromFields\":[\"jenjangId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"jenisPembayaranId\",\"tahunAjaranId\",\"jenjangId\",\"jenisKelamin\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"jenisPembayaranId\",\"tahunAjaranId\",\"jenjangId\",\"jenisKelamin\"]}],\"isGenerated\":false},\"Diskon\":{\"dbName\":\"diskon\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisPembayaranId\",\"dbName\":\"jenis_pembayaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipePotongan\",\"dbName\":\"tipe_potongan\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipePotongan\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nilaiPotongan\",\"dbName\":\"nilai_potongan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"keterangan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"jenisPembayaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaran\",\"relationName\":\"DiskonToJenisPembayaran\",\"relationFromFields\":[\"jenisPembayaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaDiskons\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SiswaDiskon\",\"relationName\":\"DiskonToSiswaDiskon\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Pasta\":{\"dbName\":\"pasta\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"hari\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Hari\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jamMulai\",\"dbName\":\"jam_mulai\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jamSelesai\",\"dbName\":\"jam_selesai\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"biaya\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjangIds\",\"dbName\":\"jenjang_ids\",\"kind\":\"scalar\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"siswaPastas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SiswaPasta\",\"relationName\":\"PastaToSiswaPasta\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Bank\":{\"dbName\":\"bank\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nomorRekening\",\"dbName\":\"nomor_rekening\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"atasNama\",\"dbName\":\"atas_nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"pembayarans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pembayaran\",\"relationName\":\"BankToPembayaran\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"User\":{\"dbName\":\"user\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"username\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"email\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"password\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"namaLengkap\",\"dbName\":\"nama_lengkap\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"role\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"UserRole\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"lastLogin\",\"dbName\":\"last_login\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"siswaDiskonsCreated\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"SiswaDiskon\",\"relationName\":\"DiskonCreatedBy\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaransAsKasir\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pembayaran\",\"relationName\":\"PembayaranKasir\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaransVoidedBy\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pembayaran\",\"relationName\":\"PembayaranVoidBy\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transaksiTabungans\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiTabungan\",\"relationName\":\"TransaksiTabunganToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transaksiKas\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiKas\",\"relationName\":\"TransaksiKasToUser\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"SiswaPasta\":{\"dbName\":\"siswa_pasta\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaId\",\"dbName\":\"siswa_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pastaId\",\"dbName\":\"pasta_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"SiswaToSiswaPasta\",\"relationFromFields\":[\"siswaId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pasta\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pasta\",\"relationName\":\"PastaToSiswaPasta\",\"relationFromFields\":[\"pastaId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"siswaId\",\"pastaId\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"siswaId\",\"pastaId\"]}],\"isGenerated\":false},\"SiswaDiskon\":{\"dbName\":\"siswa_diskon\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaId\",\"dbName\":\"siswa_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"diskonId\",\"dbName\":\"diskon_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalMulai\",\"dbName\":\"tanggal_mulai\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalBerakhir\",\"dbName\":\"tanggal_berakhir\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"catatan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdBy\",\"dbName\":\"created_by\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"SiswaToSiswaDiskon\",\"relationFromFields\":[\"siswaId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"diskon\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Diskon\",\"relationName\":\"DiskonToSiswaDiskon\",\"relationFromFields\":[\"diskonId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdByUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"DiskonCreatedBy\",\"relationFromFields\":[\"createdBy\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Tagihan\":{\"dbName\":\"tagihan\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaId\",\"dbName\":\"siswa_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"periode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"rombelSnapshot\",\"dbName\":\"rombel_snapshot\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenjangSnapshot\",\"dbName\":\"jenjang_snapshot\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggalTagihan\",\"dbName\":\"tanggal_tagihan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jatuhTempo\",\"dbName\":\"jatuh_tempo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalTagihan\",\"dbName\":\"total_tagihan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalDiskon\",\"dbName\":\"total_diskon\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalBayar\",\"dbName\":\"total_bayar\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sisaTagihan\",\"dbName\":\"sisa_tagihan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"StatusTagihan\",\"default\":\"UNPAID\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"siswa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"SiswaToTagihan\",\"relationFromFields\":[\"siswaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihanItems\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TagihanItem\",\"relationName\":\"TagihanToTagihanItem\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaranAlokasis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PembayaranAlokasi\",\"relationName\":\"PembayaranAlokasiToTagihan\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"siswaId\",\"periode\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"siswaId\",\"periode\"]}],\"isGenerated\":false},\"TagihanItem\":{\"dbName\":\"tagihan_item\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihanId\",\"dbName\":\"tagihan_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisPembayaranId\",\"dbName\":\"jenis_pembayaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"namaItem\",\"dbName\":\"nama_item\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalAwal\",\"dbName\":\"nominal_awal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalDiskon\",\"dbName\":\"nominal_diskon\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalAkhir\",\"dbName\":\"nominal_akhir\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"catatan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihan\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tagihan\",\"relationName\":\"TagihanToTagihanItem\",\"relationFromFields\":[\"tagihanId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenisPembayaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaran\",\"relationName\":\"JenisPembayaranToTagihanItem\",\"relationFromFields\":[\"jenisPembayaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Pembayaran\":{\"dbName\":\"pembayaran\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaId\",\"dbName\":\"siswa_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tanggal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"totalBayar\",\"dbName\":\"total_bayar\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"metode\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"MetodePembayaran\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bankId\",\"dbName\":\"bank_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"buktiTransfer\",\"dbName\":\"bukti_transfer\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"catatan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kasirId\",\"dbName\":\"kasir_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"status\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"StatusPembayaran\",\"default\":\"AKTIF\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"voidReason\",\"dbName\":\"void_reason\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"voidBy\",\"dbName\":\"void_by\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"voidAt\",\"dbName\":\"void_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"siswa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"PembayaranToSiswa\",\"relationFromFields\":[\"siswaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bank\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Bank\",\"relationName\":\"BankToPembayaran\",\"relationFromFields\":[\"bankId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kasir\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"PembayaranKasir\",\"relationFromFields\":[\"kasirId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"voidByUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"PembayaranVoidBy\",\"relationFromFields\":[\"voidBy\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaranAlokasis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PembayaranAlokasi\",\"relationName\":\"PembayaranToPembayaranAlokasi\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"PembayaranAlokasi\":{\"dbName\":\"pembayaran_alokasi\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaranId\",\"dbName\":\"pembayaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihanId\",\"dbName\":\"tagihan_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalAlokasi\",\"dbName\":\"nominal_alokasi\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"pembayaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Pembayaran\",\"relationName\":\"PembayaranToPembayaranAlokasi\",\"relationFromFields\":[\"pembayaranId\"],\"relationToFields\":[\"id\"],\"relationOnDelete\":\"Cascade\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tagihan\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tagihan\",\"relationName\":\"PembayaranAlokasiToTagihan\",\"relationFromFields\":[\"tagihanId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Tabungan\":{\"dbName\":\"tabungan\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"siswaId\",\"dbName\":\"siswa_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"jenis\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisTabungan\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"saldo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"siswa\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Siswa\",\"relationName\":\"SiswaToTabungan\",\"relationFromFields\":[\"siswaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transaksis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiTabungan\",\"relationName\":\"TabunganToTransaksiTabungan\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[[\"siswaId\",\"jenis\"]],\"uniqueIndexes\":[{\"name\":null,\"fields\":[\"siswaId\",\"jenis\"]}],\"isGenerated\":false},\"TransaksiTabungan\":{\"dbName\":\"transaksi_tabungan\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tabunganId\",\"dbName\":\"tabungan_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipe\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipeTransaksiTabungan\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"potonganAdmin\",\"dbName\":\"potongan_admin\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominalBersih\",\"dbName\":\"nominal_bersih\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"keterangan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdBy\",\"dbName\":\"created_by\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tabungan\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Tabungan\",\"relationName\":\"TabunganToTransaksiTabungan\",\"relationFromFields\":[\"tabunganId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdByUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"TransaksiTabunganToUser\",\"relationFromFields\":[\"createdBy\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"Kas\":{\"dbName\":\"kas\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipe\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipeKas\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"saldo\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Decimal\",\"default\":0,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"transaksis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiKas\",\"relationName\":\"KasTransaksi\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transfersReceived\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiKas\",\"relationName\":\"KasTransferTo\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"PosPengeluaran\":{\"dbName\":\"pos_pengeluaran\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kode\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":true,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nama\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"prioritasSumberDanaId\",\"dbName\":\"prioritas_sumber_dana_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"keterangan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"isAktif\",\"dbName\":\"is_aktif\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"Boolean\",\"default\":true,\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"updatedAt\",\"dbName\":\"updated_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"DateTime\",\"isGenerated\":false,\"isUpdatedAt\":true},{\"name\":\"prioritasSumberDana\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaran\",\"relationName\":\"JenisPembayaranToPosPengeluaran\",\"relationFromFields\":[\"prioritasSumberDanaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transaksis\",\"kind\":\"object\",\"isList\":true,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TransaksiKas\",\"relationName\":\"PosPengeluaranToTransaksiKas\",\"relationFromFields\":[],\"relationToFields\":[],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false},\"TransaksiKas\":{\"dbName\":\"transaksi_kas\",\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":true,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"String\",\"default\":{\"name\":\"uuid(4)\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kasId\",\"dbName\":\"kas_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"tipeTransaksi\",\"dbName\":\"tipe_transaksi\",\"kind\":\"enum\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"TipeTransaksiKas\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sumberDanaId\",\"dbName\":\"sumber_dana_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"posPengeluaranId\",\"dbName\":\"pos_pengeluaran_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"referensiId\",\"dbName\":\"referensi_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"referensiTipe\",\"dbName\":\"referensi_tipe\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kategori\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"nominal\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Decimal\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"keterangan\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"bukti\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transferKeKasId\",\"dbName\":\"transfer_ke_kas_id\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdBy\",\"dbName\":\"created_by\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":true,\"hasDefaultValue\":false,\"type\":\"String\",\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdAt\",\"dbName\":\"created_at\",\"kind\":\"scalar\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":true,\"type\":\"DateTime\",\"default\":{\"name\":\"now\",\"args\":[]},\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"kas\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Kas\",\"relationName\":\"KasTransaksi\",\"relationFromFields\":[\"kasId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"transferKeKas\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"Kas\",\"relationName\":\"KasTransferTo\",\"relationFromFields\":[\"transferKeKasId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"createdByUser\",\"kind\":\"object\",\"isList\":false,\"isRequired\":true,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"User\",\"relationName\":\"TransaksiKasToUser\",\"relationFromFields\":[\"createdBy\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"sumberDana\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"JenisPembayaran\",\"relationName\":\"JenisPembayaranToTransaksiKas\",\"relationFromFields\":[\"sumberDanaId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false},{\"name\":\"posPengeluaran\",\"kind\":\"object\",\"isList\":false,\"isRequired\":false,\"isUnique\":false,\"isId\":false,\"isReadOnly\":false,\"hasDefaultValue\":false,\"type\":\"PosPengeluaran\",\"relationName\":\"PosPengeluaranToTransaksiKas\",\"relationFromFields\":[\"posPengeluaranId\"],\"relationToFields\":[\"id\"],\"isGenerated\":false,\"isUpdatedAt\":false}],\"primaryKey\":null,\"uniqueFields\":[],\"uniqueIndexes\":[],\"isGenerated\":false}},\"enums\":{\"JenisKelamin\":{\"values\":[{\"name\":\"L\",\"dbName\":null},{\"name\":\"P\",\"dbName\":null}],\"dbName\":null},\"StatusSiswa\":{\"values\":[{\"name\":\"AKTIF\",\"dbName\":null},{\"name\":\"LULUS\",\"dbName\":null},{\"name\":\"KELUAR\",\"dbName\":null}],\"dbName\":null},\"KategoriPembayaran\":{\"values\":[{\"name\":\"INFAQ_RUTIN\",\"dbName\":null},{\"name\":\"REGISTRASI\",\"dbName\":null},{\"name\":\"PERLENGKAPAN\",\"dbName\":null},{\"name\":\"DAYCARE\",\"dbName\":null}],\"dbName\":null},\"TipePembayaran\":{\"values\":[{\"name\":\"BULANAN\",\"dbName\":null},{\"name\":\"TAHUNAN\",\"dbName\":null},{\"name\":\"SEKALI\",\"dbName\":null},{\"name\":\"HARIAN\",\"dbName\":null},{\"name\":\"INSIDENTIL\",\"dbName\":null}],\"dbName\":null},\"SifatPembayaran\":{\"values\":[{\"name\":\"WAJIB\",\"dbName\":null},{\"name\":\"OPSIONAL\",\"dbName\":null}],\"dbName\":null},\"TipePotongan\":{\"values\":[{\"name\":\"PERSENTASE\",\"dbName\":null},{\"name\":\"NOMINAL\",\"dbName\":null}],\"dbName\":null},\"Hari\":{\"values\":[{\"name\":\"SENIN\",\"dbName\":null},{\"name\":\"SELASA\",\"dbName\":null},{\"name\":\"RABU\",\"dbName\":null},{\"name\":\"KAMIS\",\"dbName\":null},{\"name\":\"JUMAT\",\"dbName\":null},{\"name\":\"SABTU\",\"dbName\":null}],\"dbName\":null},\"UserRole\":{\"values\":[{\"name\":\"ADMIN\",\"dbName\":null},{\"name\":\"KEPALA_SEKOLAH\",\"dbName\":null},{\"name\":\"BENDAHARA_YAYASAN\",\"dbName\":null}],\"dbName\":null},\"StatusTagihan\":{\"values\":[{\"name\":\"DRAFT\",\"dbName\":null},{\"name\":\"UNPAID\",\"dbName\":null},{\"name\":\"DUE\",\"dbName\":null},{\"name\":\"OVERDUE\",\"dbName\":null},{\"name\":\"PARTIAL\",\"dbName\":null},{\"name\":\"PAID\",\"dbName\":null},{\"name\":\"CANCELLED\",\"dbName\":null}],\"dbName\":null},\"MetodePembayaran\":{\"values\":[{\"name\":\"TUNAI\",\"dbName\":null},{\"name\":\"TRANSFER\",\"dbName\":null}],\"dbName\":null},\"StatusPembayaran\":{\"values\":[{\"name\":\"AKTIF\",\"dbName\":null},{\"name\":\"VOID\",\"dbName\":null}],\"dbName\":null},\"JenisTabungan\":{\"values\":[{\"name\":\"WAJIB_BERLIAN\",\"dbName\":null},{\"name\":\"UMUM\",\"dbName\":null}],\"dbName\":null},\"TipeTransaksiTabungan\":{\"values\":[{\"name\":\"SETOR\",\"dbName\":null},{\"name\":\"TARIK\",\"dbName\":null}],\"dbName\":null},\"TipeKas\":{\"values\":[{\"name\":\"KAS\",\"dbName\":null},{\"name\":\"BERANGKAS\",\"dbName\":null}],\"dbName\":null},\"TipeTransaksiKas\":{\"values\":[{\"name\":\"MASUK\",\"dbName\":null},{\"name\":\"KELUAR\",\"dbName\":null},{\"name\":\"TRANSFER\",\"dbName\":null}],\"dbName\":null}},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

