var crypto = require( 'crypto' );
var request = require( 'request' );
var querystring = require( 'querystring' );
var Promise = require( 'bluebird' );

var log = function() {
	if( process.env.DEBUG && process.env.DEBUG == '1' ) {
		console.log( arguments );
	}
}

var ACRCloud = function( conf ) {
	this.requrl 						= conf.requrl || 'ap-southeast-1.api.acrcloud.com';
	this.http_method 				= conf.http_method || 'POST';
	this.http_uri 					= conf.http_uri || '/v1/identify';
	this.data_type					= conf.data_type || 'audio';
	this.signature_version 	= conf.signature_version || '2';
	this.timestamp					= Date.now();

	this.access_key 				= conf.access_key || '';
	this.access_secret			= conf.access_secret || '';
}

// Sign information to send
ACRCloud.prototype.createSignature = function() {
	log( 'creating signature' );
	var self = this;
	return new Promise( function( resolve, reject ) {
		self.string_to_sign =
			self.http_method + "\n"
			+ self.http_uri + "\n"
			+ self.access_key + "\n"
			+ self.data_type + "\n"
			+ self.signature_version + "\n"
			+ self.timestamp;
		resolve(
			crypto.createHmac( 'sha1', self.access_secret )
				.update( self.string_to_sign )
				.digest( 'base64' )
		);
	});
}

// Create POST data to send
ACRCloud.prototype.createPostData = function( buffer, signature ) {
	log( 'creating post data' );
	var self = this;
	return new Promise( function( resolve, reject ) {
			var data = {
				"sample": buffer.toString( 'base64' ),
				"sample_bytes": buffer.length,
				"access_key": self.access_key,
				"data_type": self.data_type,
				"signature": signature,
				"signature_version": self.signature_version,
				"timestamp": self.timestamp
			};
			resolve({
				array: data,
				query: querystring.stringify( data )
			});
	});
};

// Perform POST
ACRCloud.prototype.post = function( postData ) {
	var self = this;
	log( 'posting' );
	return new Promise( function( resolve, reject ) {
		request.post(
			'http://' + self.requrl + self.http_uri,
			{ form: postData.array },
			function( err, res ) {
				if( err ) {
					return reject( err );
				}
				return resolve( res );
			}
		)
	})
}

// Identify base64 encoded audio file
ACRCloud.prototype.identify = function( buffer ) {
	log( 'identifying' );
	var self = this;
	self.timestamp = Date.now();
	return self.createSignature()
		.then( function( signature ) {
			return self.createPostData( buffer, signature );
		})
		.then( function( data ) {
			return self.post( data );
		})
};

module.exports = ACRCloud;
