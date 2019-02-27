
var mongoose = require('mongoose');

var sheetSchema = new mongoose.Schema({
	name: String,
	title: String,
	range: String,
	spreadsheetId: String,
	clusterId: String
});

module.exports = mongoose.model('Sheet', sheetSchema);