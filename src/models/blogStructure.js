
var mongoose = require('mongoose');

var blogSchema  = new mongoose.Schema({
	baseUrl: {type : String, required : true},
	dateAdded: {type : Date, default: Date.now()},
	active: {type: Boolean, default: true},
	post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
	cluster: {type: mongoose.Schema.Types.ObjectId, ref: 'Cluster'},
	sheet: {type: mongoose.Schema.Types.ObjectId, ref: 'Sheet'},
	row: Number,
	automation: Boolean
});
blogSchema.index({ baseUrl: 1, cluster: 1}, { unique: true });

module.exports = mongoose.model('Blog', blogSchema);