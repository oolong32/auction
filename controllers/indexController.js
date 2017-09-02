// erwartungsgemäss brauchts ein paar modelle:
var Article = require('../models/article');
var User = require('../models/user');
var Bid = require('../models/bid');

var async = require('async');
var nodemailer = require('nodemailer');

// Nodemailer
// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
  host: 'login-111.hoststar.ch',
  port: 25,
  secure: false, // secure:true for port 465, secure:false for port 587
  auth: {
    user: 'web21p3',
    pass: 'P1pap1pa'
  }
});

// Main Page
exports.index = function(req, res) {
  async.waterfall([
    function(callback) {
      Article.find({})
        .sort({ 'createdAt': -1 }) // neuster Eintrag
        .limit(1)
        .exec(callback);
    },
    function(article, callback) {
      if (!article[0]) {
        res.render('index', { title: 'Keine Auktion', article: { title: "Nichts", image_filename: null, description: "Es gibt noch kein Bild in der Datenbank", base_price: 0, instant_buy_price: 0, date_formatted: null, date_unformatted: 0, expiration_formatted: 0, expiration_unformatted: 0, active: false }, bids: null, csrfToken: req.csrfToken() });
        return;
      }
      var id = article[0]._id;
      Bid.find({ 'article': id }).populate('user').sort({ 'amount': -1 }).exec(function(err, bids) {
        if (err) { console.error(`Trubba not, bids defunct: ${err}`); }
          // console.log('bids', bids);
          callback(null, [article[0], bids]);
      });
    }
  ],
    function(err, results) {
      if (err) { console.error('Problem querying Database:', err); }

      var article = results[0];
      var highest_bid = results[1][0];

      // check date against expiration date
      var now = Date.now();
      // console.log(results[0])
      // console.log(results[0].createdAt)
      var date = results[0].createdAt.getTime();
      // expiration should come from database, this needs to be adressed soon
      var expiration = date + 2*24*60*60*1000; // <---------------------------------------------- hard coded time, bad bad bad
      var remaining =  expiration - now;

      if (remaining <= 0 && article.active == true) { // expired but not sold
        if (!highest_bid) { // there are no bids
          Article.findByIdAndUpdate(article._id, {$set: {active: false, sold: false}}, {new: true}, function(err, updated_article) {
            if (err) {console.log(err);}

            // send confirmation mail to seller
            // change admin address depending on environment
            var adminAddress = (req.app.get('env') != 'development') ? '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>' : '"Josef Renner" <josef.renner@gmail.com>';
            var seller_mail = 'mail@francoisenussbaumer.ch';
            var mailOptions = {
              from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>',
              to: adminAddress,
              subject: `Nicht versteigert: ${updated_article.title}`, // Subject
              text: `Es gab keine Gebote für das Bild «${updated_article.title}». Die Auktion ging am ${updated_article.expiration_formatted} zu Ende.` // plain text body
            }; 
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                return console.log(error);
              }
              console.log('Message %s sent: %s', info.messageId, info.response);
            }); 
            // proceed to render 
            res.render('index', { title: 'Auktion beendet', article: updated_article, bids: results[1], csrfToken: req.csrfToken() });
            return;
          });
        } else { // there are bids, proceed
          //
          // Zu welchem Zeitpunkt passiert dies?
          // (Artikel ist nicht mehr aktiv weil Zeit abgelaufen, es gibt mindestens ein Gebot)
          // Offensichtlich, wenn die Seite aus gerendert wird. Besser wäre eine unmittelbarere Lösung
          //
          // Update article: sold, inactive
          Article.findByIdAndUpdate(article._id, {$set: {active: false, sold: true}}, {new: true}, function(err, updated_article) {
            if (err) {console.log(err);}
            console.log('Versteigert durch Timeout:');
            console.log(updated_article);

            // send confirmation mail to buyer
            var buyer_mail = highest_bid.user.email;
            var mailOptions = {
              from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>', // Absender
              to: buyer_mail, // Empfänger
              subject: `Ersteigert: ${updated_article.title}`, // Betreff
              text: `Guten Tag ${highest_bid.user.name}
              
Herzlichen Glückwunsch, Sie haben das Bild «${updated_article.title}» für CHF ${highest_bid.amount}.— ersteigert.
Françoise Nussbaumer wird Sie in Kürze kontaktieren, um den Versand zu klären.
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
              console.log(`Message %s sent: %s`, info.messageId, info.response);
            }); 

            // send confirmation mail to seller
            // change admin address depending on environment
            var adminAddress = (req.app.get('env') != 'development') ? '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>' : '"Josef Renner" <josef.renner@gmail.com>';
            var confirmationMailOptions = {
              from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>', // Absender
              to: adminAddress,                                             // Empfänger
              subject: `Versteigert: ${updated_article.title}`, // Betreff
              text: `${highest_bid.user.name} (${highest_bid.user.email}) hat das Bild «${updated_article.title}» für CHF ${highest_bid.amount}.— ersteigert.` // plain text body
            }; 
            transporter.sendMail(confirmationMailOptions, function(error, info) {
              if (error) {
                return console.log(error);
              }
              console.log(`Confirmation message %s sent: %s`, info.messageId, info.response);
            }); 
            
            // proceed to render 
            res.render('index', { title: 'Versteigerung beendet', article: updated_article, bids: results[1], csrfToken: req.csrfToken() });
            return;
          });
        }
      } else { // article hasn’t expired yet OR is already sold
        // Titel "übersicht" muss besser werden
        res.render('index', { title: 'Auktion', article: results[0], bids: results[1], csrfToken: req.csrfToken() /* bid_success: req.session.bid_success ? req.session.bid_success : null, bid_err: req.session.bid_err ? req.session.bid_err : null */ });
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
    var username = req.session.user.name;
    process_valid_form(bid, results.user[0].email, username, update_base_price);
  } else {
    // req.session.bid_err = 'Bid too low.' < ---------------------------------was, was, was – das brauchts genau noch !!!!!!!!!!!
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

  function process_valid_form(bid, mail, username, callback) {
    bid.save(function (err) {
      if (err) { return next(err); }
      // Bid saved. Redirect to bid detail page

      // Confirmation mail to bidder
      var mailOptions = {
        from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>',
        to: mail, // list of receivers
        subject: 'Gebot eingegangen', // Subject
        text: `Guten Tag ${username}

Ihr Gebot über ${bid.amount} CHF ist eingeangen – vielen Dank.

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
        console.log(`Message %s sent: %s`, info.messageId, info.response);
      }); 

      // Confirmation mail to bidder
      // change admin address depending on environment
      var adminAddress = (req.app.get('env') != 'development') ? '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>' : '"Josef Renner" <josef.renner@gmail.com>';
      var confirmationMailOptions = {
        from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>',
        to: adminAddress,
        subject: 'Gebot eingegangen', // Subject
        text: `${username} hat ${bid.amount} geboten.`// plain text body
      }; 
      transporter.sendMail(confirmationMailOptions, function(error, info) {
        if (error) {
          return console.log(error);
        }
        console.log(`Message %s sent: %s`, info.messageId, info.response);
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
    .sort({ 'createdAt': -1 })
    .limit(1)
    .exec(function(err, data) {
      var article = data[0];
      var price = data[0].instant_buy_price;
      // console.log('preis:' + price);
      console.log('verkauft:', article.title);
      // Angebotsstatus auf verkauft und inaktiv setzen
      // base_price wird angepasst, daran lässt sich auch das höchstgebot ablesen
      Article.findByIdAndUpdate( article._id, { base_price: price,  sold: true, active: false }, function(err, updated_article) {
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
            from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>', // sender address
            to: user[0].email, // list of receivers
            subject: `Ersteigert: ${updated_article.title}`, // Subject
            text: `Guten Tag ${user[0].name}
 
Sie haben das Bild «${updated_article.title}» für ${bid.amount} CHF ersteigert – herzlichen Glückwunsch.

Françoise Nussbaumer wird Sie in Kürze kontaktieren, um den Versand zu klären.

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

          // change admin address depending on environment
          var adminAddress = (req.app.get('env') != 'development') ? '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>' : '"Josef Renner" <josef.renner@gmail.com>';
          var confirmationMailOptions = {
            from: '"Françoise Nussbaumer" <mail@francoisenussbaumer.ch>', // sender address
            to: adminAddress, // list of receivers
            subject: `Versteigert: ${updated_article.title}`, // Subject
            text: `${user[0].name} (${user[0].mail}) hat das Bild «${updated_article.title}» für ${bid.amount} CHF ersteigert.` // plain text body
          }; 
          transporter.sendMail(confirmationMailOptions, function(error, info) {
            if (error) {
              return console.log(error);
            }
            console.log('Confirmation message %s sent: %s', info.messageId, info.response);
          }); 
          res.redirect('/'); // besser wäre natürlich eine art bestätigungsseite/modal
          // folgendes ginge auch, aber eigentlich nicht nötig?????????? // res.render('index', { title: 'Versteigerung beendet', article: updated_article });
        });
      });
    });
  });
};


// schnell, schnell Artikel wieder einstellen
exports.reset_article = function(req, res) {
  Article.find({})
    .sort({ 'createdAt': -1 })
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
