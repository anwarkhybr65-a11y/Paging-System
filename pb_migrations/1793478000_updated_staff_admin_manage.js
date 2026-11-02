/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  collection.listRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  collection.viewRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  collection.updateRule = "id = @request.auth.id || @request.auth.role = 'admin'";
  collection.manageRule = "@request.auth.role = 'admin'";
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_staff_001");
  collection.listRule = "id = @request.auth.id";
  collection.viewRule = "id = @request.auth.id";
  collection.updateRule = "id = @request.auth.id";
  collection.manageRule = null;
  return app.save(collection);
})
