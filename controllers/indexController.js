// erwartungsgemäss brauchts ein paar modelle:
var Article = require('../models/article');
var User = require('../models/user');
var Bid = require('../models/bid');

var async = require('async');
var nodemailer = require('nodemailer');

// Nodemailer
// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
  host: 'smtp.onlime.ch',
  port: 587,
  secure: false, // secure:true for port 465, secure:false for port 587
  auth: {
    user: 'test@typo-summer.ch',
    pass: '>D[cZek8x(cpLnR'
  }
});

// Main Page
exports.index = function(req, res) {
  async.waterfall([
    function(callback) {
      Article.find({})
        .sort({ 'createdAt': -1 })
        .limit(1)
        .exec(callback);
    },
    function(article, callback) {
      var id = article[0]._id;
      Bid.find({ 'article': id }).populate('user').sort({ 'amount': -1 }).exec(function(err, bids) {
        if (err) { console.error('Trubba not, bids defunct: ' + err); }
          // console.log('bids', bids);
          callback(null, [article[0], bids]);
      });
    }
  ],
    function(err, results) {
      if (err) {console.error('Problem querying Database:', err);}

      var article = results[0];
      var highest_bid = results[1][0];

      // check date against expiration date
      var now = Date.now();
      console.log(results[0])
      console.log(results[0].createdAt)
      var date = results[0].createdAt.getTime();
      var expiration = date + 7*24*60*60*1000;
      var remaining =  expiration - now;

      if (remaining <= 0 && article.active == true) { // expired but not sold
        if (!highest_bid) { // there are no bids
          Article.findByIdAndUpdate(article._id, {$set: {active: false, sold: false}}, {new: true}, function(err, updated_article) {
            if (err) {console.log(err);}
            // send confirmation mail to seller
            var buyer_mail = 'josef.renner@gmail.com'; // <---- ändern ----- !!!!!!!!!!!!!!!!!!!
            var mailOptions = {
              from: '"Buzi Bau" <test@typo-summer.ch>', // sender address
              to: buyer_mail, // list of receivers
              subject: 'Nicht versteigert: ' + updated_article.title, // Subject
              text: 'Es gab keine Gebote für das Bild «' + updated_article.title + '». Die Auktion ging am ' + updated_article.expiration_formatted + 'zu Ende.' // plain text body
            }; 
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                return console.log(error);
              }
              console.log('Message %s sent: %s', info.messageId, info.response);
            }); 
            // proceed to render 
            res.render('index', { title: 'Versteigerung beendet', article: updated_article, bids: results[1], csrfToken: req.csrfToken() });
            return;
          });
        } else { // there are bids, proceed
          // update article: sold, inactive
          Article.findByIdAndUpdate(article._id, {$set: {active: false, sold: true}}, {new: true}, function(err, updated_article) {
            if (err) {console.log(err);}
            console.log('updated article:');
            console.log(updated_article);
            // send confirmation mail to buyer
            var buyer_mail = highest_bid.user.email;
            var mailOptions = {
              from: '"Buzi Bau" <test@typo-summer.ch>', // sender address
              to: buyer_mail, // list of receivers
              subject: 'Ersteigert: ' + updated_article.title, // Subject
              text: 'Herzlichen Glückwunsch, Sie haben das Bild «' + updated_article.title + '» für CHF ' +  highest_bid.amount + '.— ersteigert.' // plain text body
            }; 
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                return console.log(error);
              }
              console.log('Message %s sent: %s', info.messageId, info.response);
            }); 
            // proceed to render 
            res.render('index', { title: 'Versteigerung beendet', article: updated_article, bids: results[1], csrfToken: req.csrfToken() });
            return;
          });
        }
      } else { // article hasn’t expired yet OR is already sold
        // Titel "übersicht" muss besser werden
        res.render('index', { title: 'Versteigerung', article: results[0], bids: results[1], csrfToken: req.csrfToken() /* bid_success: req.session.bid_success ? req.session.bid_success : null, bid_err: req.session.bid_err ? req.session.bid_err : null */ });
      }
  });
};

// Make bid on main page
exports.bid = function(req, res) {
  // console.log('geboten wird für', req.body.article);
  // console.log('es bietet', req.session.user.email);
  // console.log('das gebot beträgt', req.body.amount);
  async.parallel({
    article: function(callback) {
      Article.find({ '_id': req.body.article }, callback);
    },
    user: function(callback) {
      User.find({ 'email': req.session.user.email}, callback);
    }
  }, function(err, results) {
  var curr_price = parseInt(results.article[0].base_price);
  var inst_price = parseInt(results.article[0].instant_buy_price);
  var bid_amount = parseInt(req.body.amount);
  var difference = bid_amount - curr_price;
  if (bid_amount >= inst_price) {
    res.redirect('/instant-buy');
  } else if (difference > 0) {
    // req.session.bid_success = 'Danke für Ihr Gebot.';
    var bid = new Bid(
      { amount: bid_amount,
        article: req.body.article,
        user: results.user[0]._id
      });
    process_valid_form(bid, results.user[0].email, update_base_price);
  } else {
    // req.session.bid_err = 'Bid too low.'
    res.redirect('/');
    return;
  }
  });
  function update_base_price(bid) {
    Article.findByIdAndUpdate(bid.article, {base_price: bid.amount}, function(err, x) {
      if (err) {console.log(err);}
      // proceed to render 
    });
  }

  function process_valid_form(bid, mail, callback) {
    bid.save(function (err) {
      if (err) { return next(err); }
      // Bid saved. Redirect to bid detail page

      // Confirmation Mail
      var mailOptions = {
        from: '"Buzi Bau" <test@typo-summer.ch>', // sender address
        to: mail, // list of receivers
        subject: 'Gebot eingegangen', // Subject
        text: 'Ihr Gebot über ' + bid.amount + ' CHF ist eingeangen – vielen Dank.' // plain text body
      }; 
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          return console.log(error);
        }
        console.log('Message %s sent: %s', info.messageId, info.response);
      }); 

      res.redirect('/');
    });
    callback(bid);
  }
};

// Click instant buy link on main page
exports.instant_buy = function(req, res) {
  // Aktuellstes Angebot finden
  Article.find({})
    .sort({ 'date': -1 })
    .limit(1)
    .exec(function(err, data) {
      var article = data[0];
      var price = data[0].instant_buy_price;
      console.log('preis:' + price);
      // Angebotsstatus auf verkauft und inaktiv setzen
      Article.findByIdAndUpdate( article._id, { sold: true, active: false }, function(err, updated_article) {
        if (err) {
          console.error(err);
        }
        // Benutzer finden, wir brauchen die ID
        User.find({ 'email': req.session.user.email }).exec(function(err, user) {
          console.log(user);
          if (err) {
            console.error(err);
          }
          var bid = new Bid({
            amount: updated_article.instant_buy_price,
            article: updated_article._id,
            user: user[0]._id
          });
          bid.save(function(err) {
            if (err) {
              console.error(err);
          }

          // Confirmation Mail
          var mailOptions = {
            from: '"Buzi Bau" <test@typo-summer.ch>', // sender address
            to: user[0].email, // list of receivers
            subject: 'Ersteigert: ' + updated_article.title, // Subject
            text: 'Sie haben das Bild «' + updated_article.title + '» für ' + bid.amount + ' CHF ersteigert – herzlichen Glückwunsch.' // plain text body
          }; 
          transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
              return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
          }); 
                res.redirect('/'); // gut wär natürlich eine art bestätigungsseite
              });
            });
          });
        });
    };


// schnell, schnell Artikel wieder einstellen
exports.reset_article = function(req, res) {
  Article.find({})
    .sort({ 'date': -1 })
    .limit(1)
    .exec(function(err, data) {
      var article = data[0];
      Article.findByIdAndUpdate( article._id, { sold: false, active: true }, function(err, update) {
        if (err) {
          console.error(err);
        }
        res.redirect('/');
      });
    });
};
