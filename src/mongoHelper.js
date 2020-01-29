`use strict`;
const ObjectId = require('mongodb').ObjectId;
const mongoose = require('mongoose');
const axios = require('axios');

let Sheet = require('./models/sheetStructure');
let Blog = require('./models/blogStructure');
let Post = require('./models/postStructure');
let Cluster = require('./models/clusterStructure');

class mongoHelper {
	constructor(connString) {
		mongoose.Promise = global.Promise;

		mongoose.set('useCreateIndex', true);
		mongoose.connect(connString,{ useNewUrlParser: true });
		let db = mongoose.connection;
		db.on('error', console.error.bind(console, 'connection error:'));
		db.once('open', function() {
			console.log('db connected');
		});
	}
	async queryMongo(query) {
		let result =  await query.exec();
		return result;
	}
	async getSheets() {
		return await this.queryMongo(Sheet.find({}));
	}
	async populateClusterIndex() {
		let index = {};
		let query = Blog.find({}).populate('cluster');
		let blogList = await this.queryMongo(query);
		for (let i in blogList) {
			let row = blogList[i];
			let clusterId = row.cluster['_id'];
			let link = row.baseUrl;
			if (clusterId in index) {
				index[clusterId][link] = row.active;
			} else {
				index[clusterId] = {[link]: row.active};
			}
		}
		return index;
	}
	async getBlogsFromDB(blogQuery) {
		let sheetid =  new ObjectId(blogQuery);
		let query = Blog.find({sheet: sheetid});
		let dbSheetUrls = {};
	
		let blogList = await this.queryMongo(query);
		for (let i = 0; i < blogList.length; i++) {
			dbSheetUrls[blogList[i].baseUrl] = blogList[i].active;
		}
		return {'blogList': blogList, 'dbSheetUrls': dbSheetUrls};
	}
	async getBlogsFromGSheet(sheet, apiKey) {
		let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + sheet.spreadsheetId + '/values/' + sheet.name + '!' + sheet.range + '?key=' + apiKey;
		let result = await axios.get(uri);
		let data = result.data.values;
		return data;
	}
	newBlog(blogData) {
		blogData.dateAdded = Date.now();
		
		let blog = new Blog(blogData);
		
		return {insertOne: 
			{ document: blog },
			upsert: true, //important
			setDefaultsOnInsert: true
		}
	}
	addSheet(data) {
		let entry = new Sheet(data);
		entry.save().catch(err => {
				console.log('add sheet error');
				console.log(err)
		});
		return entry;
	}
	async blogWriteBackBulk(writeArray, sheet) {
		if (writeArray.length > 0) {
			let sheetError = [];
			return new Promise((resolve,reject) => {
				Blog.bulkWrite(writeArray, {ordered: false}, function (err, res) {
					if (err) {
						console.log('error')
						console.log(err);
						let writeErrors = [];
						if (err.writeErrors) {
							writeErrors = err.writeErrors;
							for (let errs in writeErrors) {
								//console.log(writeErrors[errs]);
								let rowNum = writeErrors[errs].err.op.u['$set'].row;
								let url = writeErrors[errs].err.op.u['$set'].baseUrl;
								console.log("URL AND ROW: " + rowNum + " "+ url); //debug
								sheetError.push({"row": rowNum, "error": "Duplicate Blog Url", "url": url }); //Push to error array in sheet
							}
						}
						if (sheetError.length > 0) {
							sheet.error = sheetError;
							sheet.save().then(res => {
								console.log('Errors pushed to sheet:' + sheetError.length );
							});
						}
					}
					if (res) {
						console.log("No issues adding " + res.insertedCount + " blogs");
						console.log("No issues modifying " + res.modifiedCount + " blogs");
					}
					resolve(res);
				});
			});
		}
	}
	
	async getAllBlogs(activeOnly) {
		let filter = {}
		if (activeOnly){
			filter = {active:true, automation: true};
		}
		let query = Blog.find(filter).populate('cluster').populate('sheet');
		return await this.queryMongo(query);
	}
	async getBlogsBySheet(sheet_id, activeOnly) {
		let sheetid = new ObjectId(sheet_id);
		let filter = {sheet: sheetid}
		if (activeOnly){
			filter = {active:true, automation: true, sheet: sheetid};
		}
		let query = Blog.find(filter).populate('cluster').populate('sheet');
		return await this.queryMongo(query);
	}
	async getBlogsByCluster( cluster_id, activeOnly) {
		let clusterid =  new ObjectId(cluster_id);
		let filter = {cluster: clusterid}
		if (activeOnly){
			filter = {active:true, automation: true, cluster: clusterid};
		}
		let query = Blog.find(filter).populate('cluster').populate('sheet');
		return await this.queryMongo(query);
	}
	
	getSheetUpdatesForMongo(sheet, data, dbSheetUrls){
		if (!dbSheetUrls) {
			dbSheetUrls = {};
		}
		let blogArray = [];
		let dataList = {};
		let startRow = parseInt(sheet.range.charAt(1));
		//let dbSheetUrls = clusterIndex[sheet.cluster];
	
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
			blogArray.push(this.newBlog(blogData));
		}
		return {'dataList': dataList, 'blogArray': blogArray};
	}
	close() {
		mongoose.connection.close();
		console.log('db close');
	}
}

module.exports = mongoHelper;
