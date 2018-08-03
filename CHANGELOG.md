# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

# Version
## V1.0.0
1.0.0 - 2018-08-03
### Added
- POST handling for '/spotify/token' which handles access token request based on code received when logging in (for spotify api)
- GET handling for 'spotify/playlistData' which handles locating all the information fetching from spotify API server and then returns it neatly to the frontend server, so that no more data than is required is received
- Client ID and client Secret defined on processor environment variables to ensure that open source code does not hand these away to anyone
