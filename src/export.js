`use strict`;
const ObjectsToCsv = require('objects-to-csv');
const secret = require('./secret.json');
const config = require('./config.json');
let concuret = 100;
let date = new Date();
let dateStriing = date.getDate() + '-' + (date.getMonth()+1) + '-' + date.getFullYear();
let fileOut = 'img/allPosts' + dateStriing + '.csv';

const verbose = true;
let apiKey = secret.API_KEY;
let clusterIndex = {};
const dbName = config.dbName || 'test5';
const h = require('./mongoHelper.js');
const db = new h( 'mongodb://localhost/' + dbName);
const tweetHelper = require('./tweetHelper.js');
const tw = new tweetHelper();

doStuff();

async function doStuff() {
	
	let [index, sheets] = await Promise.all([ db.populateClusterIndex(),  db.getSheets() ]);
	let sheetArray =[];
	clusterIndex = index;
	for (i in sheets) {// iterate through sheets
		let sheedtDeets = sheets[i];

		let sheetValues = await processSheets(sheedtDeets);//do this sheet by sheet so we don't have a race condistion on duplicates
	}
	await processBlogs();
	db.close();
};
function getSheetUpdatesForMongo(sheet, data) {

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
	let result = db.getSheetUpdatesForMongo(sheet, data.values, clusterIndex[sheet.cluster]);
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
	console.log('process blogs');
	let blogs = await db.getAllBlogs(true);
	//let blogs = await db.getBlogsBySheet('5df16c4484ce28ff798e4350', true);

	let keepUnique = {}
	let values = [];
	for (let i = 0; i < blogs.length; i++) {
		let feedArray = [];
		let blg = {}
		for (let j = 0; (j <= concuret && (i+j) < blogs.length); j++){// do concurently
			let blg = blogs[i+j];
			let url = blg.baseUrl;

			if (url in keepUnique) {continue;}// keep blogs in more that one cluster
			let feed = tw.getFeeds(blg); //
			feedArray.push(feed);
		}
		i += concuret;
		let result = await Promise.all(feedArray);

		for (let k = 0; k < result.length; k++) {
			let bloginstance = result[k];
			if (bloginstance == undefined) {continue;}
			for (let l = 0; l < bloginstance.length; l++) {
				values.push(bloginstance[l]);
			}
		}
	}
	
	console.log('Saving ' + values.length + ' to file: ' + fileOut);
	const csv = new ObjectsToCsv(values);
	await csv.toDisk(fileOut);
}
