require('dotenv').load();

var express = require( 'express' );
var bodyParser = require('body-parser')
var app = express();

var ACRCloud = require( '../acrcloud' );
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

// Body parser with bigger body size limit
var sizeLimit = process.env.SIZE_LIMIT || '5mb';
app.use( bodyParser.json( { limit: sizeLimit } ) );
app.use( bodyParser.urlencoded( { limit: sizeLimit, extended: true } ) );

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

	// HTML/JS base64 src audio file
	// var buffer = req.body.audio.replace(/^data:audio\/wav;base64,/, "");
	var buffer = req.body.audio;
	acr.identify( buffer )
	.then( res.send )
	.catch( function( err ) {
		return req.send({
			success: false,
			msg: "Error identifying audio",
			data: err
		});
	})
});

// Start server
app.listen( process.env.PORT || 3000, function() {
	console.log( 'listening' );
});
