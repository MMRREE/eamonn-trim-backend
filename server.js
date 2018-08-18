// INITIALISATION
let express = require( 'express' )
let request = require( 'request' )
let querystring = require( 'querystring' )
let bodyParser = require( 'body-parser' )
let fs = require( 'fs' )

let app = express()

app.use( bodyParser.json() )
app.use( express.static( 'public' ) )

// SPOTIFY APP PAGES
let client_id = process.env.CLIENT_ID || null
let client_secret = process.env.CLIENT_SECRET || null

// TOKEN REQUEST

// OPTIONS FOR /SPOTIFY/TOKEN
app.options( '/spotify/token', ( req, res ) => {
	console.log( "OPTIONS /spotify/token" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )

// POST TOKEN REQUEST

// RECEIVES INFO IN JSON OF:#
/*

	body:{
		grant_type: "authorization_code" or "refresh_token"
	}

*/

app.post( '/spotify/token', ( req, res ) => {
	console.log( "POST /spotify/token" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	if ( req.body.grant_type ) {
		switch ( req.body.grant_type ) {
			case "authorization_code":
				// console.log("auth code", req.body.grant_type)
				request.post( {
						url: 'https://accounts.spotify.com/api/token',
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
							'Authorization': "Basic " + ( new Buffer(
									client_id + ':' + client_secret
								)
								.toString( 'base64' ) ),
							'Access-Control-Allow-Origin': "*"
						},
						form: {
							grant_type: "authorization_code",
							code: req.body.code,
							redirect_uri: req.body.redirect_uri
						},
						json: true
					},
					( error, response, body ) => {
						if ( !error && response.statusCode == 200 ) {
							// console.log( body )
							body.refresh_token ? res.status( 200 )
								.send( {
									"AccessToken": body.access_token,
									"RefreshToken": body.refresh_token
								} ) : res.status( 200 )
								.send( {
									"AccessToken": body.access_token
								} )
						} else {
							//console.log(error, response, body)
							res.status( 405 )
								.send( body )
						}
					}
				)
				break
			case "refresh_token":
				// console.log("refresh tok",req.body)
				request.post( {
						url: 'https://accounts.spotify.com/api/token',
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
							'Authorization': "Basic " + ( new Buffer(
									client_id + ':' + client_secret
								)
								.toString( 'base64' ) ),
							'Access-Control-Allow-Origin': "*"
						},
						form: {
							grant_type: "refresh_token",
							refresh_token: req.body.refresh_token
						},
						json: true
					},
					( error, response, body ) => {
						if ( !error && response.statusCode == 200 ) {
							// console.log( body )
							body.refresh_token ? res.status( 200 )
								.send( {
									"AccessToken": body.access_token,
									"RefreshToken": body.refresh_token
								} ) : res.status( 200 )
								.send( {
									"AccessToken": body.access_token
								} )
						} else {
							//console.log(error, response, body)
							res.status( 405 )
								.send( body )
						}
					}
				)
				break
		}
	} else res.status( 405 )
		.send( "FAILED" )
} )

// PLAYLIST DATA REQUEST
app.options( '/spotify/playlistData', ( req, res ) => {
	console.log( "OPTIONS /spotify/playlistData" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )

app.post( '/spotify/playlistData', ( req, res ) => {
	console.log( "POST /spotify/playlistData" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	let fetchCode = { 'Authorization': 'Bearer ' + req.body.access_token }
	let ServerData = {}
	// fetch for the users information
	request.get( {
		url: 'https://api.spotify.com/v1/me',
		headers: fetchCode,
		json: true
	}, ( error, response, body ) => {
		// console.log( body )
		ServerData = {
			User: {
				Name: body.display_name,
				Img: body.images[ 0 ].url,
				Type: body.product,
				Country: body.country,
				Birthday: body.birthdate
			}
		}
	} )

	let localPlaylists = []
	// fetch the users playlists
	request.get( {
		url: 'https://api.spotify.com/v1/me/playlists?limit=50',
		headers: fetchCode,
		json: true
	}, ( error, response, playlists ) => {
		// console.log( playlists )

		Promise.all( playlists.items.map( playlistsData => {
			let tracks = []
			// fetch the tracks data for each playlist
			request.get( {
				url: playlistsData.tracks.href,
				headers: fetchCode,
				json: true
			}, ( error, response, playlist ) => {
				// make an array of all those tracks
				Promise.all( playlist.items.map( trackDatas => {
							tracks = {
								Name: trackDatas.track.name,
								Duration: trackDatas.track.duration_ms / 1000,
								Uri: trackDatas.track.uri
							}
							return tracks
						} )
						// then process the array of all those tracks and include the playlist information with that
					)
					.then( promiseData => {
						tracks = promiseData
						localPlaylists.push( {
							Name: playlistsData.name,
							ImageUrl: playlistsData.images[ 0 ].url,
							ContextUri: playlistsData.uri,
							Songs: tracks
						} )
						ServerData = {
							User: ServerData.User,
							Playlists: localPlaylists
						}
						if ( ServerData.Playlists.length == playlists.total ) {
							// console.log( ServerData )
							res.status( 200 )
								.send( ServerData )
						}
					} )
			} )
		} ) )
	} )

} )

// SEARCH ALBUM REQUEST
app.options( '/spotify/AlbumSearch', ( req, res ) => {
	console.log( "OPTIONS /spotify/AlbumSearch" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )

app.post( '/spotify/AlbumSearch', ( req, res ) => {
	console.log( "POST /spotify/AlbumSearch" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )

	let fetchCode = { 'Authorization': 'Bearer ' + req.body.access_token }

	let localAlbums = []
	// fetch the users playlists
	request.get( {
		url: 'https://api.spotify.com/v1/search?q=' + req.body.search + '&type=album',
		headers: fetchCode,
		json: true
	}, ( error, response, albums ) => {
		//console.log( "albums", albums.albums.items )
		Promise.all( albums.albums.items.map( albumsData => {
			// console.log( "album", albumsData )
			let tracks = []
			// fetch the tracks data for each playlist
			request.get( {
				url: albumsData.href,
				headers: fetchCode,
				json: true
			}, ( error, response, album ) => {
				console.log( album )
				// make an array of all those tracks
				if ( album ) {
					Promise.all( album.tracks.items.map( trackDatas => {
								// console.log( trackDatas )
								tracks = {
									Name: trackDatas.name,
									Duration: trackDatas.duration_ms / 1000,
									Uri: trackDatas.uri
								}
								return tracks
							} )
							// then process the array of all those tracks and include the playlist information with that
						)
						.then( promiseData => {
							tracks = promiseData
							localAlbums.push( {
								Name: albumsData.name,
								ImageUrl: albumsData.images[ 0 ].url,
								ContextUri: albumsData.uri,
								Songs: tracks
							} )
							console.log( localAlbums )
							if ( localAlbums.length == 20 ) res.send( localAlbums )
						} )
				}
			} )
		} ) )
	} )
} )


// TRANSFER PLAY REQUEST
app.options( '/spotify/transferPlay', ( req, res ) => {
	console.log( "OPTIONS /spotify/transferPlay" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )

app.post( '/spotify/transferPlay', ( req, res ) => {
	console.log( "POST /spotify/transferPlay" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	request.get( {
		url: 'https://api.spotify.com/v1/me/player/currently-playing',
		headers: { "Authorization": "bearer " + req.body.access_token }
	}, ( error, response, body ) => {
		// if empty, no song playing, just transfer playback
		if ( response.status == 204 ) {
			request.put( {
				url: "https://api.spotify.com/v1/me/player",
				headers: { "Authorization": "Bearer " + req.body.access_token },
				body: JSON.stringify( {
					"device_ids": [ req.body.device_id ]
				} )
			}, ( error, response, body ) => {
				res.send( "Completed" )
			} )
		}
		// else not empty, something is playing, pause, then transfer after 500 ms to let transfer update
		else {
			request.put( {
				url: "https://api.spotify.com/v1/me/player/pause",
				headers: { "Authorization": "Bearer " + req.body.access_token }
			}, ( error, response, body ) => {
				setTimeout( () => {
					request.put( {
						url: "https://api.spotify.com/v1/me/player",
						headers: { "Authorization": "Bearer " + req.body.access_token },
						body: JSON.stringify( {
							"device_ids": [ req.body.device_id ],
							"play": false
						} )
					}, ( error, response, body ) => {
						res.send( "Completed" )
					} )
				}, 500 )
			} )

		}
	} )
} )


// PREVIOUSLY PLAYED REQUEST
app.options( '/spotify/recentlyPlayed', ( req, res ) => {
	console.log( "OPTIONS /spotify/recentlyPlayed" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )

app.post( '/spotify/recentlyPlayed', ( req, res ) => {
	console.log( "POST /spotify/recentlyPlayed" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	// console.log( req.body.access_token )
	let fetchCode = { 'Authorization': 'Bearer ' + req.body.access_token }
	request.get( {
		url: 'https://api.spotify.com/v1/me/player/recently-played?limit=1',
		headers: fetchCode,
		json: true
	}, ( error, response, body ) => {
		// console.log( body.items[ 0 ] )
		res.send( {
			Song: {
				Context: body.items[ 0 ].context.href,
				Uri: body.items[ 0 ].track.uri
			}
		} )
	} )
} )



// CODE FOR CONTACT PAGE
let comments = JSON.parse( fs.readFileSync( './public/comments.json' ) )

// COMMENTS REQUEST
app.get( '/contact/comments', ( req, res ) => {
	console.log( "GET /contact/comments" )
	// console.log( comments )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( comments )
} )

app.post( '/contact/comments', ( req, res ) => {
	console.log( "POST /contact/comments", req.body )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	if ( req.body.Comment ) comments.Comments.push( req.body.Comment )
	else res.status( 499 )
		.send( "NOT COMPLETED" )
	fs.writeFile( './public/comments.json', JSON.stringify( comments, null, 2 ), ( err ) => {
		//console.log( "completed?", err )
		//console.log( comments )
		res.send( comments )
	} )
} )

app.options( '/contact/comments', ( req, res ) => {
	console.log( "OPTIONS /contact/comments" )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS, GET",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
} )



//Starting listening for the events
let port = process.env.PORT || 8888
console.log( `Listening on port ${port}.` )
app.listen( port )
