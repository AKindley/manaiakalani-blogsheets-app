var secret = require('./secret.json');
var config = require('./config.json');
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
	const clientOrigin = config.clientUrl + ':' + config.clientPort;
	mongoose.connect('mongodb://localhost/test5').then(
		() => {console.log('Database is connected')},
		err => {console.log('Can not connect to the database' + err)}
		);
	
	const app = express();
	mongoose.set('useFindAndModify', false);
	app.use(express.static('public'));
	app.use(bodyParser.json());
	app.use(cors({credentials: true, origin: clientOrigin}));
	app.use(session({secret: secret.SESSION_SECRET, name:'Manaiakalani', cookie:{secure: false}})); //secure should be true
	app.use(passport.initialize());
	app.use(passport.session());
	app.use('/api/entries', clusterRoutes);
	app.use('/api/sheets', sheetRoutes);
	app.use(authRoutes);
	const port = config.serverPort || 4000;
	
	const server = app.listen(port, function(){
		console.log('Listening on port' + port);
	});
	
	