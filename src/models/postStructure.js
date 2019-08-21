
var mongoose = require('mongoose');

var postSchema  = new mongoose.Schema({
	url: {type: String, required: true, unique: true},
	title: String,
	date: Date,
	blog: {type: mongoose.Schema.Types.ObjectId, ref: 'Blog'},
	content: String,
	snippet: String
	
});

module.exports = mongoose.model('Post', postSchema);