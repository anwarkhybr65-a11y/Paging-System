/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const updates = [
    { from: "admin", username: "admin", password: "5906" },
    { from: "reception", username: "buhl", password: "8567" },
    { from: "sara", username: "ovun", password: "4244" },
    { from: "abdullah", username: "cqii", password: "3985" },
    { from: "ahmed", username: "guxq", password: "1800" },
    { from: "faten", username: "epfi", password: "1075" },
    { from: "amani", username: "fykd", password: "4311" },
    { from: "marwa", username: "joim", password: "7154" },
  ];

  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    const record = app.findFirstRecordByFilter("staff", `username = "${item.from}"`);
    record.set("username", item.username);
    record.setPassword(item.password);
    app.save(record);
  }
}, (app) => {
  const updates = [
    { from: "admin", username: "admin", password: "1234" },
    { from: "buhl", username: "reception", password: "1234" },
    { from: "ovun", username: "sara", password: "1234" },
    { from: "cqii", username: "abdullah", password: "1234" },
    { from: "guxq", username: "ahmed", password: "1234" },
    { from: "epfi", username: "faten", password: "1234" },
    { from: "fykd", username: "amani", password: "1234" },
    { from: "joim", username: "marwa", password: "1234" },
  ];

  for (let i = 0; i < updates.length; i++) {
    const item = updates[i];
    const record = app.findFirstRecordByFilter("staff", `username = "${item.from}"`);
    record.set("username", item.username);
    record.setPassword(item.password);
    app.save(record);
  }
})
