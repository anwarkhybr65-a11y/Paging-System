/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  collection.listRule = "";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  collection.listRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  return app.save(collection);
});
