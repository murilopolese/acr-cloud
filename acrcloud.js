var crypto = require( 'crypto' );
var request = require( 'request' );
var querystring = require('querystring');

var ACRCloud = function( conf ) {
	this.requrl 						= conf.requrl || 'ap-southeast-1.api.acrcloud.com';
	this.http_method 				= conf.http_method || 'POST';
	this.http_uri 					= conf.http_uri || '/v1/identify';
	this.data_type					= conf.data_type || 'audio';
	this.signature_version 	= conf.signature_version || '2';
	this.timestamp					= '1449422734814';

	this.access_key 				= conf.access_key || '';
	this.access_secret			= conf.access_secret || '';
}

// Sign information to send
ACRCloud.prototype.createSignature = function() {
	this.string_to_sign =
		this.http_method + "\n"
		+ this.http_uri + "\n"
		+ this.access_key + "\n"
		+ this.data_type + "\n"
		+ this.signature_version + "\n"
		+ this.timestamp;
	this.signature =
		crypto.createHmac( 'sha1', this.access_secret )
			.update( this.string_to_sign )
			.digest( 'base64' );
	return this.signature;
}

// Create POST data to send
ACRCloud.prototype.createData = function( buffer ) {
	this.timestamp = '1449422734814';
	this.data = {
		"sample": buffer.toString( 'base64' ),
		"sample_bytes": buffer.length,
		"access_key": this.access_key,
		"data_type": this.data_type,
		"signature": this.signature,
		"signature_version": this.signature_version,
		"timestamp": this.timestamp
	};
	this.query = querystring.stringify( this.data );
	return this.data;
};

ACRCloud.prototype.identify = function( buffer, cb ) {
	this.createSignature();
	this.createData( buffer );

	request.post(
		'http://' + this.requrl + this.http_uri,
		{ form: this.data },
		cb
	)
};

module.exports = ACRCloud;
