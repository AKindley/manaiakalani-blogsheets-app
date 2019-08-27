
var mongoose = require('mongoose');

var clusterSchema  = new mongoose.Schema({
	name: String,
	twitter: String,
	error: Array,
	access_token: String,
	access_token_secret: String
});

module.exports = mongoose.model('Cluster', clusterSchema);
