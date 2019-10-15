const secret = require('./secret.json');
const config = require('./config.json');
const express = require('express');
const session = require ('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const clusterRoutes = require('./expressRoutes/clusterRoutes');
const sheetRoutes = require('./expressRoutes/sheetRoutes');
const authRoutes = require('./expressRoutes/authRoutes');
const passport = require('passport');
const overSSL = config.overSSL || false;
const clientOrigin = config.clientUrl + ':' + config.clientPort;
mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb://localhost/test5',{ useNewUrlParser: true }).then(
	() => {console.log('Database is connected')},
	err => {console.log('Can not connect to the database' + err)}
);
	
const app = express();
mongoose.set('useFindAndModify', false);
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(cors({credentials: true, origin: clientOrigin}));
app.use(session({secret: secret.SESSION_SECRET, name:'Manaiakalani', cookie:{secure: overSSL}, resave: true, saveUninitialized: true})); //secure should be true
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/entries', clusterRoutes);
app.use('/api/sheets', sheetRoutes);
app.use(authRoutes);
const port = config.serverProxiPort || 4000;
const server = app.listen(port, function(){
	console.log('Listening on port' + port);
});
	
	