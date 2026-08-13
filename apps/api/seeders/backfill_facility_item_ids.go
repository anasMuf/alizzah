package seeders

import (
	"api/model"
	"api/utility"
	"log"

	"gorm.io/gorm"
)

// BackfillFacilityItemIDs mengisi facility_id pada invoice_items kategori
// facility yang masih NULL (baris dibuat sebelum kolom facility_id ada).
//
// Pencocokan per item: nama dasar item (nama fasilitas atau nama zona/paket
// siswa) dicocokkan dengan pendaftaran fasilitas siswa (student_facilities)
// pada invoice & TAHUN AJARAN yang sama. facility_id hanya diisi jika hasilnya
// TIDAK ambigu; baris ambigu dibiarkan NULL dan tetap ditangani fallback
// pencocokan nama di runtime.
//
// Idempotent: aman dijalankan berkali-kali.
func BackfillFacilityItemIDs(db *gorm.DB) {
	var items []model.InvoiceItem
	if err := db.Where("category = ? AND facility_id IS NULL", "facility").Find(&items).Error; err != nil {
		log.Printf("[BackfillFacilityItemIDs] Gagal ambil item: %v", err)
		return
	}
	if len(items) == 0 {
		return
	}

	// invoice_id → (student_id, academic_year_id)
	var invoices []model.Invoice
	if err := db.Select("id, student_id, academic_year_id").Find(&invoices).Error; err != nil {
		log.Printf("[BackfillFacilityItemIDs] Gagal ambil invoice: %v", err)
		return
	}
	studentByInvoice := make(map[uint]uint, len(invoices))
	ayByInvoice := make(map[uint]uint, len(invoices))
	for _, inv := range invoices {
		studentByInvoice[inv.ID] = inv.StudentID
		ayByInvoice[inv.ID] = inv.AcademicYearID
	}

	// student_facilities semua status (termasuk soft-deleted), diindeks per
	// (student_id, academic_year_id) agar lintas tahun ajaran tidak ikut cocok.
	var sfs []model.StudentFacility
	if err := db.Unscoped().Select("student_id, academic_year_id, facility_id, fee_config_item_id").Find(&sfs).Error; err != nil {
		log.Printf("[BackfillFacilityItemIDs] Gagal ambil student_facilities: %v", err)
		return
	}
	type sfKey struct {
		StudentID uint
		AYID      uint
	}
	byStudentAY := make(map[sfKey][]model.StudentFacility, len(sfs))
	for _, sf := range sfs {
		k := sfKey{StudentID: sf.StudentID, AYID: sf.AcademicYearID}
		byStudentAY[k] = append(byStudentAY[k], sf)
	}

	facilityName := make(map[uint]string)
	var facilities []model.Facility
	if err := db.Find(&facilities).Error; err != nil {
		log.Printf("[BackfillFacilityItemIDs] Gagal ambil facilities: %v", err)
		return
	}
	for _, f := range facilities {
		facilityName[f.ID] = f.Name
	}

	// Nama zona diambil unscoped — zona lama yang sudah soft-deleted pun
	// tetap bisa dipakai untuk mencocokkan baris legacy.
	feeItemName := make(map[uint]string)
	var feeItems []model.FeeConfigItem
	if err := db.Unscoped().Select("id, name").Find(&feeItems).Error; err != nil {
		log.Printf("[BackfillFacilityItemIDs] Gagal ambil fee_config_items: %v", err)
		return
	}
	for _, fi := range feeItems {
		feeItemName[fi.ID] = fi.Name
	}

	updated := 0
	ambiguous := 0
	for _, it := range items {
		studentID, ok := studentByInvoice[it.InvoiceID]
		if !ok {
			continue
		}
		ayID := ayByInvoice[it.InvoiceID]

		var matchFacilityID uint
		matched := false
		for _, sf := range byStudentAY[sfKey{StudentID: studentID, AYID: ayID}] {
			nameOK := utility.InvoiceItemNameHasBase(it.Name, facilityName[sf.FacilityID])
			if !nameOK && sf.FeeConfigItemID != nil {
				nameOK = utility.InvoiceItemNameHasBase(it.Name, feeItemName[*sf.FeeConfigItemID])
			}
			if !nameOK {
				continue
			}
			if matched && matchFacilityID != sf.FacilityID {
				// Lebih dari satu fasilitas cocok → ambigu, biarkan NULL
				matched = false
				ambiguous++
				break
			}
			matchFacilityID = sf.FacilityID
			matched = true
		}
		if !matched {
			continue
		}

		fid := matchFacilityID
		if err := db.Model(&model.InvoiceItem{}).Where("id = ?", it.ID).Update("facility_id", fid).Error; err != nil {
			log.Printf("[BackfillFacilityItemIDs] Gagal update item %d: %v", it.ID, err)
			continue
		}
		updated++
	}

	log.Printf("[BackfillFacilityItemIDs] Selesai: %d item facility_id diisi, %d ambigu dibiarkan NULL", updated, ambiguous)
}
