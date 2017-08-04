var User = require('../models/user');
var bcrypt = require('bcryptjs');

exports.register_get = function(req, res) {
  res.render('register.nunjucks', { csrfToken: req.csrfToken() });
};

exports.register_post = function(req, res) {
  //Check that the name field is not empty
  req.checkBody('firstName', 'Vorname notwendig').notEmpty(); 
  req.checkBody('lastName', 'Nachname notwendig').notEmpty(); 
  req.checkBody('email', 'E-Mail Adresse notwendig').notEmpty();
  req.checkBody('password', 'Passwort ist notwendig').notEmpty();
  req.checkBody('password2', 'Das Passwort muss ein zweites Mal eingegeben werden, um Tippfehler zu vermeiden.').notEmpty();

  // check if Password equals Password2
  req.checkBody('password2', 'Die Passwörter stimmen nicht überein.').equals(req.body.password);

  //Trim and escape the name field.
  req.sanitize('first_name').escape();
  req.sanitize('first_name').trim();
  req.sanitize('last_name').escape();
  req.sanitize('last_name').trim();
  req.sanitize('email').escape();
  req.sanitize('email').trim();

  //Run the validators
  var errors = req.validationErrors();
  if (errors) {
    var user = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email
    };
    console.log(errors);
    res.render('register.nunjucks', {error: errors[0].msg, user: user, csrfToken: req.csrfToken()});
  } else {
    var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    var user = new User({
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      email: req.body.email,
      password: hash
    });
    user.save(function(err) {
      if (err) {
        var error = 'Fehler beim Erfassen des Datensatzes.'
        if (err.code === 11000) {
          error = 'Es existiert bereits ein Konto mit dieser Adresse.'
        }
        console.log(err);
        res.render('register.nunjucks', {error: error});
      } else {
        req.session.user = user;
        console.log('user saved');
        res.redirect('/');
      }
    });
  }
};

