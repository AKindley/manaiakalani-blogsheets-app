
var secret = require('../secret.json');
var apiKey = secret.API_KEY;
var express = require('express');
var app = express();
var sheetRoutes = express.Router();
var Sheet = require('../models/sheetStructure');
const axios = require('axios');

sheetRoutes.route('/add').post(function (req, res) {
	var entry = new Sheet(req.body);
		entry.save().then(
			entry => {
				res.status(200).json({'entry': 'Entry added successfully'});
			}).catch(err => {
				res.status(400).send('Unable to save to database');
			});
});

sheetRoutes.route('/parse/:id').get(function (req, res){
	Sheet.findById(req.params.id, function(err, sheet) {
		if(err){
			console.log(err);
		}
		else{
			let uri = 'https://sheets.googleapis.com/v4/spreadsheets/'+ sheet.spreadsheetId + '/values/' + sheet.name + '!' + sheet.range + '?key=' + apiKey;
			console.log(uri);
			axios.get(uri).then((response) => {
				res.json(response.data);
			}).catch((error) => {
				console.log(error);
			});
		}
	});
});

sheetRoutes.route('/:id').get(function (req, res) {
	let id = req.params.id;
	Sheet.find({ clusterId: id },function (err, sheet){
		if(err){
			console.log(err);
		}
		else {
			res.json(sheet);
		}
	});
});

sheetRoutes.route('/get/:id').get(function (req, res) {
	Sheet.findById(req.params.id, function(err, sheet) {
		if(err){
			console.log(err);
		}
		else {
			res.json(sheet);
		}
	});
});
sheetRoutes.route('/edit/:id').get(function (req, res) {
	var id = req.params.id;
	Sheet.findById(id, function(err, sheet){
		res.json(sheet);
	});
});

sheetRoutes.route('/update/:id').post(function (req, res) {
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

sheetRoutes.route('/delete/:id').get(function (req, res) {
	Sheet.findByIdAndRemove({_id: req.params.id}, function(err, sheet){
		if(err) res.json(err);
		else res.json('Successfully removed');
	});
});

module.exports = sheetRoutes;