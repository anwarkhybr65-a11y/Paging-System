/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.role = 'admin'",
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
        "hidden": false,
        "id": "select_stat_period_type",
        "maxSelect": 1,
        "name": "period_type",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "select",
        "values": ["month", "year"]
      },
      {
        "hidden": false,
        "id": "number_stat_year",
        "max": null,
        "min": null,
        "name": "year",
        "onlyInt": true,
        "presentable": true,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_stat_month",
        "max": 12,
        "min": 0,
        "name": "month",
        "onlyInt": true,
        "presentable": true,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_stat_total",
        "max": null,
        "min": 0,
        "name": "total",
        "onlyInt": true,
        "presentable": true,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_stat_entered",
        "max": null,
        "min": 0,
        "name": "entered",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number_stat_not_entered",
        "max": null,
        "min": 0,
        "name": "not_entered",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "json_stat_doctors",
        "maxSize": 2000000,
        "name": "doctors",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "json_stat_months",
        "maxSize": 2000000,
        "name": "months",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "hidden": false,
        "id": "date_stat_captured_at",
        "max": "",
        "min": "",
        "name": "captured_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
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
    "id": "pbc_stat_reports_001",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_stat_reports_period` ON `stat_reports` (`period_type`, `year`, `month`)"
    ],
    "listRule": "@request.auth.id != ''",
    "name": "stat_reports",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_stat_reports_001");
  return app.delete(collection);
})
