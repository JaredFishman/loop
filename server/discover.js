
var app = require('./server');
var dataSource = app.dataSources.db;

dataSource.discoverSchema('SampleModel', {
  owner: 'dbo'
}, function(err, schema) {
  console.log(JSON.stringify(schema, null, '  '));
});