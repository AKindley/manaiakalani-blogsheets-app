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
	async newPost(latestPost){
		let post = new Post({
			url: latestPost.link,
			title: latestPost.title,
			date: latestPost.pubDate,
			content: latestPost.content,
			snippet: latestPost.contentSnippet
		});
		post.save().catch(err => {
				console.log('add post error');
				//console.log(err)
		});
		return post;
	}
	
	async getSheets() {
		return await this.queryMongo(Sheet.find({}));
	}
	async sheetByid(id){
		let sheetId =  new ObjectId(id);
		let query = Sheet.find({'_id': sheetId});

		let result = await this.queryMongo(query);
		return result[0];
	}
	async sheetByClusterId(id){
		let query = Sheet.find({ cluster: id });
		let result = await this.queryMongo(query);
		return result;
	}
	async getClusterById(id){
		let query = Cluster.find({ _id: id });
		let result = await this.queryMongo(query);
		return result[0];
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

	async getBlogsFromDB(id) {
		let sheetid =  new ObjectId(id);
		let query = Blog.find({sheet: sheetid});
		let dbSheetUrls = {};
	
		let blogList = await this.queryMongo(query);
		for (let i = 0; i < blogList.length; i++) {
			dbSheetUrls[blogList[i].baseUrl] = blogList[i].active;
		}
		return {'blogList': blogList, 'dbSheetUrls': dbSheetUrls};
	}
	async getBlogsFromGSheet(sheet, apiKey) {
		let result = await this.getGSheet(sheet.spreadsheetId, sheet.name, sheet.range, apiKey);
		let data = result.data;
		return data;
	}
	async getGSheet(spreadsheetId, sname, range, apiKey) {
		let uri = 'https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId;
		if (range !== '') {
			range = '!' + range;
		}
		if (sname !== '') {
			uri = uri + '/values/' + sname + range + '?key=' + apiKey;
		} else {
			uri = uri + '?key=' + apiKey;
		}
		return await axios.get(uri);
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
	async addSheet(data) {
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
						let url,rowNum;
						//console.log('error on write')
						
						if (err.op !== undefined && err.op.row !== undefined && err.op.baseUrl !== undefined) {
							rowNum = err.op.row;
							url = err.op.baseUrl;
							//console.log("URL AND ROW: " + rowNum + " "+ url); //debug
							sheetError.push({"row": rowNum, "error": "Duplicate Blog Url", "url": url }); //Push to error array in sheet
						} else {
							//console.log(Object.keys(err));

							for (let i in err.writeErrors) {
								let error = err.writeErrors[i];
								rowNum = error.err.op.row;
								url = error.err.op.baseUrl;
								//console.log("URL AND ROW: " + rowNum + " "+ url); //debug
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
	async updateBlogList(sheet, apiKey) {
		let sheetId = sheet.id;

		let [dbStuff, data, clusterIndex] = await Promise.all([this.getBlogsFromDB(sheetId), this.getBlogsFromGSheet(sheet, apiKey), this.populateClusterIndex()]);
		let dbSheetUrls = dbStuff.dbSheetUrls;
		let result = this.getSheetUpdatesForMongo(sheet, data.values, clusterIndex[sheet.cluster]);
		
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
			await this.blogWriteBackBulk( [{
				updateMany: {
					filter: {baseUrl: {$in: deactivat}, sheet: sheet},
					update: {active: false}
				}
			}], sheet );
		}
		await this.blogWriteBackBulk(blogArray, sheet);
		console.log('blogWriteBackBulk')
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
	
	async getClusterPosts(clusterID) {
		let cluster =  new ObjectId(clusterID);
		let query = Blog.find({cluster: cluster});
		let blogList = await this.queryMongo(query);
		//console.log(blogList);
		let postUrls = {};
		
		for (let i = 0; i < blogList.length; i++) {
			//console.log(blogList[i]['_id'])
			let id = new ObjectId(blogList[i]['_id']);
			let q2 = Post.find({blog: id});
			let posts = await this.queryMongo(q2);
			for (let j = 0; j < posts.length; j++) {
				postUrls[posts[j]['url']] = '';
			}
		}
		return postUrls;
	}
	
	async getBlogsFromDB(id) {
		let sheetid =  new ObjectId(id);
		let query = Blog.find({sheet: sheetid});
		let dbSheetUrls = {};
	
		let blogList = await this.queryMongo(query);
		for (let i = 0; i < blogList.length; i++) {
			dbSheetUrls[blogList[i].baseUrl] = blogList[i].active;
		}
		return {'blogList': blogList, 'dbSheetUrls': dbSheetUrls};
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
