

var express = require('express');
var app = express();
var clusterRoutes = express.Router();

var Cluster = require('../models/clusterStructure');

clusterRoutes.route('/add').post(function (req, res) {
	var entry = new Cluster(req.body);
		entry.save().then(
			entry => {
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

clusterRoutes.route('/').get(function (req, res) {
	Cluster.find(function (err, clusters){
		if(err){
			console.log(err);
		}
		else {
			res.json(clusters);
		}
	});
});

clusterRoutes.route('/edit/:id').get(function (req, res) {
	var id = req.params.id;
	Cluster.findById(id, function(err, cluster){
		res.json(cluster);
	});
});

clusterRoutes.route('/update/:id').post(function (req, res) {
	Cluster.findById(req.params.id, function(err, cluster) {
		if (!cluster) return next (new Error('Could not load Document'));
		else {
			cluster.name = req.body.name;
			cluster.twitter = req.body.twitter;
			cluster.numSheets = 2;
			
			cluster.save().then(cluster => {
				res.json('Update complete');
			})
			.catch(err => {
				res.status(400).send('Unable to update the database');
			});
		}
	});
});

clusterRoutes.route('/delete/:id').get(function (req, res) {
	Cluster.findByIdAndRemove({_id: req.params.id}, function(err, cluster){
		if(err) res.json(err);
		else res.json('Successfully removed');
	});
});

module.exports = clusterRoutes;