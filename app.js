require('dotenv').load();

var fs = require( 'fs' );
var express = require( 'express' );
var bodyParser = require('body-parser')
var app = express();

var ACRCloud = require( './acrcloud' );
var acr = new ACRCloud({
	access_key: process.env.ACCESS_KEY,
	access_secret: process.env.ACCESS_SECRET
});

// Enable cross domain
app.use( function( req, res, next ) {
	res.header( 'Access-Control-Allow-Origin', '*' );
	res.header( 'Access-Control-Allow-Headers', 'X-Requested-With' );
	next();
});

// Set public folder
app.use( express.static( 'frontend' ) );

// Body parser with bigger body size limit
app.use( bodyParser.json({limit: '50mb'}) );
app.use( bodyParser.urlencoded({
	limit: '50mb',
  extended: true
}));

// POST endpoint to receive the base64 audio
app.post( '/', function( req, res ) {
	// Return error if the audio parameter was not sent
	if( !req.body || !req.body.audio ) {
		return req.send({
			success: false,
			msg: "Must have an audio parameter",
			data: req.body
		});
	}

	var buffer = req.body.audio.replace(/^data:audio\/wav;base64,/, "");;
	acr.identify( buffer, function( err, response ) {
		res.send( response.body );
	})
});

// Start server
app.listen( process.env.PORT || 3000, function() {
	console.log( 'listening' );
});
