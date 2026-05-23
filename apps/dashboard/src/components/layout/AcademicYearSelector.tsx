import { useAtom } from 'jotai'
import { academicYearAtom } from '../../store/global'

export function AcademicYearSelector() {
  const [academicYear, setAcademicYear] = useAtom(academicYearAtom)

  // TODO: Fetch this from API
  const academicYears = [
    { id: 1, name: '2025/2026', is_active: true },
    { id: 2, name: '2024/2025', is_active: false },
  ]

  // Set default if not set
  if (!academicYear && academicYears.length > 0) {
    const active = academicYears.find(ay => ay.is_active) || academicYears[0]
    setAcademicYear(active)
  }

  return (
    <div>
      <label htmlFor="academic-year" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
        Tahun Ajaran
      </label>
      <select
        id="academic-year"
        className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        value={academicYear?.id || ''}
        onChange={(e) => {
          const selected = academicYears.find(ay => ay.id === Number(e.target.value))
          if (selected) setAcademicYear(selected)
        }}
      >
        {academicYears.map((ay) => (
          <option key={ay.id} value={ay.id}>
            TA: {ay.name}
          </option>
        ))}
      </select>
    </div>
  )
}
