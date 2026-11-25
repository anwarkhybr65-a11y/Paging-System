/// <reference path="../pb_data/types.d.ts" />

// Stats are calculated from the tickets in the admin page.
// Do not scan the tickets collection from a hook: that runs on every
// call and update, blocks the single server thread, and previously
// left the process up while it stopped answering.
