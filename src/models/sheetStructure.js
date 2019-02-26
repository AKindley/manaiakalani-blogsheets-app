
var mongoose = require('mongoose');

var sheetSchema = new mongoose.Schema({
	name: String,
	range: String,
	spreadsheetId: String,
	clusterId: String
});

module.exports = mongoose.model('Sheet', sheetSchema);