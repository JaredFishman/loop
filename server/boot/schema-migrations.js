'use strict';

module.exports = function(app) {
  var ds = app.dataSources.db;
  console.log('Running schema migrations against ' + ds.settings.database + ' on ' + ds.settings.server + '...');

  try {
    // automigrate() drops and re-creates tables. But autoupdate() alters tables, preserving data. Choose wisely!
    ds.autoupdate(null, function(e1) {
      if (e1) console.log(e1);
      else console.log('Schema migrations completed.');
    });
  } catch (e2) {
    console.log('Error calling automigrate()/autoupdate(): ' + e2);
  }
};