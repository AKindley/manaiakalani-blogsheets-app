var express = require('express');
var config = require('../config.json');
var app = express();
var secret = require('../secret.json');
var server = config.serverAddress;
var client = config.clientAddress;
var TWITTER_CONSUMER_KEY = secret.TWITTER_API_KEY;
var TWITTER_CONSUMER_SECRET = secret.TWITTER_API_KEY_SECRET;
var googleClient = secret.GOOGLE_CLIENT_ID;
var googleSecret = secret.GOOGLE_CLIENT_SECRET;
var passport = require('passport'), TwitterStrategy = require('passport-twitter').Strategy, GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var Cluster = require('../models/clusterStructure');
		
passport.serializeUser((user, done) => done(null, user)); //serializeUser and deserializeUser are important for avoiding passport errors. 
passport.deserializeUser((user, done) => done(null, user));
		
passport.use(new GoogleStrategy({
	clientID: googleClient,
	clientSecret: googleSecret,
	callbackURL: server + "/auth/google/callback"
	},
	function(accessToken, refreshToken, user, done){
		let domain = user.emails[0].value;
		if (domain.match(/@(.+)$/g) != 'manaiakalani.org' && domain != 'fotterly@gmail.com'){
			return done(null, null, 'Invalid Domain');
		}
		return done(null, user);
	}
));

passport.use(new TwitterStrategy({ //passport strategy for twitter auth
		consumerKey: TWITTER_CONSUMER_KEY, //app key from the twitter dev dashboard
		consumerSecret: TWITTER_CONSUMER_SECRET,// app key secret from the twitter dev dashboard
		callbackURL: server + "/auth/twitter/callback", //callback address for twitter response - MUST be set in the dev dashboard as well. 
		passReqToCallback: true //important for app to maintain context of authentication (what Cluster the tokens are being saved/tied to)
	},
	function(req, token, tokenSecret, user, done){ //Runs once authentication is completed, it will save the acquired tokens to the relevant Cluster in the db.
		passport.serializeUser((user, done) => done(null, user)); //serializeUser and deserializeUser are important for avoiding passport errors. 
		passport.deserializeUser((user, done) => done(null, user));
		var cluster = req.session.cluster; //grab cluster db id
		Cluster.findById(cluster, function(err, clust){ //find cluster by ID and save newly acquired tokens.
			if (err){console.log(err)}
			clust.access_token = token;
			clust.access_token_secret = tokenSecret;
			clust.save().then((err) => { //save to db
				if (err) {console.log(err)}
				else{
				console.log('updated successfully');
				}
			});
		});
		return done(null, user); //fire redirect event for client
	}
));

	app.get('/auth/twitter/test/:cluster', function(req, res, next){ //initial auth call, where passport begins the auth 1.0a process
		req.session.cluster = req.params.cluster; //saves the cluster id to the session
		passport.authenticate('twitter',{userAuthorizationURL: 'https://api.twitter.com/oauth/authenticate?force_login=true'})(req,res,next); //begins the auth chain
	});

	app.get('/auth/twitter/callback', passport.authenticate('twitter', //called when twitter responds
		{successRedirect: client + '/auth/twitter/callback',  //redirect for a successful auth chain
		failureRedirect: client + '/404'} //redirect for a failed auth chain
	));
	
	app.get('/auth/google', passport.authenticate('google', //TODO: monitoring whether they're signed in with the correct domain.
		{ scope: ['profile', 'email'], hostedDomain:['manaiakalani.org']}
	));
	
	app.get('/auth/google/callback', 
		passport.authenticate('google', { failureRedirect: client + '/'}),
		function(req, res) {
			res.redirect(client + '/Lobby'); //potentially replace with google auth page??
			console.log(req.session);
			console.log(req);
	});
	
	app.get('/auth/google/session', function(res, req)	{
		console.log(req.req.headers.cookie);
		let values = req.req.headers.cookie.split("=");
		let cookie = values[1];
		
		
	});

module.exports = app;