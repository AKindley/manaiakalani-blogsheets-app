var fs = require('fs'), request = require('request');
var HTMLParser = require('node-html-parser');
//////////////////////////////////////////////
var secret = require('../secret.json');
var apiKey = secret.API_KEY;
var consumerKey = secret.TWITTER_API_KEY;
var consumerSecret = secret.TWITTER_API_KEY_SECRET;
//////////////////////////////////////////////
var express = require('express');
var app = express();
var sheetRoutes = express.Router();
var Sheet = require('../models/sheetStructure');
var Blog = require('../models/blogStructure');
var Post = require('../models/postStructure');
let Parser = require('rss-parser');
var parser = new Parser();
var moment = require('moment');
var Twit = require('twit');
const axios = require('axios');


async function rssParse(uri){ //This thing returns a promise, don't touch any of the async/await stuff unless you know what you're doing thanks
	return new Promise(await function(resolve, reject) {
		rssUrl = uri + '/feeds/posts/default?rss'; //rss url incase we need it for later meddling
		parser.parseURL(rssUrl, async function(error, feed){ //rss-parse npm module, I think it's meant to be async, don't touch it
			if (error){
				console.log(error);
				reject(Error(error));
			}
			else{
				//itemArray.push(feed.items[0]); // Test junk
				resolve(feed.items[0]); //We did it, yay
			}
		});
	});
}
async function grabBlogs(sheet){ //Grabs all the necessary information to process blogs and check for new posts. 
	return new Promise(async function(resolve, reject){
		blogArray = []; //declare the array of information
		var query = {}; //query filter object for the query
		if (sheet == undefined || sheet == null){ //For full database checks
			query.active = true;
			query.automation = true;
		}
		else{ //for single sheet checks
			query.active = true;
			query.sheet = sheet._id;
		}
		for await (const blog of Blog.find(query).populate('cluster')){ //iterate through the query, mongoose creates a cursor()
			let blogInfo = {}; //object that contains the information for each blog
			blogInfo.blog = blog; //blog info from the mongo db
			if (blog.post != undefined){ //if there's a post already referenced by the blog model
				await Post.findById(blog.post, function (err, post){ //search by id, populate won't return a model- which we require. 
					blogInfo.postOld = post; //old post info from the mongo db
				});
			}
			
			blogArray.push(blogInfo); //Pushes the info object into the array
		}
		console.log(blogArray)
		resolve(blogArray); //Return the array of objects
	});
}
function download(uri, filename, callback){ //download function for images
	request.head(uri, function(err, res, body){ //downloads image to root server folder  using uri and filename
		console.log('content-type:', res.headers['content-type']);
		console.log('content-length:', res.headers['content-length']);
		
		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback); //writestream for file saving
	});
}

function tweet(post, cluster){
	let T  = new Twit({
		consumer_key: consumerKey,
		consumer_secret: consumerSecret,
		access_token: cluster.access_token,
		access_token_secret: cluster.access_token_secret
	});
	
	var newTweet = post.title + ' ' + post.url + ' ' + post.snippet;
	if (newTweet.length >= 280){
		newTweet = newTweet.substring(0, 277) + '...';
	}
	var xmlString = post.content;
	var doc = HTMLParser.parse(xmlString);
	let firstImg = doc.querySelector("img");
	let firstIframe = doc.querySelector("iframe");
	//console.log('This is the iframe? ----> ' + firstIframe); // Test Statements
	if ((firstImg == undefined || firstImg == null) && (firstIframe != undefined && firstIframe != null)){
		var iframeLink = firstIframe.attributes.src;
		console.log(typeof(iframeLink));
		if (newTweet.length + 25 >= 280){
			newTweet = newTweet.substring(0, 252) + '... ' + iframeLink;
			//console.log('This is the newtweet ---> ' + newTweet); // Test Statements
		}
		else {
			newTweet = newTweet + ' ' + iframeLink;
		}
	}
	
	if (firstImg == undefined || firstImg == null){ //If there's no image in the post
		//Do "non-media" tweet stuff here as well as iframe source links
		T.post('statuses/update', {status: newTweet}, function(err, data, response){ //normal tweet
			console.log(data);
		});
	}
	else{ //
		//Do media upload + tweet stuff here
		download(firstImg.attributes.src, 'temp.png', function(){ //do a temporary dl of image using link
			//console.log('done: ' + firstImg); //test stuff
			var b64 = fs.readFileSync('./temp.png', {encoding: 'base64'}); //encoded to base64
			T.post('media/upload', { media_data: b64 }, function(err, data, response){ //upload image with Twit
				var mediaIdStr = data.media_id_string;
				var altText = "";
				var meta_params = { media_id: mediaIdStr, alt_text: {text: altText}}
				
				T.post('media/metadata/create', meta_params, function(err, data, response){ //create media metadata with Twit
					if (!err){
						var params = {status: newTweet, media_ids: [mediaIdStr] }
						
						T.post('statuses/update', params, function (err, data, response){ //update status with tweet text and post w/ media. 
							console.log(data);
							fs.unlink('./temp.png', (err) => { //remove temp image storage from server after upload and posting complete
								if (err) throw err;
								// console.log('temp.png was deleted'); //Test stuff
							});
						});
					}
				});
			});
		});
	}
}

async function processBlogs(sheet){
	var blogArray = await grabBlogs(sheet); //wait on all the information calls before running checks. 
	console.log(blogArray);
	var blogOps = []; //array of operations for the bulkWrite at the end
	var postOps = [];
	for (const blogInfo of blogArray){ //iterate over the blog info array
		let blog = blogInfo.blog;
		let latestPost = await rssParse(blog.baseUrl); //new? post from the rss feed of the blog
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
		}
		else{ //otherwise performs date and url checks between the previous and the new post. 
			let postOld = blogInfo.postOld;
			console.log(latestPost.isoDate + ' == ' + postOld.date + '? ' + (moment(latestPost.isoDate).isSame(postOld.date))); //Testing
			console.log('Same url?: ' + (postOld.url == latestPost.link) + '\n'); //Testing
			if (postOld.url != latestPost.link && moment(latestPost.isoDate).isAfter(postOld.date)){ //Checks url and date of old and new post to ensure they're different, and that it's a new post. 
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
			}
			else{
				console.log("No new post for this blog: " + blog.baseUrl + "\n");
			}
			
		}
	}
	if (blogOps.length != 0 && postOps.length != 0){ //ignores this step if there's nothing to update/insert
		Blog.bulkWrite(blogOps).then(res =>{ //Bulk write operation to the mongo db
			console.log("Updated Blogs: " + res.modifiedCount);
		});
		Post.bulkWrite(postOps).then(res => {
			console.log("Added Posts: " + res.insertedCount);
		});
	}
	else{
		console.log("No Updates This Time.")
	}
}


function addBlogs(sheet){ //This function adds the blogs from a sheet to the database. Mongo will drop existing blogs, need to implement a warning function for it. 
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!C1:C10' /*sheet.range*/ + '?key=' + apiKey;
	axios.get(uri).then((response) => {
		blogArray = [];
		let values = response.data.values;
		for (index = 0; index < values.length; index++){
			let uri = values[index][0];
			if (!uri.match(/^[a-zA-Z]+:\/\//)){ //Strips the front portion of a url so that it can be standardised for backend use. 
				uri = 'https://' + uri;
			}
			var blog = new Blog({
				baseUrl: uri,
				dateAdded: Date.now(),
				active: true,
				cluster: sheet.cluster,
				sheet: sheet._id,
				automation: sheet.automation
			});
			
			blogArray.push({
				insertOne: {
					document: blog
				}
			});
		}
		console.log(blogArray);
		Blog.bulkWrite(blogArray);
		
	});
}

sheetRoutes.route('/test').get(async function (req, res){
	let item = await rssParse('http://thisisnotarealblogthatiuse.blogspot.com');
	res.json(item.content)
});

sheetRoutes.route('/add').post(function (req, res) { //Adds sheets to the database w/ url and range etc. Refer to the ./src/models folder for database structure info
	var entry = new Sheet(req.body); //Shouldn't be any weirdness with this and the cluster stuff, complex checks are done more for blog/post objects.
		entry.save().then(
			entry => {
				addBlogs(entry);
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

sheetRoutes.route('/process/:id').post(function (req, res){ //Process call for regular sheet updates, can involve a sheetId or a complete db update. 
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

sheetRoutes.route('/:id').get(function (req, res) { //Potentially smart to better name this call. 
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
sheetRoutes.route('/getSpreadsheet/:id').get(function (req, res){ //Another google sheets request thing. This is used when getting all the sheet values rather than just a single range. Still don't know if we need both. Probably not. 
	let spreadsheetId = req.params.id;
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId + '?key=' + apiKey;
	axios.get(uri).then((response) => {
		res.json(response.data);
	}).catch((error) => {
		console.log(error);
	});
});

sheetRoutes.route('/getSheet/:id/:name').get(function (req, res){ //Honestly I don't know why there's three of them. Review where these are used. 
	let id = req.params.id;
	let name = req.params.name;
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + id + '/values/' + name + '!A1:J10?key=' + apiKey;
	axios.get(uri).then((response) => {
		res.json(response.data);
	}).catch((error) => {
		console.log(error);
	});
});
sheetRoutes.route('/loadSheet/:id').get(function (req, res){
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

sheetRoutes.route('/get/:id').get(function (req, res) {
	Sheet.findById(req.params.id, function(err, sheet) { //gets a sheet from the db by the sheet id
		if(err){
			console.log(err);
		}
		else {
			res.json(sheet);
		}
	});
});

sheetRoutes.route('/update/:id').post(function (req, res) { //Updates a sheet in the database with new values.
	Sheet.findById(req.params.id, async function(err, sheet) {
		if (!sheet) return next (new Error('Could not load Document'));
		else {
			sheet.name = req.body.name;
			sheet.title = req.body.title;
			sheet.range = req.body.range;
			sheet.cluster = req.body.cluster;
			sheet.spreadsheetId = req.body.spreadsheetId;
			sheet.automation = req.body.automation;
			
			await Blog.updateMany({active: true, sheet: sheet._id}, {automation: sheet.automation});
			sheet.save().then(sheet => {
				res.json('Update complete');
			})
			.catch(err => {
				res.status(400).send('Unable to update the database');
			});
		}
	});
});

sheetRoutes.route('/delete/:id').get(function (req, res) { //Deletes a sheet from the db 
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