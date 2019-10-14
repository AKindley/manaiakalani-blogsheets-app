var mongoose = require('mongoose');
// Schema for session management
var sessionSchema = new mongoose.Schema({
	sessionID: String,
	expireAt: {
		type: Date,
		default: Date.now,
		index: {expires: 1800}
	}
});	

module.exports = mongoose.model('Session', sessionSchema);