var User = require('../models/user');
var bcrypt = require('bcryptjs');

exports.login_get = function(req, res) {
  res.render('login.nunjucks', { csrfToken: req.csrfToken() });
};

exports.login_post = function(req, res) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) {
      res.render('login.nunjucks', { error: 'Falsche E-Mail Adresse oder falsches Passwort.', csrfToken: req.csrfToken() })
    } else {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        req.session.user = user; // alle Userinfos in verschlüsselte cookies
        res.redirect('/');
      } else {
        res.render('login.nunjucks', { error: 'Falsche E-Mail Adresse oder falsches Passwort.', csrfToken: req.csrfToken() })
      }
    }
  });
};
