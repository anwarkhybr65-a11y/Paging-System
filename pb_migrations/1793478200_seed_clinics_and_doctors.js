/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  function normalizeName(value) {
    return String(value || "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, " ")
      .trim();
  }

  const clinicCol = app.findCollectionByNameOrId("clinics");
  const doctorCol = app.findCollectionByNameOrId("doctors");

  function allClinics() {
    return app.findAllRecords("clinics");
  }

  function findClinicByName(name) {
    const target = normalizeName(name);
    const clinics = allClinics();
    for (let i = 0; i < clinics.length; i++) {
      if (normalizeName(clinics[i].getString("name")) === target) {
        return clinics[i];
      }
    }
    return null;
  }

  const clinicNames = [
    "عيادة الاسنان رقم 1",
    "عيادة الاسنان رقم 2",
    "عيادة الاسنان رقم 3",
    "عيادة الاسنان رقم 4",
    "عيادة الباطنة",
    "عيادة النساء و الولادة",
    "طوارئ النساء",
    "طوارئ الرجال",
    "المختبر",
    "عيادة الجلدية",
  ];

  for (let i = 0; i < clinicNames.length; i++) {
    const name = clinicNames[i];
    if (findClinicByName(name)) continue;
    const record = new Record(clinicCol);
    record.set("name", name);
    record.set("current_number", 0);
    app.save(record);
  }

  const doctors = [
    { name: "د.ساره", clinic: "عيادة الاسنان رقم 1" },
    { name: "د.عبدالله", clinic: "عيادة الاسنان رقم 2" },
    { name: "د.احمد", clinic: "عيادة الاسنان رقم 3" },
    { name: "د.فاتن", clinic: "عيادة الاسنان رقم 4" },
    { name: "د.اماني", clinic: "عيادة الباطنة" },
    { name: "د.مروه", clinic: "عيادة النساء و الولادة" },
  ];

  const existingDoctors = app.findAllRecords("doctors");
  for (let i = 0; i < doctors.length; i++) {
    const doctor = doctors[i];
    const clinic = findClinicByName(doctor.clinic);
    if (!clinic) continue;
    let record = null;
    for (let j = 0; j < existingDoctors.length; j++) {
      if (normalizeName(existingDoctors[j].getString("name")) === normalizeName(doctor.name)) {
        record = existingDoctors[j];
        break;
      }
    }
    if (!record) {
      record = new Record(doctorCol);
      record.set("name", doctor.name);
    }
    record.set("clinic", clinic.id);
    record.set("is_active", true);
    app.save(record);
  }

  const staffMap = [
    { username: "sara", clinic: "عيادة الاسنان رقم 1" },
    { username: "abdullah", clinic: "عيادة الاسنان رقم 2" },
    { username: "ahmed", clinic: "عيادة الاسنان رقم 3" },
    { username: "faten", clinic: "عيادة الاسنان رقم 4" },
    { username: "amani", clinic: "عيادة الباطنة" },
    { username: "marwa", clinic: "عيادة النساء و الولادة" },
  ];

  for (let i = 0; i < staffMap.length; i++) {
    const item = staffMap[i];
    try {
      const record = app.findFirstRecordByFilter("staff", `username = "${item.username}"`);
      const clinic = findClinicByName(item.clinic);
      if (record && clinic) {
        record.set("clinic", clinic.id);
        app.save(record);
      }
    } catch (err) {
      // staff username may have been changed
    }
  }
}, (app) => {
  // keep seeded records; rollback would wipe live clinic data
});
