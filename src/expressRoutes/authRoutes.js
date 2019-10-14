var express = require('express');
var config = require('../config.json');
var app = express();
var secret = require('../secret.json');
var server = config.serverUrl + ':' + config.serverPort;
var client = config.clientUrl + ':' + config.clientPort;
var TWITTER_CONSUMER_KEY = secret.TWITTER_API_KEY;
var TWITTER_CONSUMER_SECRET = secret.TWITTER_API_KEY_SECRET;
var googleClient = secret.GOOGLE_CLIENT_ID;
var googleSecret = secret.GOOGLE_CLIENT_SECRET;
var passport = require('passport'), TwitterStrategy = require('passport-twitter').Strategy, GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var Cluster = require('../models/clusterStructure');
var Session = require('../models/sessionStructure');
const axios = require('axios');
	
passport.serializeUser((user, done) => done(null, user)); //serializeUser and deserializeUser are important for avoiding passport errors. 
passport.deserializeUser((user, done) => done(null, user));
	
passport.use(new GoogleStrategy({
	clientID: googleClient,
	clientSecret: googleSecret,
	callbackURL: server + "/api/auth/google/callback"
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
		callbackURL: server + "/api/auth/twitter/callback", //callback address for twitter response - MUST be set in the dev dashboard as well. 
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

	app.get('/api/auth/twitter/init/:cluster', function(req, res, next){ //initial auth call, where passport begins the auth 1.0a process
		req.session.cluster = req.params.cluster; //saves the cluster id to the session
		passport.authenticate('twitter',{userAuthorizationURL: 'https://api.twitter.com/oauth/authenticate?force_login=true'})(req,res,next); //begins the auth chain
	});

	app.get('/api/auth/twitter/callback', passport.authenticate('twitter', //called when twitter responds
		{successRedirect: client + '/api/auth/twitter/callback',  //redirect for a successful auth chain
		failureRedirect: client + '/404'} //redirect for a failed auth chain
	));
	
	app.get('/api/auth/google', passport.authenticate('google', 
		{ scope: ['profile', 'email'], hostedDomain:['manaiakalani.org']}
	));
	
	app.get('/api/auth/google/callback', 
		passport.authenticate('google', { failureRedirect: client + '/'}),
		function(req, res) {
			var session = new Session({
				sessionID: req.sessionID
			});
			session.save().then(
				entry => {
					res.redirect(client + '/Lobby');
				}).catch(err => {
					res.redirect(client + '/');
			});
	});
	
	app.get('/api/auth/google/session', async function(req, res)	{
		if (!req.headers.cookie){
			res.send(false);
			return;
		}
		let values = req.headers.cookie.split("=s%3A");
		let cookie = values[1];
		let sessionID = cookie.split(".")[0];
		await Session.findOne({sessionID: sessionID}, function(err, session){
			if (err){console.log(err)}
			else if (session){
				session.expireAt = Date.now();
				session.save();
				res.send(true);
			}
			else {
				res.send(false);
			}
		});
	});

module.exports = app;