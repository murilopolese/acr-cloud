var crypto = require( 'crypto' );
var request = require( 'request' );
var querystring = require( 'querystring' );
var Promise = require( 'bluebird' );

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
	return new Promise( function( resplve, reject ) {
		this.string_to_sign =
			this.http_method + "\n"
			+ this.http_uri + "\n"
			+ this.access_key + "\n"
			+ this.data_type + "\n"
			+ this.signature_version + "\n"
			+ this.timestamp;
		resolve(
			crypto.createHmac( 'sha1', this.access_secret )
				.update( this.string_to_sign )
				.digest( 'base64' )
		);
	});
}

// Create POST data to send
ACRCloud.prototype.createPostData = function( buffer, signature ) {
	return new Promise( function( resolve, reject ) {
			var data = {
				"sample": buffer.toString( 'base64' ),
				"sample_bytes": buffer.length,
				"access_key": this.access_key,
				"data_type": this.data_type,
				"signature": signature,
				"signature_version": this.signature_version,
				"timestamp": this.timestamp
			};
			resolve({
				array: data,
				query: querystring.stringify( data )
			});
	});
};

// Perform POST
ACRCloud.prototype.post = function( postData ) {
	return new Promise( function( resolve, reject ) {
		request.post(
			'http://' + this.requrl + this.http_uri,
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
	this.timestamp = Date.new();
	return this.createSignature()
		.then( function( signature ) {
			return this.createPostData( buffer, signature );
		})
		.then( this.post );
};

module.exports = ACRCloud;
