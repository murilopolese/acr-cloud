var paused = false;
$( document ).ready( function() {
	loading = $( '.loading' );
	start = $( '.start' );
	listening = $( '.listening' );
	result = $( '.result' );

	button = $( '#play' );
	radioName = $( '#radio-name' );
	message = $( '#listening-message' );

	loading.fadeOut( 500, function() {
		start.fadeIn( 500 );
	});

	start.on( 'click', function() {
		start.fadeOut( 500, function() {
			listening.fadeIn( 500, micInit );
		})
	});

});

var micInit = function() {

	if( !navigator.getUserMedia ) {
		navigator.getUserMedia = navigator.getUserMedia
		|| navigator.webkitGetUserMedia
		|| navigator.mozGetUserMedia
		|| navigator.msGetUserMedia;
	}

	if( navigator.getUserMedia ) {
			navigator.getUserMedia(
				{ audio:true },
				function( e ) {
					getAudio( e );
				},
				function( e ) {
					alert('Error capturing audio.');
				}
			);
	} else	{
		alert('getUserMedia not supported in this browser.');
	}
}

var getAudio = function( e ) {
	leftchannel = [];
	rightchannel = [];
	recordingLength = 0;

	audioContext = window.AudioContext || window.webkitAudioContext;
	context = new audioContext();
	sampleRate = context.sampleRate;
	volume = context.createGain();
	audioInput = context.createMediaStreamSource( e );
	audioInput.connect( volume );

	var bufferSize = 1024;
	recorder = context.createScriptProcessor( bufferSize, 2, 2 );

	recorder.onaudioprocess = function(e){

		if( !paused ) {
			if( recordingLength == 0 ) {
				console.log ( 'recording' );
			}
			var left = e.inputBuffer.getChannelData( 0 );
			var right = e.inputBuffer.getChannelData( 1 );

			leftchannel.push ( new Float32Array( left ) );
			rightchannel.push ( new Float32Array( right ) );
			recordingLength += bufferSize;

			if( recordingLength > 200 * bufferSize ) {
				paused = true;

				var blob = createWav( leftchannel, rightchannel, recordingLength );

				var reader = new window.FileReader();
				reader.readAsDataURL( blob );
				reader.onloadend = function() {
					base64data = reader.result;
					console.log( 'sending audio' );
					message.html( 'Identifying audio' );
					$.post(
						'/',
						{ audio: base64data }
					)
					.done( function( data ) {
						data = JSON.parse( data );
						if( data.status.code == 0 ) {
							message.html( 'Found!' );
							console.log( 'found music', data );
							radioName.html( data.metadata.custom_files[ 0 ].title );
							listening.fadeOut( 500, function() {
								result.fadeIn( 500 );
							});
						} else {
							console.log( 'music not found' );
							message.html( 'Music not found, <br> trying again...' );
							leftchannel = [];
							rightchannel = [];
							recordingLength = 0;
							paused = false;
						}
					})
					.fail( function( err ) {
						console.log( 'err', err );
					})
				}
			}
		}

	// 	if( recordingLength > 300 * bufferSize ) {
	// 		recorder.disconnect( context.destination );
	// 		var blob = createWav( leftchannel, rightchannel, recordingLength );
	//
	// 		var reader = new window.FileReader();
	// 		reader.readAsDataURL( blob );
	// 		reader.onloadend = function() {
	// 			base64data = reader.result;
	// 			console.log( 'sending audio' );
	// 			message.html( 'Identifying audio' );
	// 			$.post(
	// 				'/',
	// 				{ audio: base64data }
	// 			)
	// 			.done( function( data ) {
	// 				data = JSON.parse( data );
	// 				if( data.status.code == 0 ) {
	// 					message.html( 'Found!' );
	// 					console.log( 'found music', data );
	// 					radioName.html( data.metadata.custom_files[ 0 ].title );
	// 					listening.fadeOut( 500, function() {
	// 						result.fadeIn( 500 );
	// 					});
	// 				} else {
	// 					console.log( 'music not found' );
	// 					message.html( 'Music not found, <br> trying again...' );
	// 					leftchannel = [];
	// 					rightchannel = [];
	// 					recordingLength = 0;
	// 					// recorder.connect( context.destination );
	// 				}
	// 			})
	// 			.fail( function( err ) {
	// 				console.log( 'err', err );
	// 			})
	// 		}
	//
	// 	} else {
	// 		var left = e.inputBuffer.getChannelData( 0 );
	// 		var right = e.inputBuffer.getChannelData( 1 );
	//
	// 		leftchannel.push ( new Float32Array( left ) );
	// 		rightchannel.push ( new Float32Array( right ) );
	// 		recordingLength += bufferSize;
	// 	}
	}

	// we connect the recorder
	volume.connect(recorder);
	recorder.connect(context.destination);
}

var mergeBuffers = function( channelBuffer, recordingLength ){
  var result = new Float32Array( recordingLength );
  var offset = 0;
  var lng = channelBuffer.length;
  for( var i = 0; i < lng; i++ ) {
    var buffer = channelBuffer[ i ];
    result.set( buffer, offset );
    offset += buffer.length;
  }
  return result;
}

var interleave = function( leftChannel, rightChannel ){
  var length = leftChannel.length + rightChannel.length;
  var result = new Float32Array( length );

  var inputIndex = 0;

  for( var index = 0; index < length; ){
    result[ index++ ] = leftChannel[ inputIndex ];
    result[ index++ ] = rightChannel[ inputIndex ];
    inputIndex++;
  }
  return result;
}

function writeUTFBytes(view, offset, string){
  var lng = string.length;
  for (var i = 0; i < lng; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

var writeUTFBytes = function( view, offset, string ) {
  var lng = string.length;
  for( var i = 0; i < lng; i++ ){
    view.setUint8( offset + i, string.charCodeAt( i ) );
  }
}

var createWav = function( leftchannel, rightchannel, recordingLength ) {
	// we flat the left and right channels down
	var leftBuffer = mergeBuffers ( leftchannel, recordingLength );
	var rightBuffer = mergeBuffers ( rightchannel, recordingLength );
	// we interleave both channels together
	var interleaved = interleave ( leftBuffer, rightBuffer );

	// create the buffer and view to create the .WAV file
	var buffer = new ArrayBuffer(44 + interleaved.length * 2);
	var view = new DataView(buffer);

	// write the WAV container, check spec at: https://ccrma.stanford.edu/courses/422/projects/WaveFormat/
	// RIFF chunk descriptor
	writeUTFBytes(view, 0, 'RIFF');
	view.setUint32(4, 44 + interleaved.length * 2, true);
	writeUTFBytes(view, 8, 'WAVE');
	// FMT sub-chunk
	writeUTFBytes(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	// stereo (2 channels)
	view.setUint16(22, 2, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 4, true);
	view.setUint16(32, 4, true);
	view.setUint16(34, 16, true);
	// data sub-chunk
	writeUTFBytes(view, 36, 'data');
	view.setUint32(40, interleaved.length * 2, true);

	// write the PCM samples
	var lng = interleaved.length;
	var index = 44;
	var volume = 1;
	for (var i = 0; i < lng; i++){
	    view.setInt16(index, interleaved[i] * (0x7FFF * volume), true);
	    index += 2;
	}

	// our final binary blob that we can hand off
	var blob = new Blob ( [ view ], { type : 'audio/wav' } );
	return blob;
}
