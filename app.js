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

// app id
const APP_ID = process.env.APIKEY;
const PORT = process.env.PORT || 3000;

var alertUser = function(string, path){
	var alert = encodeURIComponent(string);
	if(!path) path = '/';
	return path+'?alert='+alert;
};

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

app.listen(PORT, function () {
	console.log('Alive on port '+PORT);
});

app.get('/', function(req, res){
	var logged_in, email, id;
	var alert = req.query.alert;
	if(req.session.user){
		logged_in = true;
		email = req.session.user.email;
		id = req.session.user.id;
	}
	var data = {
		alert : alert,
		logged_in : logged_in,
		email : email,
		id: id
	};
	res.render('index', data);
});

app.get('/user/:id/account', function(req, res){
	var logged_in, email, username, id, alert;
	var page_id = req.params.id;

	if(req.session.user){
		logged_in = true;
		email = req.session.user.email;
		username = req.session.user.username;
		id = req.session.user.id;
		if(Number(id) === Number(page_id)){
		var data = {
			logged_in : logged_in,
			email: email,
			username: username,
			id : id
		};
		res.render('user/account', data);
		}else{
			res.redirect(alertUser('You must log in to view account pages.'));
		}
	}else{
		res.redirect(alertUser('You must log in to view account pages.'));
	}
});

app.get('/user/:id', function(req, res){
	var alert = req.query.alert;
	var logged_in;
	var page_id = req.params.id;
	if(req.session.user){
		logged_in = true;
	}
	db.one('SELECT * FROM users WHERE id=$1', [page_id])
	.catch(function(err){
		res.redirect(alertUser('GET failed!'));
	}).then(function(user){
		user.logged_in = logged_in;
		user.alert = alert;
		res.render('user/index', user);
	});
});
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

app.delete('/user', function(req, res){
  if(req.session.user){
    var user_id = req.session.user.id;
    db.none('DELETE FROM users WHERE id=$1', [user_id])
    .catch(function(err){
      res.redirect(alertUser('Could not delete user.'));
    })
    .then(function(data){
      req.session.destroy(function(err){
        res.redirect(alertUser('User has been deleted'));
      });
    });
  }else{
    res.redirect(alertUser('You must be logged in.'));
  }
});

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

app.get('/signup', function(req, res){
  res.render('signup/index');
});

app.post('/signup', function(req, res){
  var data = req.body;
  bcrypt.hash(data.password, 10, function(err, hash){
    db.one('INSERT INTO users (id, username, email, password_digest) VALUES (DEFAULT, $1, $2, $3) RETURNING *', [data.username, data.email, hash])
      .catch(function(err){
        res.redirect(alertUser('User could not be created'));
      })
      .then(function(user){
        req.session.user = user;
            res.redirect(alertUser('User created', '/user/'+user.id));
      });
  });
});

app.get('/logout', function(req, res){
  req.session.destroy(function(err){
        res.redirect(alertUser('User logged out.'));
  });
});

app.get('/play', function(req, res){
  var logged_in;
  var user = req.session.user;
  if(user){
    logged_in = true;
    var data = {
      logged_in : logged_in,
      username : user.username,
      id : user.id
    };
    res.render('play', data);
  }else{
    res.redirect(alertUser('You must log in to play.'));
  }
});

app.post('/save', function(req, res){
  var movelist = req.body.mygame;
  var fenlist = req.body.fenlist;
  var user = req.session.user;
  db.none('INSERT INTO games (id, movelist, fenlist, user_id) VALUES (DEFAULT, $1, $2, $3)', [movelist, fenlist, user.id])
  .catch(function(err){
    res.redirect(alertUser('Game could not be saved.'));
  }).then(function(data){
    res.redirect(alertUser('Your game was saved successfully.','/user/'+user.id));
  });
});

app.get('/games/:id', function(req, res){
  var user_id = req.params.id, logged_in, user;
  if(req.session.user){
    logged_in = true;
    user = req.session.user;

    db.any('SELECT * FROM games WHERE user_id=$1', [user_id])
    .catch(function(err){
      res.redirect(alertUser('Could not GET games for user'));
    })
    .then(function(games){
      var data = {
        logged_in : logged_in,
        id : user.id,
        username : user.username,
        games: games
      };
      res.render('user/games', data);
    });
  }else{
    res.redirect(alertUser('You must log in to view user games.'));
  }
});

app.get('/game/:id', function(req, res){
  if(req.session.user){
    var game_id = req.params.id;
    var user = req.session.user;
    db.one('SELECT g.id AS game_id, g.movelist, g.fenlist, g.user_id AS id, u.username FROM games AS g JOIN users AS u ON g.user_id=u.id WHERE g.id=$1', [game_id])
    .catch(function(err){
      res.redirect(alertUser('Could not get game data.'));
    })
    .then(function(data){
      data.movelist = data.movelist.split(',');
      data.fenlist = data.fenlist.split('~');
      res.render('user/game', data);
    });
  }else{
    res.redirect(alertUser('You must sign in to view games.'));
  }

});

app.post('/search', function(req, res){
  var search = req.body.search;
  var narrow = encodeURIComponent('best chess games');
  fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&q='+narrow+'%20'+search+'&key='+APP_ID)
  .then(function(response){
    return response.json();
  })
  .then(function(body){
    var data = {
      items : []
    };
    body.items.map(function(video){
      data.items.push({
        title: video.snippet.title,
        description : video.snippet.description,
        img : video.snippet.thumbnails.default.url,
        channel : video.snippet.channelTitle,
        videoid : video.id.videoId,
        playlistid : video.id.playlistId
      });
    });
    console.log(data);
    res.render('watch', data);
  });
});

app.get('/watch', function(req, res){
  var user_id, logged_in;
  if(req.session.user){
    user_id = req.session.user.id;
    logged_in = true;
  }
  var data = {
    logged_in : logged_in,
    id : user_id
  };
  res.render('watch', data);
});

app.get('/about', function(req, res){
  var user_id, logged_in;
  if(req.session.user){
    user_id = req.session.user.id;
    logged_in = true;
  }
  var data = {
    logged_in : logged_in,
    id : user_id
  };
  res.render('about', data);
});

app.get('/contact', function(req, res){
  var user_id, logged_in;
  if(req.session.user){
    logged_in = true;
    user_id = req.session.user.id;
  }
  var data = {
    logged_in : logged_in,
    id : user_id
  };
  res.render('contact', data);
});

