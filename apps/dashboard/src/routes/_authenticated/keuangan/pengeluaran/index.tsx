import { useState, useMemo } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, ChevronRight, Trash2, ExternalLink } from 'lucide-react';
import { useGetV1Expenses, useDeleteV1ExpensesId } from '../../../../api/endpoints/expenses/expenses';
import { useGetV1ExpenseCategories } from '../../../../api/endpoints/expense-categories/expense-categories';
import { academicYearAtom } from '../../../../store/global';
import { formatCurrency, formatDate, formatDateTime } from '../../../../utils/format';
import { Button } from '../../../../components/atoms/Button';
import { Alert } from '../../../../components/atoms/Alert';
import { EmptyState } from '../../../../components/molecules/EmptyState';
import { ConfirmDialog } from '../../../../components/molecules/ConfirmDialog';
import { SlideOver } from '../../../../components/molecules/SlideOver';

export const Route = createFileRoute('/_authenticated/keuangan/pengeluaran/')({
  component: PengeluaranListPage,
});

function PengeluaranListPage() {
  const [activeAy] = useAtom(academicYearAtom);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const { data: expensesData, isLoading, isError } = useGetV1Expenses(
    {
      page,
      limit: 20,
      academic_year_id: activeAy?.id,
      ...(selectedCategory ? { expense_category_id: Number(selectedCategory) } : {}),
      ...(dateFrom ? { start_date: dateFrom } : {}),
      ...(dateTo ? { end_date: dateTo } : {}),
    },
    { query: { enabled: !!activeAy?.id } }
  );

  const { data: categoriesData } = useGetV1ExpenseCategories();
  const categories: any[] = (categoriesData?.data as any)?.data || [];

  const expenses: any[] = (expensesData?.data as any)?.data || [];
  const meta = (expensesData?.data as any)?.meta;

  const categoryMap = useMemo(() => {
    const map: Record<number, { parentName: string; childName: string }> = {};
    categories.forEach((parent: any) => {
      if (parent.children) {
        parent.children.forEach((child: any) => {
          map[child.id] = { parentName: parent.name, childName: child.name };
        });
      }
      map[parent.id] = { parentName: parent.name, childName: '' };
    });
    return map;
  }, [categories]);

  const filteredExpenses = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter((e: any) => e.description?.toLowerCase().includes(q));
  }, [expenses, search]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  }, [filteredExpenses]);

  const deleteMutation = useDeleteV1ExpensesId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/v1/expenses'] });
        setConfirmDeleteOpen(false);
        setSlideOverOpen(false);
        setSelectedExpense(null);
        setDeleteError('');
      },
      onError: (err: any) => {
        const message = err?.response?.data?.message || err?.message || 'Gagal menghapus pengeluaran.';
        setDeleteError(message);
        setConfirmDeleteOpen(false);
      },
    },
  });

  const handleReset = () => {
    setSearch('');
    setSelectedCategory('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleOpenDetail = (expense: any) => {
    setSelectedExpense(expense);
    setSlideOverOpen(true);
    setDeleteError('');
  };

  const handleDelete = () => {
    if (selectedExpense) {
      deleteMutation.mutate({ id: selectedExpense.id });
    }
  };

  const getCategoryLabel = (expense: any) => {
    const catId = expense.expense_category_id;
    const mapped = categoryMap[catId];
    if (mapped) {
      return mapped.childName ? `${mapped.parentName} > ${mapped.childName}` : mapped.parentName;
    }
    if (expense.expense_category) {
      const cat = expense.expense_category;
      if (cat.parent) {
        return `${cat.parent.name} > ${cat.name}`;
      }
      return cat.name;
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
            Pengeluaran
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar semua pengeluaran operasional sekolah.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/keuangan/pengeluaran/baru">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Catat Pengeluaran
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full sm:w-auto flex-1 min-w-[200px]">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Pencarian (Keterangan)</label>
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="Cari keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Semua Kategori</option>
              {categories.map((parent: any) => (
                <optgroup key={parent.id} label={parent.name}>
                  {parent.children?.map((child: any) => (
                    <option key={child.id} value={child.id}>
                      {parent.name} &gt; {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium leading-6 text-gray-900 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>

          <div className="w-full sm:w-auto">
            <Button variant="secondary" className="bg-white" onClick={handleReset}>
              <Filter className="w-4 h-4 mr-2" />
              Reset Filter
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Pengeluaran Periode Ini</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredExpenses.length} transaksi
          </div>
        </div>
      </div>

      {deleteError && (
        <Alert variant="error" title="Gagal Menghapus" onClose={() => setDeleteError('')}>
          {deleteError}
        </Alert>
      )}

      {isError ? (
        <Alert variant="error" title="Gagal Memuat Data">
          Terjadi kesalahan saat memuat data pengeluaran. Silakan coba lagi.
        </Alert>
      ) : (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16">
                    #
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Tanggal
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Kategori
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Nominal
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4 pl-4 pr-3 sm:pl-6"><div className="h-4 w-6 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-3 py-4"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-3 py-4"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-3 py-4 text-right"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="py-4 pl-3 pr-4 sm:pr-6"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-12">
                      <EmptyState
                        title="Belum Ada Pengeluaran"
                        description="Belum ada data pengeluaran yang sesuai dengan filter."
                        action={
                          <Link to="/keuangan/pengeluaran/baru">
                            <Button variant="primary" size="sm">
                              <Plus className="w-4 h-4 mr-1" />
                              Catat Pengeluaran Baru
                            </Button>
                          </Link>
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense: any, index: number) => (
                    <tr key={expense.id} className="hover:bg-gray-50 group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {(page - 1) * 20 + index + 1}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {getCategoryLabel(expense)}
                        {expense.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {expense.description}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleOpenDetail(expense)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Detail <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button variant="secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages}>Next</Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{(page - 1) * 20 + 1}</span> sampai <span className="font-medium">{Math.min(page * 20, meta.total_items)}</span> dari <span className="font-medium">{meta.total_items}</span> pengeluaran
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                      <span className="sr-only">Previous</span>
                      <ChevronRight className="h-5 w-5 rotate-180" aria-hidden="true" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                      {page}
                    </span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.total_pages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <SlideOver
        isOpen={slideOverOpen}
        onClose={() => { setSlideOverOpen(false); setSelectedExpense(null); }}
        title="Detail Pengeluaran"
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus
            </Button>
          </>
        }
      >
        {selectedExpense && (
          <div className="space-y-5">
            <dl className="divide-y divide-gray-200">
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Tanggal</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {formatDate(selectedExpense.expense_date)}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Kategori</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {(() => {
                    const cat = selectedExpense.expense_category;
                    if (cat?.parent) return cat.parent.name;
                    const mapped = categoryMap[selectedExpense.expense_category_id];
                    return mapped?.parentName || '-';
                  })()}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Sub-kategori</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {(() => {
                    const cat = selectedExpense.expense_category;
                    if (cat?.parent) return cat.name;
                    const mapped = categoryMap[selectedExpense.expense_category_id];
                    return mapped?.childName || cat?.name || '-';
                  })()}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Nominal</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900 sm:col-span-2 sm:mt-0">
                  {formatCurrency(Number(selectedExpense.amount))}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Keterangan</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {selectedExpense.description || '-'}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Bukti</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {selectedExpense.receipt_url ? (
                    <a
                      href={selectedExpense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-500"
                    >
                      Lihat Bukti <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-gray-400">Tidak ada</span>
                  )}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Dicatat oleh</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {selectedExpense.created_by?.name || selectedExpense.user?.name || '-'}
                </dd>
              </div>
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Waktu Dicatat</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {formatDateTime(selectedExpense.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Hapus Pengeluaran"
        description={`Apakah Anda yakin ingin menghapus pengeluaran "${selectedExpense?.description || ''}" sebesar ${selectedExpense ? formatCurrency(Number(selectedExpense.amount)) : ''}? Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
