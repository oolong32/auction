var fs = require('fs');
var express = require('express');
var nunjucks = require('nunjucks');
var sassMiddleware = require('node-sass-middleware');
var morgan = require('morgan');
var path = require('path');
var expressValidator = require('express-validator');
var bodyParser = require('body-parser');
// var favicon = require('serve-favicon');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var sessions = require('client-sessions');

var auction = require('./routes/auction');  // Import routes for "auction" area of site (which is all of it)
var app = express();

//Set up mongoose connection
// var mongoDB = 'mongodb://localhost:27017';
// dokku mongo link
var mongoDB = process.env.MONGODB_URI || 'mongodb://fubar:4dc7b92834830c939e8cf5a955875394@dokku-mongo-fubar:27017/fubar';
mongoose.connect(mongoDB);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var port = process.env.PORT || 3000;
// var listen = ['::ffff:127.0.0.1', port];

// app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'nunjucks');
nunjucks.configure(path.join(__dirname, '/views'), {
  autoescape: true,
  express: app
});

// Favicon
// app.use(favicon(path.join(__dirname, '/public', 'favicon.ico'))); // <------- oder auch nicht …

// Middleware für Passwortabfrage
app.use(sessions({
  cookieName: 'session',
  secret: 'hokus pokus fidibus simsalabim abrakadabra asdöflkjasödlkfj',
  duration: 1000 * 60 * 60,
  activeDuration: 1000 * 10,
  httpOnly: true // don’t let browser javascript access cookies
}));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false })); // <-- im auth-tutorial ist es true – ist das relevant?
app.use(expressValidator());

var User = require('./models/user');
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({ email: req.session.user.email }, function(err, user) { // saublöd wegen dieser zeile muss das model user.js geladen werden
      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = req.user;
        res.locals.user = req.user;
      }
      next();
    });
  } else {
    next();
  }
});

// function requireLogin(req, res, next) {
//   if (!req.user) {
//     res.redirect('/login');
//   } else {
//     next();
//   }
// }
// bis hier Middleware für Passwortabfrage

// log http requests
app.use(morgan('dev'));

// write stylesheet from sass to public
// must come before express.static
app.use(sassMiddleware({
  src: path.join(__dirname, '/sass'),
  dest: path.join(__dirname, '/public'),
  debug: true
}), express.static(path.join(__dirname, '/public')));

app.use('/', auction); // Add auction routes to middleware chain.

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found')
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error.nunjucks');
});

// var server = app.listen(listen[1], listen[0]); // läuft das mit dokku?
var server = app.listen(port);

// console.log('server started on port %s', listen[1]);
console.log('server started on port %s', port);

module.exports = app;
