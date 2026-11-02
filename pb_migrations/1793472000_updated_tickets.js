/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")

  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 0,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "waiting ",
      "calling",
      "completed",
      "reserved"
    ]
  }))

  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "help": "",
    "hidden": false,
    "id": "text_notes_doctor",
    "max": 0,
    "min": 0,
    "name": "notes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "date_entered_at",
    "max": "",
    "min": "",
    "name": "entered_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date_exited_at",
    "max": "",
    "min": "",
    "name": "exited_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")

  collection.fields.removeById("text_notes_doctor")
  collection.fields.removeById("date_entered_at")
  collection.fields.removeById("date_exited_at")

  collection.fields.addAt(3, new Field({
    "help": "",
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 0,
    "name": "status",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "waiting ",
      "calling",
      "completed"
    ]
  }))

  return app.save(collection)
})
