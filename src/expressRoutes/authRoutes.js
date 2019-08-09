var express = require('express');
var app = express();
var secret = require('../secret.json');
var TWITTER_CONSUMER_KEY = secret.TWITTER_API_KEY;
var TWITTER_CONSUMER_SECRET = secret.TWITTER_API_KEY_SECRET
var passport = require('passport'), TwitterStrategy = require('passport-twitter').Strategy;
var Cluster = require('../models/clusterStructure');
passport.initialize();
passport.use(new TwitterStrategy({
		consumerKey: TWITTER_CONSUMER_KEY,
		consumerSecret: TWITTER_CONSUMER_SECRET,
		callbackURL: "http://127.0.0.1:8080/auth/twitter/callback"
	},
	function(req, token, tokenSecret, profile, done){
		console.log(token);
		cluster = req.query.cluster;
		Cluster.findById(cluster, function(err, clust){
			if (err){console.log(err)}
			clust.access_token = token;
			clust.access_token_secret = tokenSecret;
			clust.save().then(() => {
				res.json('updated');
				return done(err, profile);
			})
		});
	}
));
	app.get('/auth/twitter/:cluster', function(req, res, next){
		cluster = req.params.cluster;
		passport.authenticate('twitter', {cluster: cluster})(req,res,next);
	});

	app.get('/auth/twitter/callback', passport.authenticate('twitter', {
		successRedirect: '/lobby',
		failureRedirect: '/404' }));

module.exports = app;