# ParaoneChess

ParaoneChess is a chess login site where users can play
and record games to their profile page. Users are able to 
edit and delete accounts and view each others pages.

Technologies Used:
	
	Web APIs:

	-YouTube Search API
	-YouTube Player API

	Other APIs:

	-chessboard.js
	-chess.js

	Frameworks:

	-jQuery.js
	-Express.js

	Runtime Environment:

	-Nodejs

	Modules:

	-express
	-pg-promise
	-mustache-express
	-body-parser
	-node-fetch
	-bcrypt
	-method-override

Approach:
	
	1.First steps where drawin out wireframes and such.
	2.Finished login script before anything else.
	3.Created profile and account pages
	4.Create Play and View Games pages.
	5.Create Watch page.

Installation:
	
	go to:

	https://floating-escarpment-40964.herokuapp.com/

unsolved problems:

	-Did not implement change password in app.js

user stories:

	as a user you can create a profile. 
	Save played games.
	View account details and games.
	Edit account details.
	Delete your account.
	Watch videos of chess games in the watch section.

MVP:

	users have good stories above :) /|\
									  |
									  |
	Site is restful.
	Deployed on heroku.com
	Database contains tables users and games
	(users have many games)
	(games have one user)
	Accesses data from YouTube API
	Saves data from chessboard.js to database.
	Has semantically clean HTML and CSS.

Wireframes:

![](wireframe01.jpg)




