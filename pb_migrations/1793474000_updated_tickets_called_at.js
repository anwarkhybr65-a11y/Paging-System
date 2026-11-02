/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")

  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "date_called_at",
    "max": "",
    "min": "",
    "name": "called_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3306545694")
  collection.fields.removeById("date_called_at")
  return app.save(collection)
})
