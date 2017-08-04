var Article = require('../models/article');
var User = require('../models/user.js');
var Bid = require('../models/bid');
var async = require('async');

// Display list of all Users
exports.user_list = function(req, res, next) {
  User.find()
    .sort([['last_name', 'ascending']])
    .exec(function (err, list_users) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('user_list', { title: 'Auflistung Bieter', user_list: list_users });
  });
};

// Display detail page for a specific User
exports.user_detail = function(req, res, next) {
   async.parallel({
    user: function(callback) {  
      User.findById(req.params.id)
        .exec(callback);
    },
    user_bids: function(callback) {
      Bid.find({ 'user': req.params.id })
      .sort([['amount', 'descending']])
      .populate('article')
      .exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Successful, so render
    console.log(results.user_bids);
    res.render('user_detail', { title: 'Bieter-Details', user: results.user, bids: results.user_bids } );
  }); 
};

// Display User create form on GET
exports.user_create_get = function(req, res, next) {
  res.render('user_form', { title: 'Bieter erfassen' });
};

// Handle User create on POST
exports.user_create_post = function(req, res, next) {
  //Check that the name field is not empty
  req.checkBody('first_name', 'Vorname notwendig').notEmpty(); 
  req.checkBody('last_name', 'Nachname notwendig').notEmpty(); 
  req.checkBody('email', 'E-Mail Adresse notwendig').notEmpty();

  //Trim and escape the name field.
  req.sanitize('first_name').escape();
  req.sanitize('first_name').trim();
  req.sanitize('last_name').escape();
  req.sanitize('last_name').trim();
  req.sanitize('email').escape();
  req.sanitize('email').trim();

  //Run the validators
  var errors = req.validationErrors();

  //Create a genre object with escaped and trimmed data.
  var user = new User(
    { first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email
    });

  if (errors) {
    //If there are errors render the form again, passing the previously entered values and errors
    res.render('user_form', { title: 'Create User', user: user, errors: errors});
    return;
  } 
  else {
    // Data from form is valid.
    // Check if User with same address already exists
    User.findOne({ 'email': req.body.email })
      .exec( function(err, found_user) {
        console.log('found_user: ' + found_user);
        if (err) { return next(err); }

        if (found_user) { 
          // User exists, redirect to its detail page
          // muss besser gelöst werden heir <------------------ !
          res.redirect(found_user.url);
        }
        else {
          user.save(function (err) {
            if (err) { return next(err); }
            // User saved. Redirect to user detail page
            res.redirect(user.url);
          });
        }
    });
  }
};

// Display User delete form on GET
exports.user_delete_get = function(req, res, next) {
  console.log(req.params.id);
  async.parallel({
    user: function(callback) {     
      User.findById(req.params.id).exec(callback);
    },
    // user_bids: function(callback) {
    //   Bid.find({ 'user': req.params.id }).exec(callback);
    // },
  }, function(err, results) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('user_delete', { title: 'Benutzer_in löschen', user: results.user, user_bids: results.users_bids } );
  });
};

// Handle User delete on POST
exports.user_delete_post = function(req, res, next) {
  req.checkBody('userid', 'Benutzer-ID muss existieren').notEmpty();  
  // console.log('try deleting user ' + req.body.userid);
  async.parallel({
    user: function(callback) {     
      User.findById(req.body.userid).exec(callback);
    },
    users_bids: function(callback) {
      Bid.find({ 'user': req.body.userid },'was ist das hier?').exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Success
    if (results.users_bids>0) {
      //Author has bids. Render in same way as for GET route.
      res.render('user_delete', { title: 'Benutzer_in löschen', user: results.user, user_bids: results.users_bids } );
      return;
    }
    else {
      //Author has no bids. Delete object and redirect to the list of users.
      User.findByIdAndRemove(req.body.userid, function deleteUser(err) {
        if (err) { return next(err); }
        //Success - got to user list
        res.redirect('/user');
      });
    }
  });
};

// Display User update form on GET
exports.user_update_get = function(req, res) {
  res.send('NOT IMPLEMENTED: User update GET');
};

// Handle User update on POST
exports.user_update_post = function(req, res) {
  res.send('NOT IMPLEMENTED: User update POST');
};

