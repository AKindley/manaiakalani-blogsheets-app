
var mongoose = require('mongoose');

var sheetSchema = new mongoose.Schema({
	name: String,
	title: String,
	spreadsheetId: {type: String, required: true},
	sheetId: {type: Number, required: true},
	range: String,
	cluster: {type: mongoose.Schema.Types.ObjectId, ref: 'Cluster'},
	error: Array,
	automation: Boolean
});

module.exports = mongoose.model('Sheet', sheetSchema);