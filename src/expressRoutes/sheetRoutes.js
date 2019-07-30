
var secret = require('../secret.json');
var apiKey = secret.API_KEY;
var express = require('express');
var app = express();
var sheetRoutes = express.Router();
var Sheet = require('../models/sheetStructure');
var Blog = require('../models/blogStructure');
var Post = require('../models/postStructure');
let Parser = require('rss-parser');
var parser = new Parser();
var moment = require('moment');
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
async function processValues(values, res, cluster){//Processes the Blogs for twitter posting.
	//let blogItems = []; //Test variable, currently this function is for pulling from google sheets.
	for (index = 0; index < values.length; index++) { //iterate through value list
		let uri = values[index][0]; //pulls url value
		if(!uri.match(/^[a-zA-Z]+:\/\//)){ //Strips any http://, https:// stuff
			uri = 'http://' + uri; //creates a uniform version
		}
		await rssParse(uri).then(function(result) {
		}).catch(err => {console.log(err)})//Wait patiently for a returned value from rssParse before returning a response to the user/ sending stuff to twitter. 
	}
	res.json("The DB did a thing"); //This is the point where where we'll implement the twitter interaction and begin creating and checking database entries. 
						//Must check for first posts, as well as performing our date and existing post checks
}

async function processBlogs(sheet){ //takes a mongoose sheet model object as input
	if (sheet == undefined || sheet == null){
		var stream = Blog.find({active: true, automation: true}).cursor();
	}
	else{
		var stream = Blog.find({active: true, sheet: sheet._id}).cursor(); //Will replace the other processValues function after being completed and tested.
	}
	
	stream.on('data', async function (blog) { //Takes each document and checks the post to see if it's new. It will tweet out if successful. 
		stream.pause(); //Prevents the stream from advancing before determining the latest post for each blog
		latestPost = await rssParse(blog.baseUrl);
		stream.resume();
		if (blog.post == undefined) { //Handles the first time processing blogs that don't have a post assigned to them. Potentially can be merged with the other code block. 
			let post = new Post({
				url: latestPost.link,
				title: latestPost.title,
				date: latestPost.isoDate,
				content: latestPost.contentSnippet
			});
			post.blog = blog;
			blog.post = post;
			await blog.save(async function (err){
				if (err) {console.log(err)}
				await post.save(async function(err){
					if (err) {console.log(err)}
				});
			});
		}
		else{
			await blog.populate('post', async function (err){ //Populates the post field
				if (blog.post == null){ //Handles an error where a post has been created but not saved to the db due to some error. Blogs assigned to this post will cause errors in the flow
					let post = new Post({ //Might have been fixed by managing the query stream pacing, but will stay here for now. 
						url: latestPost.link,
						title: latestPost.title,
						date: latestPost.isoDate,
						content: latestPost.contentSnippet
					})
					post.blog = blog;
					blog.post = post;
					await blog.save(async function (err){
						if (err){console.log(err)}
						await post.save(async function (err){
							if (err){console.log(err)}
						});
					});
					
				}
				else if ( blog.post.url != latestPost.link && moment(latestPost.isoDate).isAfter(blog.post.date)){ //Posts are only new if the link is different and the time is after the last post. 
					console.log(latestPost.isoDate + ' == ' + blog.post.date + '? ' + (moment(latestPost.isoDate).isSame(blog.post.date))); //Testing
					console.log('Same url?: ' + (blog.post.url == latestPost.link)); //Testing
					let post = new Post({ //Creates a new post objects for the MongoDB
						url: latestPost.link,
						title: latestPost.title,
						date: latestPost.isoDate,
						content: latestPost.contentSnippet
					});
					post.blog = blog;
					blog.post = post;
					stream.pause() //Required to prevent reaching the nodejs stack limit with mongoose operations. 
					await blog.save(async function (err){ //Saves blog with new latest post
						if (err){console.log(err)}
						await post.save(function (err){ //Saves new post object to database
							if (err) {console.log(err)}
						});
					});
					stream.resume();	 //Resume query stream after we've finished saving data to the db
					///////////////////////////////////
					// TWEET THINGS OUT AT THIS POINT//
					///////////////////////////////////
				}
				else{
					console.log(latestPost.isoDate + ' == ' + blog.post.date + '? ' + (moment(latestPost.isoDate).isSame(blog.post.date))); //Testing
					console.log('Same url?: ' + (blog.post.url == latestPost.link)); //Testing
					console.log(blog.baseUrl + ": No new post for this blog"); //Testing
				}
			});
		}
	});
}

function addBlogs(sheet){ //This function adds the blogs from a sheet to the database. Mongo will drop existing blogs, need to implement a warning function for it. 
	let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!C1:C10' /*sheet.range*/ + '?key=' + apiKey;
	axios.get(uri).then((response) => {
		let values = response.data.values;
		for (index = 0; index < values.length; index++){
			let uri = values[index][0];
			if (!uri.match(/^[a-zA-Z]+:\/\//)){ //Strips the front portion of a url so that it can be standardised for backend use. 
				uri = 'http://' + uri;
			}
			var blog = new Blog({
				baseUrl: uri,
				dateAdded: Date.now(),
				active: true,
				cluster: sheet.cluster,
				sheet: sheet._id,
				automation: sheet.automation
			});
			blog.save(function (err){
				if (err) {console.log(err)} 
			});
		}
	});
}


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
		processBlogs();
	}
	else{
		Sheet.findById(id, function (err, sheet){ //Processes all the active blogs in a sheet, essentially the manual blog check. 
			if(err){
				console.log(err);
			}
			else{
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
/*sheetRoutes.route('/edit/:id').get(function (req, res) { //Likely a holdover from duplicating the cluster routes. Not used anywhere
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet){
		if(err){
			console.log(err);
		}
		else{
			res.json(sheet);
		}
	});
});*/

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