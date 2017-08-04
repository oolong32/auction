var Article = require('../models/article');
var User = require('../models/user.js');
var Bid = require('../models/bid');
var async = require('async');

// Display list of all Bids
exports.bid_list = function(req, res, next) {
  Bid.find()
    .populate('article')
    .populate('user')
    .sort([['amount', 'descending']]) // <------ geht das?
    .exec(function (err, list_bids) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('bid_list', { title: 'Auflistung Gebote', bid_list: list_bids });
  });
};

// GET Bid Detail
exports.bid_detail_get = function(req, res, next) {
   async.parallel({
    bid: function(callback) {  
      Bid.findById(req.params.id)
        .populate('article')
        .populate('user')
        .exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('bid_detail', { title: 'Gebot-Details', bid: results.bid } );
  }); 
  // Angezeigt werden sollte ein "sofort kaufen" knopf
  // was gibt es für eine route/view für die Kaufbestätigung?
};

// GET form to create Bids
// exports.bid_create_get = function(req, res, next) {
//   async.parallel({
//     articles: function(callback) {
//       Article.find(callback);
//     },
//     users: function(callback) {
//       User.find(callback);
//     },
//   }, function(err, results) {
//     if (err) { return next(err); }
//     res.render('bid_create_form', { title: 'Gebot abgeben', articles: results.articles, users: results.users, csrfToken: req.csrfToken() });
//   });
// };

// POST form to create Bids
// exports.bid_create_post = function(req, res, next) {
//   //Check that the name field is not empty
//   req.checkBody('amount', 'Betrag angeben').isInt().notEmpty(); 
//   req.checkBody('article', 'Für welches Bild wird geboten?').notEmpty(); 
//   req.checkBody('user', 'Wer bietet?').notEmpty(); 

//   // Trim and escape the amoount field.
//   req.sanitize('amount').escape();
//   req.sanitize('amount').trim();

//   //Run the validators
//   var errors = req.validationErrors();

//   // Get article information from database
//   Article.findById(req.body.article, function(err, foo) {
//     if (err) {console.log(err);}

//     // Create a genre object with escaped and trimmed data.
//     var bid = new Bid(
//       { amount: req.body.amount,
//         article: req.body.article,
//         user: req.body.user
//       });

//     // Compare amounts
//     if (parseInt(req.body.amount) <= parseInt(foo.base_price)) { // amount too low
//       async.parallel({
//         articles: function(callback) {
//           Article.find(callback);
//         },
//         users: function(callback) {
//           User.find(callback);
//         },
//       }, function(err, results) {
//         res.render('bid_create_form', { title: 'Gebot zu tief', bid: bid, articles: results.articles, users: results.users, errors: errors/*, csrfToken: req.csrfToken()*/ });
//       });
//       return;
//     } else if (errors) { // bravo, sehr elegant hier wieder einmal
//       async.parallel({
//         articles: function(callback) {
//           Article.find(callback);
//         },
//         users: function(callback) {
//           User.find(callback);
//         },
//       }, function(err, results) {
//         //If there are errors render the form again, passing the previously entered values and errors
//         res.render('bid_create_form', { title: 'Gebot abgeben', bid: bid, articles: results.articles, users: results.users, errors: errors/*, csrfToken: req.csrfToken()*/ });
//       });
//       return;
//     } else { // amount ok
//       // set base_price to bid
//       process_valid_form(bid, update_base_price);
//     }
//   });

//   function update_base_price(bid) {
//     Article.findByIdAndUpdate(req.body.article, {base_price: req.body.amount}, function(err, x) {
//       if (err) {console.log(err);}
//       // console.log('Base price of ' + x.title + ' is ' + x.base_price);
//       // proceed to render 
//     });
//   }

//   function process_valid_form(bid, callback) {
//     bid.save(function (err) {
//       if (err) { return next(err); }
//       // Bid saved. Redirect to bid detail page
//       res.redirect(bid.url);
//     });
//     callback(bid);
//   }
// };

// Display Bid delete form on GET
exports.bid_delete_get = function(req, res, next) {
  async.parallel({
    bid: function(callback) {     
      Bid.findById(req.params.id).populate('user').populate('article').exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('bid_delete', { title: 'Datensatz löschen', bid: results.bid, csrfToken: req.csrfToken() });
  });
};

// Handle Bid delete on POST
exports.bid_delete_post = function(req, res, next) {
  req.checkBody('bidid', 'Gebots-ID muss existieren').notEmpty();  
  async.parallel({
    bid: function(callback) {     
      Bid.findById(req.body.bidid).exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Success
    Bid.findByIdAndRemove(req.body.bidid, function deleteBid(err) {
      if (err) { return next(err); }
      //Success - got to bid list
      res.redirect('/bid');
    });
  });
};

