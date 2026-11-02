/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1180058764")
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "number2438579514",
    "max": null,
    "min": null,
    "name": "current_number",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1180058764")
  collection.fields.addAt(2, new Field({
    "help": "",
    "hidden": false,
    "id": "number2438579514",
    "max": null,
    "min": null,
    "name": "current_number",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))
  return app.save(collection)
})
