
var mongoose = require('mongoose');

var postSchema  = new mongoose.Schema({
	url: {type: String, required: true},
	title: String,
	date: Date,
	blog: {type: mongoose.Schema.Types.ObjectId, ref: 'Blog'},
	content: String,
	snippet: String
});
postSchema.index({ url: 1, blog: 1}, { unique: true });

module.exports = mongoose.model('Post', postSchema);