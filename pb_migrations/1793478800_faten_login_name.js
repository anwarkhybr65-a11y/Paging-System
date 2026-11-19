/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const staff = app.findAllRecords("staff");
  for (let i = 0; i < staff.length; i++) {
    const record = staff[i];
    const username = record.getString("username");
    const name = record.getString("name");
    if (username !== "faten" && name.indexOf("فاتن") < 0) continue;
    if (name === "العياده رقم 2") continue;
    record.set("name", "العياده رقم 2");
    app.save(record);
  }
}, (app) => {
  const staff = app.findAllRecords("staff");
  for (let i = 0; i < staff.length; i++) {
    const record = staff[i];
    if (record.getString("username") !== "faten") continue;
    if (record.getString("name") !== "العياده رقم 2") continue;
    record.set("name", "د.فاتن");
    app.save(record);
  }
});
