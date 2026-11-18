/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  function normalizeName(value) {
    return String(value || "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/\s*و\s*/g, "و")
      .replace(/\s+/g, " ")
      .trim();
  }

  function named(records, name) {
    const target = normalizeName(name);
    for (let i = 0; i < records.length; i++) {
      if (normalizeName(records[i].getString("name")) === target) return records[i];
    }
    return null;
  }

  function includesName(record, part) {
    return normalizeName(record.getString("name")).includes(normalizeName(part));
  }

  function findDoctor(records, part) {
    for (let i = 0; i < records.length; i++) {
      if (includesName(records[i], part)) return records[i];
    }
    return null;
  }

  function findById(records, id) {
    for (let i = 0; i < records.length; i++) {
      if (records[i].id === id) return records[i];
    }
    return null;
  }

  function removeClinic(clinicId, doctorId) {
    if (!clinicId) return;
    const clinicTickets = app.findAllRecords("tickets");
    for (let i = 0; i < clinicTickets.length; i++) {
      const ticketClinic = clinicTickets[i].getString("clinic_id");
      const ticketDoctor = clinicTickets[i].getString("doctor");
      if (ticketClinic === clinicId || (doctorId && ticketDoctor === doctorId)) app.delete(clinicTickets[i]);
    }
    const clinicDoctors = app.findAllRecords("doctors");
    for (let i = 0; i < clinicDoctors.length; i++) {
      if (clinicDoctors[i].getString("clinic") === clinicId || (doctorId && clinicDoctors[i].id === doctorId)) {
        app.delete(clinicDoctors[i]);
      }
    }
    const clinicStaff = app.findAllRecords("staff");
    for (let i = 0; i < clinicStaff.length; i++) {
      if (clinicStaff[i].getString("clinic") === clinicId || clinicStaff[i].getString("username") === "abdullah") {
        app.delete(clinicStaff[i]);
      }
    }
    const clinic = findById(app.findAllRecords("clinics"), clinicId);
    if (clinic) app.delete(clinic);
  }

  const clinics = app.findAllRecords("clinics");
  const doctors = app.findAllRecords("doctors");
  const staff = app.findAllRecords("staff");
  const faten = findDoctor(doctors, "فاتن");
  const abdullah = findDoctor(doctors, "عبدالله");
  const fatenClinicId = faten ? faten.getString("clinic") : "";
  const abdullahClinicId = abdullah ? abdullah.getString("clinic") : "";
  const dentalFour = named(clinics, "عيادة الاسنان رقم 4");
  const target = dentalFour || findById(clinics, fatenClinicId) || named(clinics, "عيادة الاسنان رقم 2");
  const targetId = target ? target.id : "";

  if (abdullahClinicId && abdullahClinicId !== targetId) {
    removeClinic(abdullahClinicId, abdullah ? abdullah.id : "");
  }
  const staleDentalTwo = named(app.findAllRecords("clinics"), "عيادة الاسنان رقم 2");
  if (staleDentalTwo && staleDentalTwo.id !== targetId) {
    removeClinic(staleDentalTwo.id, "");
  }

  if (!target) return;
  target.set("name", "عيادة الاسنان رقم 2");
  app.save(target);
  if (faten && faten.getString("clinic") !== target.id) {
    faten.set("clinic", target.id);
    app.save(faten);
  }
  for (let i = 0; i < staff.length; i++) {
    if (staff[i].getString("username") === "faten" && staff[i].getString("clinic") !== target.id) {
      staff[i].set("clinic", target.id);
      app.save(staff[i]);
    }
  }
}, (app) => {
  // live clinic assignments stay in place on rollback
});
