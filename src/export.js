`use strict`;
const ObjectsToCsv = require('objects-to-csv');
const secret = require('./secret.json');
const config = require('./config.json');
const Parser = require('rss-parser');
let parser = new Parser();
let concuret = 100;
let date = new Date();
let dateStriing = date.getDate() + '-' + (date.getMonth()+1) + '-' + date.getFullYear();
let fileOut = 'img/allPosts' + dateStriing + '.csv';

const verbose = true;
let apiKey = secret.API_KEY;
let clusterIndex = {};
const dbName = config.dbName || 'test5';
const h = require('./mongoHelper.js')
const db = new h( 'mongodb://localhost/' + dbName);
doStuff();

async function getFeeds(uri, blog){ 
	return new Promise(await function(resolve, reject) {
		let rssUrl = uri + '/feeds/posts/default?rss';
		parser.parseURL(rssUrl, async function(error, feed) {
			if (error){
				reject(error);
			} else if (feed.items) {
				let result = [];
				for (let i = 0; i < feed.items.length; i++) {
					let post = {
						blogUrl: uri,
						title: feed.items[i].title,
						link: feed.items[i].link,
						author: feed.items[i].author,
						pubDate: feed.items[i].pubDate,
						sheetName: blog.sheet.name,
						clusterName: blog.cluster.name,
						twitter: blog.cluster.twitter
					}
					if (typeof(post.title) == 'object') {
						post.title = '';
					}
					result.push(post);
				}
					resolve(result); //We did it, yay
			} else {
				reject(false);
			}
		});
	});
}

async function doStuff() {
	await processBlogs()
	db.close();
	return
	
	let [index, sheets] = await Promise.all([ db.populateClusterIndex(),  db.getSheets() ]);
	let sheetArray =[];
	clusterIndex = index;
	for (i in sheets) {// iterate through sheets
		let sheedtDeets = sheets[i];

		let sheetValues = await processSheets(sheedtDeets);//do this sheet by sheet so we don't have a race condistion on duplicates
	}
	await processBlogs();
}

function getSheetUpdatesForMongo(sheet, data ){
	let blogArray = [];
	let dataList = {};
	let startRow = parseInt(sheet.range.charAt(1));
	let dbSheetUrls = clusterIndex[sheet.cluster];
	
	for (let i = 0; i < data.length; i++) {
		let link = data[i][0];
		if (!link){continue;} // skip empty rows
		
		if (!link.match(/^[a-zA-Z]+:\/\//)) { //cleanup link
			link = 'http://' + link;
		}
		let rowNum = startRow + i;
		dataList[link] = 1;
		
		let blogData = {
			baseUrl: link,
			active: true,
			cluster: sheet.cluster,
			sheet: sheet._id,
			automation: sheet.automation,
			row: rowNum
		};
		if (link in dbSheetUrls) {
			if (!dbSheetUrls[link]){ // if a removed blog shows up again
				console.log('reactivate: '+link);
				
				blogArray.push( {
					updateOne: {
						filter: {baseUrl: link, cluster: sheet.cluster},
						update: blogData,
						upsert: true, //important
							setDefaultsOnInsert: true
					}
				} );
			}
			continue;
		}//skip exisiting

		//add new blog
		blogArray.push(db.newBlog(blogData));
	}
	return {'dataList': dataList, 'blogArray': blogArray};
}
async function processSheets(sheet) {
	if (verbose) {console.log('get sheet vals:' + sheet.title );}

	let [dbStuff, data] = await Promise.all([db.getBlogsFromDB(sheet['_id']), db.getBlogsFromGSheet(sheet, apiKey)]);
	
	let dbSheetUrls = dbStuff.dbSheetUrls;
	let result = getSheetUpdatesForMongo(sheet, data);
	let dataList = result.dataList;
	let blogArray = result.blogArray;

	// deactivat removed blogs
	let deactivat = [];
	for (let blag in dbSheetUrls) {
		if (blag in dataList) {
			// skip
		} else {
			deactivat.push(blag);
		}
	}

	if (deactivat.length > 0) {
		await db.blogWriteBackBulk( [{
			updateMany: {
				filter: {baseUrl: {$in: deactivat}, sheet: sheet},
				update: {active: false}
			}
		}], sheet );
	}
	await db.blogWriteBackBulk(blogArray, sheet);
}
async function processBlogs() {
//	let blogs = await db.getAllBlogs(true);
	let blogs = await db.getBlogsBySheet('5df16c4484ce28ff798e4350', true);

	let keepUnique = {}
	let values = [];
	for (let i = 0; i < blogs.length; i++) {
		let feedArray = [];
		let blg = {}
		for (let j = 0; (j <= concuret && (i+j) < blogs.length); j++){// do concurently
			let blg = blogs[i+j];
			let url = blg.baseUrl;

			if (url in keepUnique) {continue;}// keep blogs in more that one cluster
			feedArray.push(getFeeds(url, blg));
		}
		i += concuret;
		let result = await Promise.all(feedArray);

		for (let k = 0; k < result.length; k++) {
			let bloginstance = result[k];
			for (let l = 0; l < bloginstance.length; l++) {
				values.push(bloginstance[l]);
			}
		}
	}

	console.log('Saving ' + values.length + ' to file: ' + fileOut);
	const csv = new ObjectsToCsv(values);
	await csv.toDisk(fileOut);
}
