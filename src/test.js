`use strict`;
const ObjectsToCsv = require('objects-to-csv');
const secret = require('./secret.json');
const config = require('./config.json');
let consumerKey = secret.TWITTER_API_KEY;
let consumerSecret = secret.TWITTER_API_KEY_SECRET;
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
const tweetHelper = require('./tweetHelper.js');
const tw = new tweetHelper();
doStuff();

async function doStuff() {
	let blogs = await db.getBlogsBySheet('5df16c4484ce28ff798e4350', true);
	let cluster = blogs[0].cluster;
	let feedConect = await tw.feedConnet(consumerKey, consumerSecret, cluster) ;
	//console.log(blogs)
	let url = blogs[0].baseUrl;
	//console.log(url);

	let feeds = await tw.getFeeds(url, blogs[0]);
	let content = tw.tweetContent(feeds[0]);
	tw.postTweet(feedConect, feeds[0]);
	


	db.close();
};


