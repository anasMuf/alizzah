# A01-L09: Duplicate ExplicitMapping Key — Silent Overwrite

## Problem (Masalah / Konteks)

Saat memproses kenaikan kelas dengan explicit mapping, jika ada dua entry dengan `from_class_group_id` yang sama, entry terakhir akan menimpa yang pertama **tanpa peringatan**:

## Current Behavior (Kondisi Saat Ini)

**File:** `apps/api/service/academic_event_service.go`

```go
explicitMapping := make(map[uint]*model.ClassGroup)
for _, m := range req.Mappings {
    if tCG, ok := targetCGByID[m.ToClassGroupID]; ok {
        explicitMapping[m.FromClassGroupID] = tCG  // ← silent overwrite
    }
}
```

Jika request body:
```json
{
  "mappings": [
    {"from_class_group_id": 1, "to_class_group_id": 5},
    {"from_class_group_id": 1, "to_class_group_id": 6}
  ]
}
```

Hanya entry kedua (`to_class_group_id: 6`) yang efektif. Tidak ada error atau warning.

## Expected Behavior (Kondisi yang Diharapkan)

Deteksi dan tolak duplicate mapping:

```go
explicitMapping := make(map[uint]*model.ClassGroup)
for _, m := range req.Mappings {
    if _, exists := explicitMapping[m.FromClassGroupID]; exists {
        return fmt.Errorf("Duplicate mapping untuk rombel asal ID %d", m.FromClassGroupID)
    }
    // ...
    explicitMapping[m.FromClassGroupID] = tCG
}
```

## Relevant Files / Area

- `apps/api/service/academic_event_service.go` — PreviewPromotion dan ProcessPromotion

## Task (Daftar Pekerjaan)

- [ ] Tambahkan cek duplicate key sebelum assign ke map
- [ ] Return error 400 dengan pesan yang jelas
- [ ] Tulis test: kirim dua mapping untuk from_class_group_id yang sama → pastikan error
