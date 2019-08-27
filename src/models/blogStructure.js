
var mongoose = require('mongoose');

var blogSchema  = new mongoose.Schema({
	baseUrl: {type : String, unique : true, required : true},
	dateAdded: Date,
	active: {type: Boolean, default: true},
	post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
	cluster: {type: mongoose.Schema.Types.ObjectId, ref: 'Cluster'},
	sheet: {type: mongoose.Schema.Types.ObjectId, ref: 'Sheet'},
	row: Number,
	automation: Boolean
});

module.exports = mongoose.model('Blog', blogSchema);