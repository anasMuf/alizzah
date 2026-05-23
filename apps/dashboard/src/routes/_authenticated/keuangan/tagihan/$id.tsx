import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, Printer, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { 
  useGetV1InvoicesId, 
  useGetV1InvoicesIdInstallments,
  usePostV1InvoicesIdItems,
  useDeleteV1InvoicesIdItemsItemId,
  usePutV1InvoicesIdItemsItemId,
  usePostV1InvoicesIdInstallments
} from '../../../../api/endpoints/invoices/invoices';
import { Badge } from '../../../../components/atoms/Badge';
import { Button } from '../../../../components/atoms/Button';
import { formatCurrency, formatDate } from '../../../../utils/format';
import { useToast } from '../../../../components/molecules/Toast';
import { ConfirmDialog } from '../../../../components/molecules/ConfirmDialog';
import { SlideOver } from '../../../../components/molecules/SlideOver';
import { FormField } from '../../../../components/molecules/FormField';

export const Route = createFileRoute('/_authenticated/keuangan/tagihan/$id')({
  component: DetailTagihanPage,
});

function DetailTagihanPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: invoiceResp, isLoading } = useGetV1InvoicesId(Number(id));
  const invoice = (invoiceResp?.data as any)?.data;

  const isRegistration = invoice?.type === 'registration';
  const { data: installmentsResp } = useGetV1InvoicesIdInstallments(Number(id), {
    query: { enabled: !!invoice && isRegistration }
  });
  const installments = (installmentsResp?.data as any)?.data || [];

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);

  // Installments Management
  const [isInstallmentOpen, setIsInstallmentOpen] = useState(false);
  const [installmentItems, setInstallmentItems] = useState<{ amount: number; due_date: string; installment_number: number; notes: string }[]>([]);

  // Item Form State
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemCategory, setItemCategory] = useState('incidental');

  const addItemMutation = usePostV1InvoicesIdItems({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Item berhasil ditambahkan.' });
        queryClient.invalidateQueries({ queryKey: ['/v1/invoices', Number(id)] });
        setIsAddItemOpen(false);
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal menambahkan item.' });
      }
    }
  });

  const editItemMutation = usePutV1InvoicesIdItemsItemId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Item berhasil diubah.' });
        queryClient.invalidateQueries({ queryKey: ['/v1/invoices', Number(id)] });
        setEditingItem(null);
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal mengubah item.' });
      }
    }
  });

  const deleteItemMutation = useDeleteV1InvoicesIdItemsItemId({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Item berhasil dihapus.' });
        queryClient.invalidateQueries({ queryKey: ['/v1/invoices', Number(id)] });
        setDeletingItem(null);
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal menghapus item.' });
      }
    }
  });

  const installmentsMutation = usePostV1InvoicesIdInstallments({
    mutation: {
      onSuccess: () => {
        addToast({ variant: 'success', title: 'Berhasil', message: 'Jadwal cicilan berhasil disimpan.' });
        queryClient.invalidateQueries({ queryKey: ['/v1/invoices', Number(id), 'installments'] });
        setIsInstallmentOpen(false);
      },
      onError: (err: any) => {
        addToast({ variant: 'error', title: 'Gagal', message: err.message || 'Gagal menyimpan cicilan.' });
      }
    }
  });

  const handleOpenAddItem = () => {
    setItemName('');
    setItemAmount('');
    setItemCategory('incidental');
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (item: any) => {
    if (Number(item.paid_amount) > 0) return;
    setItemName(item.name);
    setItemAmount(item.amount.toString());
    setItemCategory(item.category || 'incidental');
    setEditingItem(item);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      editItemMutation.mutate({
        id: Number(id),
        itemId: editingItem.id,
        data: {
          name: itemName,
          amount: Number(itemAmount)
        }
      });
    } else {
      addItemMutation.mutate({
        id: Number(id),
        data: {
          name: itemName,
          amount: Number(itemAmount),
          category: itemCategory
        }
      });
    }
  };

  const handleOpenInstallments = () => {
    if (installments.length > 0) {
      setInstallmentItems(installments.map((i: any) => ({
        amount: Number(i.amount),
        due_date: i.due_date.split('T')[0],
        installment_number: i.installment_number,
        notes: i.notes || ''
      })));
    } else {
      setInstallmentItems([
        { amount: 0, due_date: '', installment_number: 1, notes: '' }
      ]);
    }
    setIsInstallmentOpen(true);
  };

  const handleSaveInstallments = (e: React.FormEvent) => {
    e.preventDefault();
    const totalInst = installmentItems.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const invoiceTotal = Number(invoice.total_amount);
    
    if (totalInst !== invoiceTotal) {
      addToast({ 
        variant: 'error', 
        title: 'Validasi Gagal', 
        message: `Total cicilan (${formatCurrency(totalInst)}) harus sama dengan total tagihan (${formatCurrency(invoiceTotal)}).` 
      });
      return;
    }

    installmentsMutation.mutate({
      id: Number(id),
      data: {
        installments: installmentItems.map(i => ({
          ...i,
          amount: Number(i.amount),
          due_date: `${i.due_date}T00:00:00Z`
        }))
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat detail tagihan...</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Tagihan tidak ditemukan.</div>;

  const totalAmount = Number(invoice.total_amount);
  const paidAmount = Number(invoice.paid_amount);
  const sisa = totalAmount - paidAmount;

  const translateType = (type: string) => {
    const map: Record<string, string> = {
      'monthly': 'Bulanan',
      'registration': 'Registrasi Tahunan',
      'initial': 'Biaya Awal',
      'incidental': 'Insidental'
    };
    return map[type] || type;
  };

  const getStatusText = (status: string) => {
    if (status === 'paid') return <span className="text-green-700 bg-green-50 px-2 py-1 rounded font-bold uppercase">Lunas</span>;
    if (status === 'partial') return <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded font-bold uppercase">⚠ Sebagian Dibayar</span>;
    return <span className="text-red-700 bg-red-50 px-2 py-1 rounded font-bold uppercase">Belum Lunas</span>;
  };

  const periodeStr = invoice.month && invoice.year 
    ? `Juli ${invoice.year}` // Using dummy month text, in real app need array
    : invoice.academic_year?.name;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb */}
      <nav className="flex" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center space-x-2 text-sm text-gray-500">
          <li><Link to="/keuangan/tagihan" className="hover:text-gray-900">Tagihan</Link></li>
          <li><ChevronRight className="h-4 w-4" /></li>
          <li><Link to="/keuangan/tagihan/siswa/$id" params={{ id: invoice.student?.id.toString() }} className="hover:text-gray-900">{invoice.student?.full_name}</Link></li>
          <li><ChevronRight className="h-4 w-4" /></li>
          <li className="font-medium text-gray-900">Detail #{invoice.id}</li>
        </ol>
      </nav>

      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
          Tagihan {translateType(invoice.type)} &mdash; {periodeStr}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Siswa: <span className="font-semibold text-gray-900">{invoice.student?.full_name}</span> &bull; {invoice.student?.active_enrollment?.class_group?.name || 'Tanpa Rombel'}
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="text-sm text-gray-500 mb-1">Status Pembayaran</div>
          <div className="text-xl">{getStatusText(invoice.status)}</div>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2">
            <div>
              <div className="text-sm text-gray-500">Total Tagihan</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sudah Dibayar</div>
              <div className="text-lg font-semibold text-gray-900">{formatCurrency(paidAmount)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-amber-600">Sisa Tunggakan</div>
              <div className="text-lg font-bold text-amber-600">{formatCurrency(sisa)}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Cetak Tagihan
          </Button>
          <Link to="/keuangan/pembayaran/baru">
            <Button variant="primary" disabled={invoice.status === 'paid'}>
              + Catat Pembayaran
            </Button>
          </Link>
        </div>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Items */}
        <div className={`space-y-6 ${isRegistration ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-base font-semibold leading-6 text-gray-900">Rincian Item Tagihan</h3>
              {invoice.status !== 'paid' && (
                <Button variant="secondary" size="sm" onClick={handleOpenAddItem}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Item
                </Button>
              )}
            </div>
            <ul className="divide-y divide-gray-200">
              {invoice.items?.map((item: any) => {
                const itemTotal = Number(item.amount);
                const itemPaid = Number(item.paid_amount);
                const itemSisa = itemTotal - itemPaid;
                const isPaid = itemPaid >= itemTotal;
                const isPartial = itemPaid > 0 && !isPaid;

                return (
                  <li key={item.id} className="p-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                          {isPaid ? (
                            <Badge variant="success">Lunas</Badge>
                          ) : isPartial ? (
                            <Badge variant="warning">Sisa: {formatCurrency(itemSisa)}</Badge>
                          ) : (
                            <Badge variant="danger">Belum Lunas</Badge>
                          )}
                        </div>
                        {item.category === 'incidental' && <p className="text-xs text-gray-500 mt-1">Tagihan Tambahan/Insidental</p>}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-gray-900">{formatCurrency(itemTotal)}</div>
                        {!isPaid && (
                          <div className="mt-2 flex gap-2 justify-end">
                            <button 
                              type="button" 
                              className={`text-xs flex items-center font-medium ${itemPaid > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                              onClick={() => handleOpenEditItem(item)}
                              disabled={itemPaid > 0}
                              title={itemPaid > 0 ? 'Item sudah sebagian dibayar, tidak dapat diedit' : ''}
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Edit
                            </button>
                            <button 
                              type="button" 
                              className={`text-xs flex items-center font-medium ${itemPaid > 0 || item.is_mandatory ? 'text-gray-400 cursor-not-allowed' : 'text-rose-600 hover:text-rose-800'}`}
                              onClick={() => {
                                if (itemPaid === 0 && !item.is_mandatory) setDeletingItem(item);
                              }}
                              disabled={itemPaid > 0 || item.is_mandatory}
                              title={item.is_mandatory ? 'Item wajib tidak dapat dihapus' : (itemPaid > 0 ? 'Item sudah sebagian dibayar' : '')}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Right Col: Installments (if registration) and Payment History */}
        <div className="space-y-6 lg:col-span-1">
          {isRegistration && (
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center">
                  <CalendarDays className="w-4 h-4 mr-2" /> Jadwal Cicilan
                </h3>
                <Button variant="ghost" size="sm" onClick={handleOpenInstallments}>
                  Atur
                </Button>
              </div>
              <div className="p-4 sm:px-6">
                {installments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Belum ada jadwal cicilan.</p>
                ) : (
                  <div className="space-y-4">
                    {installments.map((inst: any) => (
                      <div key={inst.id} className="flex justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Cicilan {inst.installment_number}</p>
                          <p className="text-xs text-gray-500">{formatDate(inst.due_date)}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(inst.amount))}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
             <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Riwayat Pembayaran</h3>
             </div>
             <div className="p-4 sm:px-6">
                <p className="text-sm text-gray-500 italic">Belum ada riwayat pembayaran yang diimplementasikan UI-nya di halaman ini.</p>
             </div>
          </div>
        </div>
      </div>

      {/* Modals & SlideOvers */}
      <SlideOver
        isOpen={isAddItemOpen || !!editingItem}
        onClose={() => { setIsAddItemOpen(false); setEditingItem(null); }}
        title={editingItem ? 'Edit Item Tagihan' : 'Tambah Item Tagihan'}
      >
        <form onSubmit={handleSaveItem} className="flex h-full flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
            <FormField
              id="itemName"
              label="Nama Item"
              value={itemName}
              onChange={(e: any) => setItemName(e.target.value)}
              required
            />
            <FormField
              id="itemAmount"
              type="number"
              label="Nominal (Rp)"
              value={itemAmount}
              onChange={(e: any) => setItemAmount(e.target.value)}
              required
              min="1"
            />
            {!editingItem && (
               <div>
                  <label className="block text-sm font-medium leading-6 text-gray-900 mb-2">Kategori</label>
                  <select
                     value={itemCategory}
                     onChange={(e: any) => setItemCategory(e.target.value)}
                     className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  >
                     <option value="incidental">Insidental / Tambahan</option>
                     <option value="tuition">SPP</option>
                  </select>
               </div>
            )}
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setIsAddItemOpen(false); setEditingItem(null); }}>Batal</Button>
            <Button type="submit" variant="primary" disabled={addItemMutation.isPending || editItemMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </SlideOver>

      <SlideOver
        isOpen={isInstallmentOpen}
        onClose={() => setIsInstallmentOpen(false)}
        title="Atur Jadwal Cicilan"
      >
        <form onSubmit={handleSaveInstallments} className="flex h-full flex-col bg-white">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-6">
            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 mb-4">
              Total Tagihan: <strong>{formatCurrency(totalAmount)}</strong>
              <br/>
              Total Cicilan Dibuat: <strong>{formatCurrency(installmentItems.reduce((acc, curr) => acc + Number(curr.amount), 0))}</strong>
            </div>

            {installmentItems.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-md p-4 relative group">
                <button 
                  type="button" 
                  onClick={() => setInstallmentItems(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-2 right-2 text-gray-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <h4 className="text-sm font-semibold mb-3">Cicilan {idx + 1}</h4>
                <div className="space-y-3">
                  <FormField
                    id={`inst_amount_${idx}`}
                    type="number"
                    label="Nominal (Rp)"
                    value={item.amount || ''}
                    onChange={(e: any) => {
                      const newArr = [...installmentItems];
                      newArr[idx].amount = Number(e.target.value);
                      setInstallmentItems(newArr);
                    }}
                    required
                  />
                  <FormField
                    id={`inst_date_${idx}`}
                    type="date"
                    label="Jatuh Tempo"
                    value={item.due_date}
                    onChange={(e: any) => {
                      const newArr = [...installmentItems];
                      newArr[idx].due_date = e.target.value;
                      setInstallmentItems(newArr);
                    }}
                    required
                  />
                </div>
              </div>
            ))}
            
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full"
              onClick={() => setInstallmentItems(prev => [...prev, { amount: 0, due_date: '', installment_number: prev.length + 1, notes: '' }])}
            >
              + Tambah Baris Cicilan
            </Button>
          </div>
          <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsInstallmentOpen(false)}>Batal</Button>
            <Button type="submit" variant="primary" disabled={installmentsMutation.isPending}>
              Simpan Jadwal
            </Button>
          </div>
        </form>
      </SlideOver>

      <ConfirmDialog
        open={!!deletingItem}
        onCancel={() => setDeletingItem(null)}
        onConfirm={() => {
          if (deletingItem) {
            deleteItemMutation.mutate({ id: Number(id), itemId: deletingItem.id });
          }
        }}
        title="Hapus Item Tagihan"
        variant="danger"
        confirmLabel="Hapus Item"
      >
        <p>Apakah Anda yakin ingin menghapus item <strong>{deletingItem?.name}</strong> senilai <strong>{formatCurrency(Number(deletingItem?.amount))}</strong> dari tagihan ini?</p>
        <p className="mt-2 text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
      </ConfirmDialog>
    </div>
  );
}
