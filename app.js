const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const mustacheExpress = require('mustache-express');
const bodyParser = require("body-parser");
const session = require('express-session');
const curl = require('curlrequest');
const fetch = require('node-fetch');

/* BCrypt stuff here */
const bcrypt = require('bcrypt');
const salt = bcrypt.genSalt(10);

// app id and port
const APP_ID = process.env.APIKEY;
const PORT = process.env.PORT || 3000;

// alertUser() creates returns a path with an alert attached
// to the req.query
var alertUser = function(string, path){
	var alert = encodeURIComponent(string);
	if(!path) path = '/';
	return path+'?alert='+alert;
};

// configurations for modules
app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use("/public", express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var mo = require('method-override');
app.use(mo('__method'));

app.use(session({
	secret: 'theTruthIsOutThere51',
	resave: false,
	saveUninitialized: true,
	cookie: {
		secure: false
	}
}));

var db = pgp(process.env.DATABASE_URL || 'postgres://student_01@localhost:5432/auth_xfiles');

// Starter up!
app.listen(PORT, function () {
	console.log('Alive on port '+PORT);
});

// Home page
app.get('/', function(req, res){
	var logged_in, email, user;
	var alert = req.query.alert;
	if(req.session.user){ // checks to see if user is logged in
		logged_in = true; // set logged in to true
		user = req.session.user;// keep reference to user info
	}

  // getting players from database
  // allowing players to see other's profiles
  db.any('SELECT * FROM users')
  .then(function(users){
    var data = {
      alert : alert,
      logged_in : logged_in,
      user: user,
      users: users
    };
  	res.render('index', data); //render homepage sending data
  });
});

// user's account page
app.get('/user/:id/account', function(req, res){
	var logged_in, user, alert;
	var page_id = req.params.id;

	if(req.session.user){ // check to see if user is logged in
		logged_in = true;
		user = req.session.user;
    // only proceed if user.id match params.id
		if(Number(user.id) === Number(page_id)){
		var data = {
			logged_in : logged_in,
			user: user
		};
		res.render('user/account', data);
		}else{
			res.redirect(alertUser('You must log in.'));
		}
	}else{
		res.redirect(alertUser('You must log in.'));
	}
});

// profile pages
app.get('/user/:id', function(req, res){
	var alert = req.query.alert;
	var logged_in;
	var page_id = req.params.id;
	if(req.session.user){ // checking login data for header.html
		logged_in = true;
	}
	db.one('SELECT * FROM users WHERE id=$1', [page_id])
	.catch(function(err){
		res.redirect(alertUser('GET failed!'));
	}).then(function(user){
		user.logged_in = logged_in;
		user.alert = alert;
    user.user = req.session.user; // data for header.html
		res.render('user/index', user);
	});
});

// changepassword page
app.get('/user/:id/changepassword', function(req, res){
  var user_id = req.params.id;
  var user = req.session.user;
  console.log(user.id);
  console.log(user_id);
  if(user.id == user_id){
    res.render('user/changepassword', user);
  }else{
    res.redirect(alertUser('You must log in!'));
  }
});

// changing user info
app.put('/user', function(req, res){
  var alert;
  var formdata = req.body;
  if(req.session.user){
    var user_id = req.session.user.id;
    db.none('UPDATE users SET (email, username)=($2, $3) WHERE id=$1', [user_id, formdata.email, formdata.username])
    .catch(function(err){
      res.redirect(alertUser('Unable to set user data'));
    })
    .then(function(data){
      res.redirect(alertUser('User data has been updated'));
    });
  }
});

// deleting user from database
app.delete('/user', function(req, res){
  if(req.session.user){ // only allow if user is logged in.
    var user_id = req.session.user.id;
    //first delete references to user.id
    db.none('DELETE FROM games WHERE user_id=$1', [user_id])
    .catch(function(err){
      console.log(err);
      res.redirect(alertUser('Could not delete user\'s games.'));
    })
    .then(function(data){
      // .then delete user from database
      db.none('DELETE FROM users WHERE id=$1', [user_id])
      .catch(function(err){
        console.log(err);
        res.redirect(alertUser('Could not delete user.'));
      })
      .then(function(data){
        // .then kill user's session
        req.session.destroy(function(err){
          res.redirect(alertUser('User has been deleted'));
        });
      });
    });
  }else{
    res.redirect(alertUser('You must be logged in.'));
  }
});

// login
app.post('/login', function(req, res){
  var data = req.body;

  db.one('SELECT * FROM users WHERE email=$1', [data.email])
  .catch(function(user){
    res.redirect(alertUser('User email or password is incorrect.'));
  })
  .then(function(user){
    bcrypt.compare(data.password, user.password_digest, function(err, cmp){
      if(cmp){
        req.session.user = user;
        res.redirect(alertUser('You have logged in.'));
      }else{
        res.redirect(alertUser('User email or password is incorrect.'));
      }
    });
  });
});

// sign up page
app.get('/signup', function(req, res){
  res.render('signup/index');
});

// adding user to database
app.post('/signup', function(req, res){
  var data = req.body;
  bcrypt.hash(data.password, 10, function(err, hash){
    // RETURNING * to start user session upon creation.
    db.one('INSERT INTO users (id, username, email, password_digest) VALUES (DEFAULT, $1, $2, $3) RETURNING *', [data.username, data.email, hash])
      .catch(function(err){
        res.redirect(alertUser('User could not be created'));
      })
      .then(function(user){
        // starting user's session when created
        req.session.user = user;
        // sending user to profile page
        res.redirect(alertUser('User created', '/user/'+user.id));
      });
  });
});

// logout
app.get('/logout', function(req, res){
  req.session.destroy(function(err){
        res.redirect(alertUser('User logged out.'));
  });
});

// play page
app.get('/play', function(req, res){
  var logged_in;
  var user = req.session.user;
  if(user){ // allow user to play if logged in
    logged_in = true;
    var data = {
      logged_in : logged_in,
      user : user
    };
    res.render('play', data);
  }else{
    res.redirect(alertUser('You must log in to play.'));
  }
});

// saving player's games
app.post('/save', function(req, res){
  var movelist = req.body.mygame; // moves in standard notation
  var fenlist = req.body.fenlist; // moves in FEN notation
  var user = req.session.user; // user data
  db.none('INSERT INTO games (id, movelist, fenlist, user_id) VALUES (DEFAULT, $1, $2, $3)', [movelist, fenlist, user.id])
  .catch(function(err){
    res.redirect(alertUser('Game could not be saved.'));
  }).then(function(data){
    //sending user's to their profile page if save is success
    res.redirect(alertUser('Your game was saved successfully.','/user/'+user.id));
  });
});

// page of user's games
app.get('/games/:id', function(req, res){
  var user_id = req.params.id, logged_in, user;
  if(req.session.user){ // only allow user's who are logged in
    logged_in = true;
    user = req.session.user;

    db.any('SELECT * FROM games WHERE user_id=$1', [user_id])
    .catch(function(err){
      res.redirect(alertUser('Could not GET games for user'));
    })
    .then(function(games){
      var data = {
        logged_in : logged_in,
        user: user,
        games: games
      };
      res.render('user/games', data);
    });
  }else{
    res.redirect(alertUser('You must log in to view user games.'));
  }
});

// game replay page
app.get('/game/:id', function(req, res){
  if(req.session.user){ // only logged in users
    var game_id = req.params.id;
    var user = req.session.user;
    // renaming due to id conflict in column names
    db.one('SELECT g.id AS game_id, g.movelist, g.fenlist, g.user_id AS id, u.username FROM games AS g JOIN users AS u ON g.user_id=u.id WHERE g.id=$1', [game_id])
    .catch(function(err){
      res.redirect(alertUser('Could not get game data.'));
    })
    .then(function(data){
      data.movelist = data.movelist.split(','); // parse movelist
      data.fenlist = data.fenlist.split('~'); // parse fenlist
      data.user = user;
      res.render('user/game', data);
    });
  }else{
    res.redirect(alertUser('You must sign in to view games.'));
  }

});

// perform search API operation
app.post('/search', function(req, res){
  var search = req.body.search; // user's input
  var narrow = encodeURIComponent('best chess games'); // narrow search to chess
  fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q='+narrow+'%20'+search+'&key='+APP_ID)
  .then(function(response){
    return response.json();
  })
  .then(function(body){
    var logged_in;
    if(req.session.user) logged_in = true;
    var data = {
      logged_in: logged_in,
      user: req.session.user,
      items : []
    };
    body.items.map(function(video){
      // getting relavent data from API response
      data.items.push({
        title: video.snippet.title,
        description : video.snippet.description,
        img : video.snippet.thumbnails.default.url,
        channel : video.snippet.channelTitle,
        videoid : video.id.videoId,
        playlistid : video.id.playlistId
      });
    });
    // rerendering watch.html with data
    res.render('watch', data);
  });
});

// watch page
app.get('/watch', function(req, res){
  var user, logged_in;
  if(req.session.user){ // storing info for header.html
    user = req.session.user;
    logged_in = true;
  }
  var data = {
    logged_in : logged_in,
    id : user
  };
  res.render('watch', data);
});

// about page
app.get('/about', function(req, res){
  var user, logged_in;
  if(req.session.user){// storing info for header.html
    user = req.session.user;
    logged_in = true;
  }
  var data = {
    logged_in : logged_in,
    user : user
  };
  res.render('about', data);
});

// contact page
app.get('/contact', function(req, res){
  var user, logged_in;
  if(req.session.user){// storing info for header.html
    logged_in = true;
    user = req.session.user;
  }
  var data = {
    logged_in : logged_in,
    user : user
  };
  res.render('contact', data);
});

