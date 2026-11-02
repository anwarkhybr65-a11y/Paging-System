/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_stat_reports_001")
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number_stat_month",
    "max": 12,
    "min": 0,
    "name": "month",
    "onlyInt": true,
    "presentable": true,
    "required": false,
    "system": false,
    "type": "number"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_stat_reports_001")
  collection.fields.addAt(4, new Field({
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
  }))
  return app.save(collection)
})
