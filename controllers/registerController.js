var User = require('../models/user');
var bcrypt = require('bcryptjs');
var nodemailer = require('nodemailer');

exports.register_get = function(req, res) {
  res.render('register.nunjucks', { csrfToken: req.csrfToken() });
};

// Nodemailer
// create reusable transporter object using the default SMTP transport
// gets used in index controller as well, might be better to modularize?
var transporter = nodemailer.createTransport({
  host: 'login-111.hoststar.ch',
  port: 25,
  secure: false, // secure:true for port 465, secure:false for port 587
  auth: {
    user: 'web21p3',
    pass: process.env.MAILPASS || 'asdf293fjlk'
  }
});

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
        res.render('register.nunjucks', {error: error, user: {firstName: req.body.firstName, lastName: req.body.lastName, email: ''}});
      } else {
        req.session.user = user;
        console.log('user saved'); // jetzt E-Mail versenden!
        var user_mail = req.body.email;
        var mailOptions = {
          from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>', // Absender <======================================0 ÄNDERN
          to: user_mail, // Empfänger
          subject: 'Benutzerkonto für ' + user.first_name + ' ' + user.last_name + ' eingerichtet', // Betreff
          text: 'Vielen Dank fürs Registrieren.\nSie können jetzt auf auction.francoisenussbaumer.ch mitbieten.' // plain text body
        }; 
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            return console.log(error);
          }
          console.log('Message %s sent: %s', info.messageId, info.response);
        }); 
        res.redirect('/');
      }
    });
  }
};

exports.new_password_get = function(req, res) {
  console.log('wir versuchen user ' + req.session.user.email + ' ein neues Passwort zu setzten.');
  console.log('in der session steht folgendes:');
  req.session.user.password = '';
  console.log(req.session.user);
  res.render('new_password.nunjucks', { csrfToken: req.csrfToken() });
};

exports.new_password_post = function(req, res, next) {
  //test test test
  console.log('test updating password of: ' + req.session.user.email);
  
  //Check that the name field is not empty
  req.checkBody('password', 'Passwort ist notwendig').notEmpty();
  req.checkBody('password2', 'Das Passwort muss ein zweites Mal eingegeben werden, um Tippfehler zu vermeiden.').notEmpty();

  // check if Password equals Password2
  req.checkBody('password2', 'Die eingegebenen Passwörter stimmen nicht überein.').equals(req.body.password);

  //Run the validators
  var errors = req.validationErrors();
  if (errors) {
    var user = {
      firstName: req.session.user.first_name,
      lastName: req.session.user.last_name,
      name: req.session.user.first_name + ' ' + req.session.user.last_name,
      email: req.session.user.email
    };
    console.log(errors);
    console.log(user);
    res.render('new_password.nunjucks', {error: errors[0].msg, user: user, csrfToken: req.csrfToken() }); // ist das nötig oder wird das vom Formular übernommen?
  } else {
    var new_pass_hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

      User.findOneAndUpdate({ 'email': req.session.user.email }, { 'password': new_pass_hash }, function (err, theuser) {
        if (err) { return next(err); } // ob das je eintrifft, und wenn ja, was ist 'next'?

        // New pasword saved. Message User and redirect to index page
        var user_mail = theuser.email;
        var mailOptions = {
          from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>',
          to: user_mail, // Empfänger
          subject: 'Passwort geändert', // Betreff
          text: `Guten Tag ${theuser.name}
          
Das Passwort für ihr Benutzerkonto wurde gespeichert.
Sie können jetzt wieder auf auction.francoisenussbaumer.ch mitbieten.

Bitte entschuldigen Sie die Umstände.

Freundliche Grüsse
--
BILD DES TAGES
auction.francoisenussbaumer.ch
Françoise Nussbaumer
mail@francoisenussbaumer.ch` // plain text body
        }; 
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            return console.log(error);
          }
          console.log('Message %s sent: %s', info.messageId, info.response);
        }); 
        res.redirect('/');
      });
  }
};
