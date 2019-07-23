
var mongoose = require('mongoose');

var clusterSchema  = new mongoose.Schema({
	name: String,
	twitter: String
},{
	collection: 'clusters'
});

module.exports = mongoose.model('Cluster', clusterSchema);

/*	name: String,
	handle: String,
	key: String */