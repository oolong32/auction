exports.logout = function(req, res) {
  req.session.reset();
  res.redirect('/');
};
