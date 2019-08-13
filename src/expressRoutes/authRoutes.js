var express = require('express');
var app = express();
var secret = require('../secret.json');
var TWITTER_CONSUMER_KEY = secret.TWITTER_API_KEY;
var TWITTER_CONSUMER_SECRET = secret.TWITTER_API_KEY_SECRET
var passport = require('passport'), TwitterStrategy = require('passport-twitter').Strategy;
var Cluster = require('../models/clusterStructure');
passport.use(new TwitterStrategy({
		consumerKey: TWITTER_CONSUMER_KEY,
		consumerSecret: TWITTER_CONSUMER_SECRET,
		callbackURL: "http://127.0.0.1:4000/auth/twitter/callback",
		passReqToCallback: true
	},
	function(req, token, tokenSecret, user, done){
		console.log(req);
		passport.serializeUser((user, done) => done(null, user));
		passport.deserializeUser((user, done) => done(null, user));
		var cluster = req.session.cluster;
		Cluster.findById(cluster, function(err, clust){
			if (err){console.log(err)}
			clust.access_token = token;
			clust.access_token_secret = tokenSecret;
			clust.save().then(() => {
				console.log('updated successfully');
			});
		});
		return done(null, user);
	}
));
	app.get('/auth/twitter/test/:cluster', function(req, res, next){
		req.session.cluster = req.params.cluster;
		passport.authenticate('twitter')(req,res,next);
	});

	app.get('/auth/twitter/callback', passport.authenticate('twitter', 
		{successRedirect: 'http://localhost:8080/auth/twitter/callback', 
		failureRedirect: 'http://localhost:8080/404'}
	));

module.exports = app;