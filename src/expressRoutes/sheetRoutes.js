
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
const axios = require('axios');

async function rssParse(uri, itemArray, cluster){ //This thing returns a promise, don't touch any of the async/await stuff unless you know what you're doing thanks
	return new Promise(await function(resolve, reject) {
		rssUrl = uri + '/feeds/posts/default?rss'; //rss url incase we need it for later meddling
		parser.parseURL(rssUrl, async function(error, feed){ //rss-parse npm module, I think it's meant to be async, don't touch it
			if (error){
				console.log(error);
				reject(Error(error));
			}
			else{
				var blog = new Blog({ //Blog object for mongo, leave out post ref
					baseUrl: uri,
					dateAdded: Date.now(),
					active: true,
					cluster: cluster,
				});
				var post = new Post({//Post object created, leave out blog ref
					url : feed.items[0].link,
					title: feed.items[0].title,
					date: feed.items[0].isoDate,
					content: feed.items[0].contentSnippet
				});
				blog.post = post; //Blog and post reference each other before saving
				post.blog = blog; //Ids are generated when the object is created
				blog.save(function (err) {
					if (err) return console.log(err); //Need define situations for first load and actual processing so we're not trying to save new blogs to the database everytime.
					//Don't use this for periodic checks until the separate flows are defined, important to both phases of sheet checking. 
					post.save(function (err){
						if (err) return console.log(err);
					});
				});
				itemArray.push(feed.items[0].title + ' ' + feed.items[0].link + ' ' + feed.items[0].contentSnippet); // Test junk
				resolve('Success'); //We did it, yay
			}
		});
	});
}
async function processValues(values, res, cluster){//Processes the Blogs for twitter posting.
	let blogItems = []; //Test variable, currently this function is for pulling from google sheets.
	for (index = 0; index < values.length; index++) { //iterate through value list
		let uri = values[index][0]; //pulls url value
		if(!uri.match(/^[a-zA-Z]+:\/\//)){ //Strips any http://, https:// stuff
			uri = 'http://' + uri; //creates a uniform version
		}
		await rssParse(uri, blogItems, cluster); //Wait patiently for a returned value from rssParse before returning a response to the user/ sending stuff to twitter. 
	}
	res.json(blogItems); //This is the point where where we'll implement the twitter interaction and begin creating and checking database entries. 
						//Must check for first posts, as well as performing our date and existing post checks
}

sheetRoutes.route('/add').post(function (req, res) { //Adds sheets to the database w/ url and range etc. Refer to the ./src/models folder for database structure info
	var entry = new Sheet(req.body); //Shouldn't be any weirdness with this and the cluster stuff, complex checks are done more for blog/post objects.		
		entry.save().then(
			entry => {
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

sheetRoutes.route('/rss/:id/:cluster').get(function (req, res){ //This is the main call for parsing rss stuff via the webapp. Might need a better name. id = sheetId, cluster = cluster id. SheetId is only necessary for the google sheets information calls. ClusterId is necessary for creating blog objects with correct references. 
	let id = req.params.id;
	let cluster = req.params.cluster; //Putting the http request parameters into a more servicable form
	Sheet.findById(id, function (err, sheet){
		if(err){
			console.log(err);
		}
		else{ //This is all first run at the moment, need to diverge flows for the periodic runs. 
			let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!C2:C10' /*+ sheet.range*/ + '?key=' + apiKey; //Edit this for sheets once done testing, range is fixed
			axios.get(uri).then((response) => { //Check for duplicate blogs in the database here, the google sheets call is unnecessary if performing a check over the database itself
				let values = response.data.values;
				processValues(values, res, cluster); //Process the values from sheets, the function will handle response calls. 
			});
		}
	});
});

sheetRoutes.route('/parse/:id').get(function (req, res){
	Sheet.findById(req.params.id, function(err, sheet) {
		if(err){
			console.log(err);
		}
		else{
			let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!' + sheet.range + '?key=' + apiKey;
			console.log(uri);
			axios.get(uri).then((response) => { //I don't know what I'm using this for. But it's a generic http request for google sheets. Maybe remove later
				res.json(response.data);
			}).catch((error) => {
				console.log(error);
			});
		}
	});
});

sheetRoutes.route('/:id').get(function (req, res) {
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
sheetRoutes.route('/edit/:id').get(function (req, res) { //Why on earth are there two of these? Review where these are used thanks. 
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet){
		if(err){
			console.log(err);
		}
		else{
			res.json(sheet);
		}
	});
});

sheetRoutes.route('/update/:id').post(function (req, res) { //Updates a sheet in the database with new values.
	Sheet.findById(req.params.id, function(err, sheet) {
		if (!sheet) return next (new Error('Could not load Document'));
		else {
			sheet.name = req.body.name;
			sheet.title = req.body.title;
			sheet.range = req.body.range;
			sheet.clusterId = req.body.clusterId;
			sheet.spreadsheetId = req.body.spreadsheetId;
			
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
	Sheet.findByIdAndRemove({_id: req.params.id}, function(err, sheet){
		if(err) res.json(err);
		else res.json('Successfully removed');
	});
});

module.exports = sheetRoutes;