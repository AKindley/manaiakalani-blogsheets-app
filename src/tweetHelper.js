`use strict`;

const Parser = require('rss-parser');
const HTMLParser = require('node-html-parser');
const fs = require('fs');
const request = require('request');
const parser = new Parser();
const crypto = require('crypto');


let Twit = require('twit');

const charicterLimit = 280;
const imagePath = 'img/';

class tweetHelper {
	constructor() {}

	async getFeeds(blog){ 
		let uri = blog.baseUrl;
		let parser = new Parser();
		return new Promise(await function(resolve, reject) {
			let rssUrl = uri + '/feeds/posts/default?rss';
			parser.parseURL(rssUrl, async function(error, feed) {
				if (error){
					// console.log('parser error:'+rssUrl);
					// console.log(error);
					resolve();
				} else if (feed.items) {
					let result = [];
					for (let i = 0; i < feed.items.length; i++) {
						let post = {
							blogUrl: uri,
							title: feed.items[i].title,
							link: feed.items[i].link,
							author: feed.items[i].author,
							pubDate: feed.items[i].pubDate,
							content: feed.items[i].content,
							snippet: feed.items[i].contentSnippet,
							sheetName: blog.sheet.name,
							clusterName: blog.cluster.name,
							twitter: blog.cluster.twitter,
							blogId: blog['_id']
						}
						if (typeof(post.title) == 'object') {
							post.title = '';
						}
						result.push(post);
					}
						resolve(result); //We did it, yay
				} else {
					//reject(false);
					console.log('failed:'+rssUrl);
					resolve();
				}
			});
		});
	}
	feedConnet(consumerKey, consumerSecret, cluster) {
		if ( cluster.access_token == '' || cluster.access_token == undefined) {
			console.log(cluster.name + ' has no twiiter credentuals, tweet skipped');
			return false;
		}
		let feed = new Twit({
			consumer_key: consumerKey,
			consumer_secret: consumerSecret,
			access_token: cluster.access_token,
			access_token_secret: cluster.access_token_secret
		});
		return feed;
	}
	tweetContent(post){
		if (post.title === undefined || post.title === 'undefined'){ // fix undefined 
			post.title= '';
		}
		if (post.snippet == undefined) {
			console.log('post snippet is undefinmed');
			console.log(post);
		}
		let xmlString = post.content;
		let doc = HTMLParser.parse(xmlString);
		let firstImg = doc.querySelector("img");
		let firstIframe = doc.querySelector("iframe");
		let newTweet = (post.title + ' ' + post.link + ' ' + post.snippet.replace(/\&nbsp;/g, '').trim()).trim();//cleanup
		
		if (!firstImg && firstIframe) {
			let iframeLink = firstIframe.attributes.src;
			if (newTweet.length + 25 >= charicterLimit) {
				newTweet = newTweet.substring(0, (charicterLimit - 25)) + ' ... ' + iframeLink;
			} else {
				newTweet = newTweet + ' ' + iframeLink;
			}
		} else if (newTweet.length >= charicterLimit) {
			newTweet = newTweet.substring(0, (charicterLimit - 4)) + ' ...';
		}
		return {tweetBody: newTweet, img: firstImg};
	}
	skipTweeting(tweetContent) {
		return false;
	}
	async imageRetreve(uri, filename) {
		return new Promise(function(resolve, reject) {
			if (uri.substring(0,35).includes('base64,')) {
				let b64 = uri.split('base64,')[1];
				resolve(b64);
			} else {
				request.head(uri, function(err, res, body) {
					if (err) {reject(err);}
					request(uri).pipe(fs.createWriteStream(filename)).on('close', function() {
						let b64 = fs.readFileSync('./' + filename, {encoding: 'base64'});
						resolve(b64);
					}); 
				});
			}
		});
	}
	async imageUpload(feedConn, options) {
		return new Promise(function(resolve, reject){
			feedConn.post('media/upload', options, function(err, data, response) {
				if (err) {
					console.log(err);
				}
				resolve(data.media_id_string);
			});
		});
	}
	postTweet(feedConn, twitPost) {
		let objectScope = this;
		return new Promise (async function(resolve, reject){

			let tweetCon = await objectScope.tweetContent(twitPost);
			if (objectScope.skipTweeting(tweetCon.newTweet)) {
				resolve('skiped');
			}
			let options = {status: tweetCon.tweetBody};

			if (tweetCon.img) { // tweets with images
				try {
					let imageSrc = tweetCon.img.attributes.src;
					let file = imagePath + crypto.randomBytes(10).toString('hex') + '.png';

				
					let b64 = await objectScope.imageRetreve(imageSrc, file)
					let mediaIdStr = await objectScope.imageUpload(feedConn, {media_data: b64});
					options['media_ids'] = [mediaIdStr];
					if (file){
						fs.unlink(file, (err) => {
							if (err) console.log(err);
						});
					}
				} catch (err) {
					console.log(err);
					console.log(twitPost);
				}
			}


			feedConn.post('statuses/update', options, function(err, data, response){
				if (err) {
					console.log('tweet failed')
					console.log(err.message);
					//reject(err);
				}
				resolve(data);
			});
		});
	}


}

module.exports = tweetHelper;