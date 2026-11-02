/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "authAlert": {
      "enabled": false,
      "emailTemplate": {
        "body": "<p>تم تسجيل الدخول إلى حسابك من جهاز جديد.</p>",
        "subject": "تنبيه تسجيل دخول"
      }
    },
    "authRule": "",
    "authToken": {
      "duration": 604800
    },
    "confirmEmailChangeTemplate": {
      "body": "<p>أكد بريدك الإلكتروني الجديد من الرابط المرسل.</p>",
      "subject": "تأكيد البريد الإلكتروني"
    },
    "createRule": null,
    "deleteRule": null,
    "emailChangeToken": {
      "duration": 1800
    },
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cost": 10,
        "hidden": true,
        "id": "password901924522",
        "max": 0,
        "min": 4,
        "name": "password",
        "pattern": "",
        "presentable": false,
        "required": true,
        "system": true,
        "type": "password"
      },
      {
        "autogeneratePattern": "[a-zA-Z0-9_]{50}",
        "hidden": true,
        "id": "text2504183744",
        "max": 60,
        "min": 30,
        "name": "tokenKey",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email3885137012",
        "name": "email",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": true,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "bool1547992806",
        "name": "emailVisibility",
        "presentable": false,
        "required": false,
        "system": true,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "bool256245529",
        "name": "verified",
        "presentable": false,
        "required": false,
        "system": true,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_staff_username",
        "max": 50,
        "min": 3,
        "name": "username",
        "pattern": "^[a-zA-Z0-9_]+$",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_staff_name",
        "max": 150,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "select_staff_role",
        "maxSelect": 1,
        "name": "role",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "admin",
          "reception",
          "doctor"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1180058764",
        "help": "",
        "hidden": false,
        "id": "rel_staff_clinic",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "clinic",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "fileToken": {
      "duration": 180
    },
    "id": "pbc_staff_001",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_staff_username` ON `staff` (`username`)",
      "CREATE UNIQUE INDEX `idx_staff_email` ON `staff` (`email`) WHERE `email` != ''",
      "CREATE UNIQUE INDEX `idx_staff_tokenKey` ON `staff` (`tokenKey`)"
    ],
    "listRule": "id = @request.auth.id",
    "manageRule": null,
    "mfa": {
      "duration": 1800,
      "enabled": false,
      "rule": ""
    },
    "name": "staff",
    "oauth2": {
      "enabled": false,
      "mappedFields": {
        "avatarURL": "",
        "id": "",
        "name": "name",
        "username": "username"
      },
      "providers": []
    },
    "otp": {
      "duration": 180,
      "enabled": false,
      "emailTemplate": {
        "body": "<p>رمز التحقق الخاص بك هو {OTP}</p>",
        "subject": "رمز التحقق"
      },
      "length": 8
    },
    "passwordAuth": {
      "enabled": true,
      "identityFields": [
        "username"
      ]
    },
    "passwordResetToken": {
      "duration": 1800
    },
    "resetPasswordTemplate": {
      "body": "<p>يمكنك إعادة تعيين كلمة المرور من الرابط المرسل.</p>",
      "subject": "إعادة تعيين كلمة المرور"
    },
    "system": false,
    "type": "auth",
    "updateRule": "id = @request.auth.id",
    "verificationTemplate": {
      "body": "<p>أكد حسابك من الرابط المرسل.</p>",
      "subject": "تأكيد الحساب"
    },
    "verificationToken": {
      "duration": 259200
    },
    "viewRule": "id = @request.auth.id"
  });

  app.save(collection);

  function normalizeName(value) {
    return String(value || "")
      .replace(/ة/g, "ه")
      .replace(/\s+/g, "");
  }

  function clinicIdByHint(hint) {
    const clinics = app.findAllRecords("clinics");
    const target = normalizeName(hint);
    for (let i = 0; i < clinics.length; i++) {
      const name = normalizeName(clinics[i].getString("name"));
      if (name.includes(target) || target.includes(name)) {
        return clinics[i].id;
      }
    }
    const digit = String(hint).match(/\d/);
    if (digit) {
      for (let i = 0; i < clinics.length; i++) {
        const name = clinics[i].getString("name");
        if ((name.indexOf("اسنان") >= 0 || name.indexOf("أسنان") >= 0) && name.indexOf(digit[0]) >= 0) {
          return clinics[i].id;
        }
      }
    }
    return "";
  }

  function createStaff(data) {
    const record = new Record(collection);
    record.set("username", data.username);
    record.set("email", data.email);
    record.set("name", data.name);
    record.set("role", data.role);
    record.setVerified(true);
    record.setPassword(data.password);
    if (data.clinic) {
      record.set("clinic", data.clinic);
    }
    app.save(record);
  }

  const password = "1234";

  createStaff({
    username: "admin",
    email: "admin@anwar.local",
    name: "الإدارة",
    role: "admin",
    password,
  });

  createStaff({
    username: "reception",
    email: "reception@anwar.local",
    name: "الاستقبال",
    role: "reception",
    password,
  });

  const doctors = [
    { username: "sara", email: "sara@anwar.local", name: "د.ساره", hint: "أسنان 1" },
    { username: "abdullah", email: "abdullah@anwar.local", name: "د.عبدالله", hint: "أسنان 2" },
    { username: "ahmed", email: "ahmed@anwar.local", name: "د.احمد", hint: "أسنان 3" },
    { username: "faten", email: "faten@anwar.local", name: "د.فاتن", hint: "أسنان 4" },
    { username: "amani", email: "amani@anwar.local", name: "د.اماني", hint: "باطنة" },
    { username: "marwa", email: "marwa@anwar.local", name: "د.مروه", hint: "نساء" },
  ];

  for (let i = 0; i < doctors.length; i++) {
    const doctor = doctors[i];
    createStaff({
      username: doctor.username,
      email: doctor.email,
      name: doctor.name,
      role: "doctor",
      password,
      clinic: clinicIdByHint(doctor.hint),
    });
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  return app.delete(collection);
})
