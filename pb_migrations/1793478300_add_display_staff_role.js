/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  const roleField = collection.fields.getById("select_staff_role");
  roleField.values = ["admin", "reception", "doctor", "display"];
  app.save(collection);

  let exists = false;
  try {
    exists = Boolean(app.findFirstRecordByData("staff", "username", "screens"));
  } catch (err) {
    exists = false;
  }

  if (!exists) {
    const record = new Record(collection);
    record.set("username", "screens");
    record.set("email", "screens@anwar.local");
    record.set("name", "الشاشات");
    record.set("role", "display");
    record.setVerified(true);
    record.setPassword("1234");
    app.save(record);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  try {
    const record = app.findFirstRecordByData("staff", "username", "screens");
    if (record) app.delete(record);
  } catch (err) {
    // already absent
  }
  const roleField = collection.fields.getById("select_staff_role");
  roleField.values = ["admin", "reception", "doctor"];
  app.save(collection);
});
