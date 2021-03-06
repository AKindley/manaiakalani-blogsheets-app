

let express = require('express');
let clusterRoutes = express.Router();
let Cluster = require('../models/clusterStructure');
let Sheet = require('../models/sheetStructure');
let Session = require('../models/sessionStructure');

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
clusterRoutes.route('/twitterUnlink/:id').post(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Cluster.findById(req.params.id, async function(err, cluster) {
		cluster.access_token = undefined;
		cluster.access_token_secret = undefined;
		cluster.save().then(cluster => {
			res.json('Update complete');
		}).catch(err => {
			res.status(400).send('Unable to update the database');
		});
	});
});
clusterRoutes.route('/add').post(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let entry = new Cluster(req.body);
		entry.save().then(
			entry => {
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

clusterRoutes.route('/').get(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Cluster.find(async function (err, clusters){
		if (err) {
			console.log(err);
		} else {
			let clusterList = [];
			for (let i = 0; i < clusters.length; i++) {
				let cluster = clusters[i];
				let errList = [];
				await Sheet.find({cluster: cluster},function(err, sheets){
					if (err){console.log(err)}
					else{
						let errCount = 0;
						let errSheet = 0;
						for (let sheet of sheets){
							errCount += sheet.error.length;
							errSheet += 1
						}
						
						errList.push({"sheetCount" : errSheet, "errorCount" : errCount});
						let cleanedCluster = {
							id: cluster._id,
							name: cluster.name,
							twitter: cluster.twitter,
							error: errList
						}
						clusterList.push(cleanedCluster);
					}
				});
			}
			res.json(clusterList);
		}
	});
});

clusterRoutes.route('/edit/:id').get(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	let id = req.params.id;
	Cluster.findById(id, function(err, cluster){
		res.json(cluster);
	});
});

clusterRoutes.route('/update/:id').post(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Cluster.findById(req.params.id, async function(err, cluster) {
		if (!cluster) return next (new Error('Could not load Document'));
		else {
			cluster.name = req.body.name;
			cluster.twitter = req.body.twitter;
			cluster.access_token = req.body.access_token;
			cluster.access_token_secret = req.body.access_token_secret;
			
			cluster.save().then(cluster => {
				res.json('Update complete');
			})
			.catch(err => {
				res.status(400).send('Unable to update the database');
			});
		}
	});
});

clusterRoutes.route('/delete/:id').get(async function (req, res) {
	let auth = await authCheck(req, res);
	if (!auth){
		return;
	}
	Cluster.findByIdAndRemove({_id: req.params.id}, function(err, cluster){
		if(err) res.json(err);
		else res.json('Successfully removed');
	});
});

module.exports = clusterRoutes;