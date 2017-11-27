var User = require('../models/user');
var bcrypt = require('bcryptjs');

exports.login_get = function(req, res) {
  res.render('login.nunjucks', { csrfToken: req.csrfToken() });
};

exports.login_post = function(req, res) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) {
      res.render('login.nunjucks', { error: 'Der Server kann sich nicht an dieses Konto erinnern. Möchten Sie sich neu registrieren?', csrfToken: req.csrfToken() })
    } else {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        req.session.user = user; // alle Userinfos in verschlüsselte cookies
        res.redirect('/');
      } else {
        if (!user.password) { // user existiert, aber es gibt kein passwort
          console.log('user found, but no password: ');
          console.log(user);
          req.session.user = user; // alle Userinfos in verschlüsselte cookies
          req.session.user.password = ''; // Vorsicht ist die Mutter der Porzellankiste
          // umleiten auf Spezialseite
          res.redirect('/new-password');
        } else { // flasches passwort
          res.render('login.nunjucks', { error: 'Das Passwort scheint nicht zu stimmen.', csrfToken: req.csrfToken() })
        }
      }
    }
  });
};
