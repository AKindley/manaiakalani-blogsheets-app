
var mongoose = require('mongoose');

var clusterSchema  = new mongoose.Schema({
	name: String,
	twitter: String,
	numSheets: String
},{
	collection: 'clusters'
});

module.exports = mongoose.model('Cluster', clusterSchema);

