
var mongoose = require('mongoose');

var sheetSchema = new mongoose.Schema({
	name: String,
	title: String,
	spreadsheetId: {type: String, unique: true, required: true},
	range: String,
	cluster: {type: mongoose.Schema.Types.ObjectId, ref: 'Cluster'}
});

module.exports = mongoose.model('Sheet', sheetSchema);