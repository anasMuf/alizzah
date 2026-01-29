
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
