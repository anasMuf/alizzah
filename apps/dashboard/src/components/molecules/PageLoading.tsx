export function PageLoading({ message = 'Memuat data...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}
