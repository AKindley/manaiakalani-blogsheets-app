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

async function rssParse(uri){ //This thing returns a promise, don't touch any of the async/await stuff unless you know what you're doing thanks
	return new Promise(await function(resolve, reject) {
		let rssUrl = uri + '/feeds/posts/default?rss'; //rss url incase we need it for later meddling
		parser.parseURL(rssUrl, async function(error, feed){ //rss-parse npm module, I think it's meant to be async, don't touch it
			if (error){
				//console.log(error);
				reject(Error(error));
			}
			else{
				if(!feed.items[0]){
					reject(false);
				}
				resolve(feed.items[0]); //We did it, yay
			}
		});
	});
}
async function grabBlogs(sheet){ //Grabs all the necessary information to process blogs and check for new posts. 
	console.log("GRABBING BLOGS STARTED");
	return new Promise(async function(resolve, reject){
		let blogArray = []; //declare the array of information
		let query = {}; //query filter object for the query
		if (sheet == undefined || sheet == null){ //For full database checks
			query.active = true;
			query.automation = true;
		}
		else{ //for single sheet checks
			query.active = true;
			query.sheet = sheet._id;
		}
		for await (const blog of Blog.find(query).populate('cluster').populate('sheet')){ //iterate through the query, mongoose creates a cursor()
			let blogInfo = {}; //object that contains the information for each blog
			blogInfo.blog = blog; //blog info from the mongo db
			if (blog.post != undefined){ //if there's a post already referenced by the blog model
				await Post.findById(blog.post, function (err, post){ //search by id, populate won't return a model- which we require. 
					blogInfo.postOld = post; //old post info from the mongo db
				});
			}
			
			blogArray.push(blogInfo); //Pushes the info object into the array
		}
		console.log("FINISHED GRABBING BLOGS");
		resolve(blogArray); //Return the array of objects
	});
}
async function download(uri, filename){ //download function for images
	return new Promise(function(resolve, reject){
		if (uri.substring(0,35).includes('base64,')){
			let b64 = uri.split('base64,')[1];
			resolve(b64);
		}
		else{
			request.head(uri, function(err, res, body){ //downloads image to root server folder  using uri and filename
				console.log('content-type:', res.headers['content-type']);
				console.log('content-length:', res.headers['content-length']);
				if (err) reject(err);
				
				request(uri).pipe(fs.createWriteStream(filename)).on('close', function(){resolve();}); //writestream for file saving
			});
		}
	});
}
async function twitUpload(T, options){
	return new Promise(function(resolve, reject){
		T.post('media/upload', options, function(err, data, response){
			if (err) reject(err);
			resolve(data.media_id_string);
		});
	});
}

async function twitCreate(T, options){
	return new Promise(function(resolve, reject){
		T.post('media/metadata/create', options, function(err, data, response){
			if (err) reject(err);
			resolve(data);
		});
	});
}

async function twitPost(T, options){
	return new Promise (function(resolve, reject){
		T.post('statuses/update', options, function(err, data, response){
			if (err) reject(err);
			resolve(data);
		});
	});
}
async function tweet (post, cluster){
	if ( cluster.access_token == '' || cluster.access_token == undefined){
		console.log(cluster.name + ' has no twiiter credentuals, tweet skipped');
		return 1;
	}
	var T = new Twit({
		consumer_key: consumerKey,
		consumer_secret: consumerSecret,
		access_token: cluster.access_token,
		access_token_secret: cluster.access_token_secret
	});
	
	

	if (post.title === undefined || post.title === 'undefined'){ // fix undefined 
		post.title= '';
	}

	let newTweet = (post.title + ' ' + post.url + ' ' + post.snippet.replace(/\&nbsp;/g, '').trim());
	//console.log(newTweet);
	if (newTweet.length >= 280){
		newTweet = newTweet.substring(0, 277) + '...';
	}
	let xmlString = post.content;
	let doc = HTMLParser.parse(xmlString);
	let firstImg = doc.querySelector("img");
	let firstIframe = doc.querySelector("iframe");
	
	if (!firstImg && firstIframe){
		let iframeLink = firstIframe.attributes.src;
		if (newTweet.length + 25 >= 280){
			newTweet = newTweet.substring(0, 252) + '... ' + iframeLink;
		}
		else {
			newTweet = newTweet + ' ' + iframeLink;
		}
	}
	
	if (!firstImg){
		for (let i = 0; i < 3; i++){
			await twitPost(T, {status: newTweet}).then((data) => {
				i = 3;
			}).catch(err => {
				if (err.code == 187){
					console.log('Duplicate post: '+err);
					i = 3;
				}
				else if (i >= 2){
					console.log(err);
					i = 3;
				}
			});
			//console.log(i);
		}
	}	
	else{
		let file = crypto.randomBytes(10).toString('hex') + '.png';
		let imgData = await download(firstImg.attributes.src, file);
		let b64;
		if (imgData) {
			b64 = imgData;
			file = null;
		}
		else {
			b64 = fs.readFileSync('./' + file, {encoding: 'base64'});
		}
		
		let mediaIdStr = await twitUpload(T, {media_data: b64});
		await twitCreate(T, {media_id: mediaIdStr});
		let params = {status: newTweet, media_ids: [mediaIdStr]};
		
		for (let i = 0; i < 3; i++){
			//console.log('Loop #' + (i + 1) + " on thing: " + newTweet);
			await twitPost(T, params).then((data) => {
				i = 3;
			}).catch((err) => {
				if (err.code == 187){
					console.log(err);
					i = 3;
				}
				else if (i >= 2){
					console.log(err);
					i = 3;
				}
			});
		}
		
		if (file){
			fs.unlink('./' + file, (err) => {
				if (err) throw err;
				console.log(file + ' was deleted');
			});
		}
	}
}
async function processBlogs(mainSheet, tweetBlogs){
	if (processing){
		return console.log("Server is still processing");
	}
	processing = true;
	let clearToTweet;
	let blogArray = await grabBlogs(mainSheet);
	let sheetOps = [];
	let caught;
	let sheet;
	let blogCount = 0;
	let errCount = 0;
	let postCount = 0;
	for (let blogInfo of blogArray){
		caught = false;

		let blog = blogInfo.blog;
		if (!blog.active){
			continue;
		}
		console.log("Processing Blog " + blog.baseUrl);
		sheet = blog.sheet;

		let latestPost = await rssParse(blog.baseUrl).catch((rej) => {
			blog.active = false;
			if (!rej){
				//Do absolutely nothing because every sheet has empty spaces
			}
			else if (rej){
				let errorType = "Bad Url";
				sheetOps.push({ //updates the list of errors on the sheet
					updateOne: { 
						filter: {_id: sheet._id},
						update: {$push: {error: {"row": blog.row, "error": errorType, "url": blog.baseUrl }}}
					}
				});
			}
			caught = true;
		});
		if (caught){continue;}
		if (!blog.post){ //if no post is present, select last post on blog
			let post = new Post({
				url: latestPost.link,
				title: latestPost.title,
				date: latestPost.isoDate,
				content: latestPost.content,
				snippet: latestPost.contentSnippet
			});
			post.blog = blog; //setting refs between the post and the blog
			blog.post = post;
			clearToTweet = true;
			let blogSave = await blog.save().catch((err)=>{
				clearToTweet = false;
				console.log("Something went wrong while saving this blog");
				console.log(err);
			});
			let postSave = await post.save().catch((err)=>{
				clearToTweet = false;
				console.log("Something went wrong while saving this post");
				console.log(err);
			});
			
			if (tweetBlogs && clearToTweet){
				tweet(post, blog.cluster);
			}
		}
		else{
			let postOld = blogInfo.postOld;
			if ( !postOld || (postOld.url != latestPost.link && moment(latestPost.isoDate).isAfter(postOld.date)) ){ //Checks url and date of old and new post to ensure they're different, and that it's a new post. 
				let post = new Post({
					url: latestPost.link,
					title: latestPost.title,
					date: latestPost.isoDate,
					content: latestPost.content,
					snippet: latestPost.contentSnippet
				});
				post.blog = blog; //setting refs between the post and the blog
				blog.post = post;

				clearToTweet = true;
				let blogSave = await blog.save().catch((err)=>{
					clearToTweet = false;
					console.log("Something went wrong while saving this blog");
					console.log(err);
				});
				let postSave = await post.save().catch((err)=>{
					clearToTweet = false;
					console.log("Something went wrong while saving this post");
					console.log(err);

				});
				if (tweetBlogs && clearToTweet){
					tweet(post, blog.cluster);
				}
			} 
			else {
				console.log("No new post for this blog: " + blog.baseUrl + "\n");
			}
			
		}

	}
	if (sheetOps.length){
		if (sheetOps.length > 0){
			Sheet.bulkWrite(sheetOps).then(res => {
				console.log("New Errors: " + res.modifiedCount);
			});
		}
		processing = false;
	}
	else{
		console.log("No Updates This Time.");
		processing = false; 
	}
	
}
/////////////////////////////////////////////////////////
////////////KILL ME MAYBE////////////////////////////////
/////////////////////////////////////////////////////////
async function processBlogsOLD(mainSheet, tweetBlogs){
	if (processing){
		return console.log("Server is still processing");
	}
	processing = true;
	let blogArray = await grabBlogs(mainSheet); //wait on all the information calls before running checks. 
	let blogOps = []; //array of operations for the bulkWrite at the end
	let postOps = [];
	let sheetOps = [];
	let caught;
	let sheet;
	for (let blogInfo of blogArray){ //iterate over the blog info array
		caught = false;

		let blog = blogInfo.blog;
		if (!blog.active){ // skip deactive blogs
			continue;
		}
		console.log("Processing Blog " + blog.baseUrl);
		sheet = blog.sheet;

		let latestPost = await rssParse(blog.baseUrl).catch((rej) => {
			//If there's an issue with parsing the url, we push error updates
			blogOps.push({ //Set blog to inactive so it's not being checked
				updateOne: {
					filter: {_id: blog._id},
					update: {active: false}
				}
			});
			let errorType = "Bad Url";
			if(!rej){
				//errorType = "Empty Blog";
				//do nothing, these errors aren't important
			}
			else{
				sheetOps.push({ //updates the list of errors on the sheet
					updateOne: { 
						filter: {_id: sheet._id},
						update: {$push: {error: {"row": blog.row, "error": errorType, "url": blog.baseUrl }}}
					}
				});
			}
			caught = true;
		}); //new? post from the rss feed of the blog
		if (caught){continue;}
		if (blog.post == undefined || blog.post == null){ //if no blog post is present, select latest post

			let post = new Post({
				url: latestPost.link,
				title: latestPost.title,
				date: latestPost.isoDate,
				content: latestPost.content,
				snippet: latestPost.contentSnippet
			});
			post.blog = blog; //setting refs between the post and the blog
			blog.post = post;
			
			if (tweetBlogs){
				tweet(post, blog.cluster);
			}
			
			postOps.push({ //push insert operation to array
				insertOne: {
					document: post
				}
			});
			blogOps.push({ //push update operation to array
				updateOne: {
					filter: {_id: blog._id},
					update: {post: post}
				}
			});			
		} else { //otherwise performs date and url checks between the previous and the new post. 
			let postOld = blogInfo.postOld;
			if ( postOld == null || (postOld.url != latestPost.link && moment(latestPost.isoDate).isAfter(postOld.date)) ){ //Checks url and date of old and new post to ensure they're different, and that it's a new post. 
				let post = new Post({
					url: latestPost.link,
					title: latestPost.title,
					date: latestPost.isoDate,
					content: latestPost.content,
					snippet: latestPost.contentSnippet
				});
				post.blog = blog;
				blog.post = post;
				
				tweet(post, blog.cluster);
				
				postOps.push({ //push insert operation to array
					insertOne: {
						document: post
					}
				});
				blogOps.push({ //push update operation to array
					updateOne: {
						filter: {_id: blog._id},
						update: {post: post}
					}
				});
			} else {
				console.log("No new post for this blog: " + blog.baseUrl + "\n");
			}
			
		}
	}
	if (blogOps.length || postOps.length || sheetOps.length){
		if (blogOps.length > 0){ //ignores this step if there's nothing to update/insert
			Blog.bulkWrite(blogOps).then(res =>{ //Bulk write operation to the mongo db
				console.log("Updated Blogs: " + res.modifiedCount);
			});
		}
		if (postOps.length > 0){
			Post.bulkWrite(postOps).then(res => {
				console.log("Added Posts: " + res.insertedCount);
			});
		}
		if (sheetOps.length > 0){
			Sheet.bulkWrite(sheetOps).then(res => {
				console.log("New Errors: " + res.modifiedCount);
			});
		}
		processing = false;
	}
	else{
		console.log("No Updates This Time.");
		processing = false; 
	}
}
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

function addBlogs(sheet, tweetBlogs){ //This function adds the blogs from a sheet to the database. Mongo will drop existing blogs, need to implement a warning function for it. 
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!' + sheet.range + '?key=' + apiKey;
	axios.get(uri).then((response) => {
		let blogArray = [];
		let values = response.data.values;
		let startRow = parseInt(sheet.range.charAt(1));
		let sheetError = false;
		for (let index = 0; index < values.length; index++){
			let uri = values[index][0];
			let rowNum = startRow + index;
			if (!uri){
				//sheet.error.push({"row": rowNum, "error": "Missing Url", "url": "None"});
				sheetError = true;
				continue;
			}
			if (!uri.match(/^[a-zA-Z]+:\/\//)){
				uri = 'http://' + uri;
			}
			var blog = new Blog({
				baseUrl: uri,
				dateAdded: Date.now(),
				active: true,
				cluster: sheet.cluster,
				sheet: sheet._id,
				automation: sheet.automation,
				row: rowNum
			});
			
			blogArray.push({
				insertOne: {
					document: blog
				}
			});
		}
		console.log(blogArray);
		
		
		Blog.bulkWrite(blogArray, {ordered: false}, function (err, res) {
			if (err){
				sheetError = true;
				for (errs in err.writeErrors){
					if(!errs.err){
						console.log(errs);
						continue;
					}
					let rowNum = errs.err.op.row;
					let url = errs.err.op.baseUrl;
					sheet.error.push({"row": rowNum, "error": "Duplicate Blog Url", "url": url });
				}
			} else {
				console.log("No issues adding " + res.insertedCount + " blogs");
			}
			if (sheet.error.length > 0){
				sheet.save().then(res =>{
					console.log("Errors pushed to sheet");
					processBlogs(sheet, tweetBlogs);
				});
			} else{
				processBlogs(sheet, tweetBlogs);
			}
		});
	});
}

async function updateBlogs(sheet){
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!' + sheet.range + '?key=' + apiKey;
	let blogOps = [];
	await axios.get(uri).then((res) => {
		let values = res.data.values;
		let uris = [];
		let startRow = parseInt(sheet.range.charAt(1));
		let rowNum = startRow;
		
		for (value in values){
			let uri = value[0];
			if (uri === '' || uri == undefined){
				//sheet.error.push({"row": rowNum, "error": "Missing Url", "url": "None"});
				rowNum++;
				continue;// just skip
			}
			if (!uri.match(/^[a-zA-Z]+:\/\//)){ //Strips the front portion of a url so that it can be standardised for backend use. 
				uri = 'https://' + uri;
			}
			uris.push(uri);

			blogOps.push({ //"Update" if exists, insert if it doesn't
				updateOne: {
					filter: {baseUrl: uri, sheet: sheet},
					update: {
						baseUrl: uri,
						active: true,
						cluster: sheet.cluster,
						sheet: sheet._id,
						automation: sheet.automation,
						row: rowNum
					},
					upsert: true, //important
					setDefaultsOnInsert: true
				}
			});
			rowNum++;
		}
		blogOps.push({ //Set all urls no longer present in the sheet to inactive so that they're not checked for posts.
			updateMany: {
				filter: {baseUrl: {$nin: uris}, sheet: sheet},
				update: {active: false}
			}
		});
		
		Blog.bulkWrite(blogOps, {ordered: false}, function (err, res){ //bulkWrite all operations
			if (err){ 

				for (errs in err.writeErrors){
					// let rowNum = errs.op.u.$set.row;
					// let url = errs.op.u.$set.baseUrl;
					let rowNum = errs.op;
					let url = errs.op;
				
				//Seems to be different error formats for inserts/upserts
					console.log("URL AND ROW: " + rowNum + " "+ url); //debug
					sheet.error.push({"row": rowNum, "error": "Duplicate Blog Url", "url": url }); //Push to error array in sheet
				}
				/*sheet.save().then(res => {
					console.log("Errors pushed to sheet");
				});*/
			}
			else { //if no errors occur
				console.log("No issues adding " + res.insertedCount + " blogs");
				console.log("No issues modifying " + res.modifiedCount + " blogs");
			}
			if (sheet.error.length > 0){
				sheet.save().then(res => {
					console.log('Errors pushed to sheet');
					processBlogs(sheet);
				});
			}
			else{
				processBlogs(sheet);
			}
		});
	});
	
	//Start reprocessing the sheet here to check for new errors and blog posts.
}

sheetRoutes.route('/scheduleTrigger').get(function (req, res){
	//http://127.0.0.1:4000/api/sheets/scheduleTrigger
	if ( req.headers.authorization === config.scheduleKey ){
		processBlogs();
	}
	res.end();
});

sheetRoutes.route('/add').post(async function (req, res) { //Adds sheets to the database w/ url and range etc. Refer to the ./src/models folder for database structure info
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let tweetOnAdd = req.body.tweet;
	delete req.body.tweet;
	
	var entry = new Sheet(req.body); //Shouldn't be any weirdness with this and the cluster stuff, complex checks are done more for blog/post objects.
		entry.save().then(
			entry => {
				addBlogs(entry, tweetOnAdd);
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

sheetRoutes.route('/process/:id').post(async function (req, res){ //Process call for regular sheet updates, can involve a sheetId or a complete db update. 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let id = req.params.id; //Need to implement per cluster. 
	if (id == 'complete'){ //Processes the entire collection of blogs, except for inactive or manual update blogs. 
		//processBlogs();
		processBlogs();
	}
	else{
		Sheet.findById(id, function (err, sheet){ //Processes all the active blogs in a sheet, essentially the manual blog check. 
			if(err){
				console.log(err);
			}
			else{
				//processBlogs(sheet);
				processBlogs(sheet);
			}
		});
	}
	res.status(200).send("Schroedinger's Database"); //Chrome was complaining about not getting a response
});

sheetRoutes.route('/:id').get(async function (req, res) { //Potentially smart to better name this call.
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let id = req.params.id;
	Sheet.find({ cluster: id },function (err, sheet){//Requests sheets from the db by their cluster.
		if(err){
			console.log(err);
		}
		else {
			res.json(sheet);
		}
	});
});
sheetRoutes.route('/getSpreadsheet/:id').get(async function (req, res){ //Another google sheets request thing. This is used when getting all the sheet values rather than just a single range. Still don't know if we need both. Probably not. 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let spreadsheetId = req.params.id;
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '?key=' + apiKey;
	axios.get(uri).then((response) => {
		res.json(response.data);
	}).catch((error) => {
		console.log(error);
	});
});

sheetRoutes.route('/getSheet/:id/:name').get(async function (req, res){ //Honestly I don't know why there's three of them. Review where these are used. 
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let id = req.params.id;
	let name = req.params.name;
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + name + '!A1:J10?key=' + apiKey;
	axios.get(uri).then((response) => {
		res.json(response.data);
	}).catch((error) => {
		console.log(error);
	});
});
sheetRoutes.route('/loadSheet/:id').get(async function (req, res){
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Sheet.findById(req.params.id, function(err, sheet) { //We don't store the sheet values in the db, so we request them from google when editing a sheet. 
		if(err){
			console.log(err);
		}
		else {
			let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!A1:J10?key=' + apiKey;
			axios.get(uri).then((response) => {
				res.json(response.data);
			}).catch((error) => {
				console.log(error);
			});
		}
	});
});

sheetRoutes.route('/get/:id').get(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Sheet.findById(req.params.id, function(err, sheet) { //gets a sheet from the db by the sheet id
		if(err){
			console.log(err);
		}
		else {
			res.json(sheet);
		}
	});
});

sheetRoutes.route('/update/:id').post(async function (req, res) { //Updates a sheet in the database with new values.
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Sheet.findById(req.params.id, async function(err, sheet) {
		if (!sheet) return next (new Error('Could not load Document'));
		else {
			sheet.name = req.body.name;
			sheet.title = req.body.title;
			sheet.range = req.body.range;
			sheet.cluster = req.body.cluster;
			sheet.spreadsheetId = req.body.spreadsheetId;
			sheet.sheetId = req.body.sheetId;
			sheet.automation = req.body.automation;
			sheet.error = []; //reset errors on sheet update - will be repopulated if errors still exist
			
			//await Blog.updateMany({active: true, sheet: sheet._id}, {automation: sheet.automation});
			sheet.save().then(sheet => {
				res.json('Update complete');
				updateBlogs(sheet); //Update call for error checking and blog updates
			})
			.catch(err => {
				res.status(400).send('Unable to update the database');
			});
		}
	});
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