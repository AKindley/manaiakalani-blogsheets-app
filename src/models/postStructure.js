
var mongoose = require('mongoose');

var postSchema  = new mongoose.Schema({
	url: String,
	title: String,
	date: Date,
	blog: {type: mongoose.Schema.Types.ObjectId, ref: 'Blog'},
	content: String
	
});

module.exports = mongoose.model('Post', postSchema);