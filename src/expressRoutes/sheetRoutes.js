`use strict`;

let fs = require('fs'), request = require('request');
let HTMLParser = require('node-html-parser');
//////////////////////////////////////////////
let secret = require('../secret.json');
let config = require('../config.json');
let apiKey = secret.API_KEY;
let consumerKey = secret.TWITTER_API_KEY;
let consumerSecret = secret.TWITTER_API_KEY_SECRET;
//////////////////////////////////////////////
let crypto = require('crypto');
let express = require('express');
let sheetRoutes = express.Router();
let Sheet = require('../models/sheetStructure');
let Blog = require('../models/blogStructure');
let Post = require('../models/postStructure');
let Session = require('../models/sessionStructure');
let Parser = require('rss-parser');
let parser = new Parser();
let moment = require('moment');
let Twit = require('twit');
let processing = false;
const axios = require('axios');
let dbName = config.dbName;
const h = require('../mongoHelper.js')
const db = new h( 'mongodb://localhost/' + dbName);
const tweetHelper = require('../tweetHelper.js');
const tw = new tweetHelper();
let concuret = 100;

async function authCheck(req, res){
	if (!req.headers.cookie){
		res.send(false);
		return false;
	}
	let values = req.headers.cookie.split("=s%3A");
		let cookie = values[1];
		let sessionID = cookie.split(".")[0];
		return await Session.findOne({sessionID: sessionID}, function(err, session){
			if (err){console.log(err)}
			else if (session){
				session.expireAt = Date.now();
				session.save();
				return true;
			}
			else {
				res.send(false);
				return false;
			}
		});
}

async function processClustersPosts(blogs, clusterID, tweetGo){
	console.log('process blogs');
	let [cluster, clusterPosts] = await Promise.all([ db.getClusterById(clusterID), db.getClusterPosts(clusterID)]);
	// let cluster = await db.getClusterById(clusterID)
	// let clusterPosts = await db.getClusterPosts(clusterID);
	let feedConect = await tw.feedConnet(consumerKey, consumerSecret, cluster);
	
	for (let i = 0; i < blogs.length; i++) {
		let feedArray = [];
		for (let j = 0; (j <= concuret && (i+j) < blogs.length); j++){// do concurently
			let blog = blogs[i+j];
			let feed = tw.getFeeds(blog); //
			feedArray.push(feed);
		}
		i += concuret;

		let result = await Promise.all(feedArray);
		for (let k = 0; k < result.length; k++) {
			let feeds = result[k];
			if (feeds == undefined) {
				continue;
			}
			let latest = feeds[0];
			if (latest.link in clusterPosts) { continue; } // this is in the db
			if (tweetGo && feedConect) { // do tweet
				await tw.postTweet(feedConect, feeds[0]);
			}
			await db.newPost(feeds[0]);//save post to db
			clusterPosts[feeds[0].link] = '';
		}
	}
	console.log('process blogs completed');
}

sheetRoutes.route('/scheduleTrigger').get(async function (req, res){
	//http://127.0.0.1:4000/api/sheets/scheduleTrigger
	if (req.headers.authorization === config.scheduleKey ){
		console.log('skeduled check');
		
		let sheets = await db.getSheets();
		for (let i = 0; i < sheets.length; i++) {
			let sheet = sheets[i];
			let sheetID = sheet['_id'];
			let clusterID = sheet['cluster'];

			await db.updateBlogList(sheet, apiKey);
			let blogs = await db.getBlogsBySheet(sheetID, true);
			await processClustersPosts(blogs, clusterID, true);
		}
		console.log('skeduled check finished');
		
	}
	res.end();
});

sheetRoutes.route('/add').post(async function (req, res) { //Adds sheets to the database w/ url and range etc. Refer to the ./src/models folder for database structure info
	let auth = await authCheck(req, res);
	if (!auth){ return; }
	console.log('add sheet');
	
	let tweetOnAdd = req.body.tweet;// tweet flag
	delete req.body.tweet;

	let sheet = await db.addSheet(req.body);
	let sheetID = sheet.id;
	let clusterID = req.body.cluster;
	
	await db.updateBlogList(sheet, apiKey);

	let blogs = await db.getBlogsBySheet(sheetID, true);
	await processClustersPosts(blogs, clusterID, tweetOnAdd);

	res.status(200).json({'entry': 'Entry added successfully'});
});

sheetRoutes.route('/update/:id').post(async function (req, res) { //Updates a sheet in the database with new values.
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	console.log('sheet update');
	//console.log(req.body)

	let tweetOnAdd = req.body.tweet;// tweet flag
	delete req.body.tweet;

	let sheet = await db.sheetByid(req.params.id);
	let sheetID = sheet.id;
	let clusterID = sheet.cluster;
	
	await db.updateBlogList(sheet, apiKey);
	
	let blogs = await db.getBlogsBySheet(sheetID, true);
	await processClustersPosts(blogs, clusterID, tweetOnAdd);
	res.status(200).send("Schroedinger's Database"); //Chrome was complaining about not getting a response
});

sheetRoutes.route('/process/:id').post(async function (req, res){ //Process call for regular sheet updates, can involve a sheetId or a complete db update. 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let sheet = await db.sheetByid(req.params.id);
	let sheetID = sheet.id;
	let clusterID = sheet.cluster;
	
	await db.updateBlogList(sheet, apiKey);
	
	let blogs = await db.getBlogsBySheet(sheetID, true);
	await processClustersPosts(blogs, clusterID, true);

	res.status(200).send("Schroedinger's Database"); //Chrome was complaining about not getting a response
});

sheetRoutes.route('/:id').get(async function (req, res) { //Potentially smart to better name this call.
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let sheet = await db.sheetByClusterId(req.params.id);
	res.json(sheet);

});
sheetRoutes.route('/getSpreadsheet/:id').get(async function (req, res) {
	//Another google sheets request thing. This is used when getting all the sheet values rather than just a single range. Still don't know if we need both. Probably not. 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let spreadsheetId = req.params.id;
	let result = await db.getGSheet(spreadsheetId, '', '', apiKey);
	res.json(result.data);
});
sheetRoutes.route('/getSheet/:id/:name').get(async function (req, res) { 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let id = req.params.id;
	let name = req.params.name;
	let result = await db.getGSheet(id, name, 'A1:J10', apiKey);
	res.json(result.data);
});
sheetRoutes.route('/loadSheet/:id').get(async function (req, res){
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let sheet = await db.sheetByid(req.params.id);
	let response = await db.getBlogsFromGSheet(sheet, apiKey);
	res.json(response);

});
sheetRoutes.route('/get/:id').get(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let sheet = await db.sheetByid(req.params.id);
	res.json(sheet);
});
sheetRoutes.route('/delete/:id').get(async function (req, res) { //Deletes a sheet from the db 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Sheet.findByIdAndRemove({_id: req.params.id}, async function(err, sheet){
		////////////////////////////////////////////
		/////NOT INTENDED FOR FINAL ITERATION///////
		await Blog.deleteMany({sheet: sheet._id});//
		/////NOT INTENDED FOR FINAL ITERATION///////
		////////////////////////////////////////////
		if(err) res.json(err);
		else res.json('Successfully removed');
	});
});

module.exports = sheetRoutes;