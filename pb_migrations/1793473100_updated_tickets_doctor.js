/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")

  collection.fields.addAt(7, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_doctors_001",
    "help": "",
    "hidden": false,
    "id": "rel_ticket_doctor",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "doctor",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")
  collection.fields.removeById("rel_ticket_doctor")
  return app.save(collection)
})
