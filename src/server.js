
const express = require('express'),
	session = require ('express-session'),
	path = require('path'),
	bodyParser = require('body-parser'),
	cors = require('cors'),
	mongoose = require('mongoose'),
	clusterRoutes = require('./expressRoutes/clusterRoutes');
	sheetRoutes = require('./expressRoutes/sheetRoutes');
	authRoutes = require('./expressRoutes/authRoutes');
	mongoose.Promise = global.Promise;
	passport = require('passport');
	mongoose.connect('mongodb://localhost/test5').then(
		() => {console.log('Database is connected')},
		err => {console.log('Can not connect to the database' + err)}
		);
	
	const app = express();
	mongoose.set('useFindAndModify', false);
	app.use(express.static('public'));
	app.use(bodyParser.json());
	app.use(cors());
	app.use(passport.initialize())
	app.use(session({secret: 'keyboard cat', name:'tim', cookie:{secure: false}}));
	app.use('/entries', clusterRoutes);
	app.use('/sheets', sheetRoutes);
	app.use(authRoutes);
	const port = process.env.PORT || 4000;
	
	const server = app.listen(port, function(){
		console.log('Listening on port' + port);
	});
	
	