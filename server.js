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

function options ( req, res ) {
	console.log( "OPTIONS", req.url )
	res.set( {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		'Access-Control-Allow-Headers': "Content-Type"
	} )
	res.send( "Go to POST" )
}

// OPTIONS FOR ALL URLS ()
app.options( '/spotify/token', (req, res) => options(req, res) )
app.options( '/spotify/playlistData', (req, res) => options(req, res) )
app.options( '/spotify/AlbumSearch', (req, res) => options(req, res) )
app.options( '/spotify/transferPlay', (req, res) => options(req, res) )
app.options( '/spotify/recentlyPlayed', (req, res) => options(req,res) )
app.options( '/contact/comments', (req, res) => options(req, res) )

// POST TOKEN REQUEST

// RECEIVES INFO IN JSON OF:#
/*

	body:{
		grant_type: "authorization_code" or "refresh_token"
	}

*/
app.post( '/spotify/token', ( req, res ) => spotifyToken(req, res) )
async function spotifyToken(req, res){
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
				console.log("refresh tok",req.body.refresh_token)
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
							console.log( body )
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
}

// PLAYLIST DATA REQUEST
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
							let localFavArtists = []
							request.get( {
								url: "https://api.spotify.com/v1/me/top/artists",
								headers: fetchCode,
								json: true
							}, ( error, response, favArtists ) => {
								// console.log( favArtists.items )
								Promise.all( favArtists.items.map( artistsData => {
									// let artistsTracks = []
									request.get( {
										url: artistsData.href,
										headers: fetchCode,
										json: true
									}, ( error, response, artist ) => {
										// console.log( artist )
										localFavArtists.push( {
											Name: artist.name,
											ImageUrl: artist.images[ 0 ].url,
											ContextUri: artist.uri,
											Songs: [ {
												Name: "Album",
												Uri: ""
											} ]
										} )
										ServerData = {
											User: ServerData.User,
											Playlists: localPlaylists,
											FavArtists: localFavArtists
										}
										if ( localFavArtists.length == 20 ) {
											// console.log( localFavArtists )
											console.log( ServerData )
											res.status( 200 )
												.send( ServerData )
										}
									} )
								} ) )
							} )
						}
					} )
			} )
		} ) )
	} )

} )

// SEARCH ALBUM REQUEST
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
		// console.log( "albums", albums.albums )
		if ( albums.error ) {
			res.send( "API request error" )
		} else {
			Promise.all( albums.albums.items.map( albumsData => {
				// console.log( "album", albumsData )
				let tracks = []
				// fetch the tracks data for each playlist
				request.get( {
					url: albumsData.href,
					headers: fetchCode,
					json: true
				}, ( error, response, album ) => {
					//console.log( album )
					// make an array of all those tracks
					if ( album ) {
						if ( album.error ) {
							res.send( "API request error" )
						} else {
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
									//console.log( localAlbums )
									if ( localAlbums.length == 20 ) res.send( localAlbums )
								} )
						}
					}
				} )
			} ) )
		}
	} )
} )


// TRANSFER PLAY REQUEST
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

//Starting listening for the events
let port = process.env.PORT || 8888
console.log( `Listening on port ${port}.` )
app.listen( port )
