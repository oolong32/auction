// erwartungsgemäss brauchts ein paar modelle:
var Article = require('../models/article');
var User = require('../models/user');
var Bid = require('../models/bid');

var async = require('async');

// render general info as json
// nur eine verkürzte Version des index-controllers, lol
exports.json = function(req, res) {
  async.waterfall([
    function(callback) {
      Article.find({})
        .sort({ 'createdAt': -1 }) // neuster Eintrag
        .limit(1)
        .exec(callback);
    },
    function(article, callback) {
      if (!article[0]) {
        res.json({
          status: 'Keine Auktion',
          article: {
            title: "Nichts",
            image_filename: null,
            description: "Es gibt noch kein Bild in der Datenbank",
            base_price: 0,
            instant_buy_price: 0,
            date_formatted: null,
            date_unformatted: 0,
            expiration_formatted: 0,
            expiration_unformatted: 0,
            permalink: null,
            active: false
          },
          bids: null
        });
        return;
      }
      var id = article[0]._id;
      Bid.find({ 'article': id })
        .populate('user')
        .sort({ 'amount': -1 })
        .exec(function(err, bids) {
        if (err) { console.error(`Trubba not, bids defunct: ${err}`); }
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
      // var expiration = date + 2*24*60*60*1000; // <---------------------------------------------- hard coded time, bad bad bad
      // it gets even worse, instead of fixing it we change it to one day ’cuz of x-mas, yay!
      var expiration = date + 1*24*60*60*1000; // <---------------------------------------------- hard coded time, bad bad bad
      var remaining =  expiration - now;

      if (remaining <= 0 && article.active == true) { // expired but not sold
        if (!highest_bid) { // there are no bids
          Article.findByIdAndUpdate(article._id,
          {
            $set: {
              active: false,
              sold: false}
          },
          {
            new: true
          },
          function(err, updated_article) {
            if (err) {console.log(err);}

            // proceed to render 
            res.json({ 
              status: 'Auktion beendet',
              article: updated_article,
              bids: results[1]
            });
            return;
          });
        } else { // there are bids, proceed
          //
          // Zu welchem Zeitpunkt passiert dies?
          // (Artikel ist nicht mehr aktiv weil Zeit abgelaufen, es gibt mindestens ein Gebot)
          // Offensichtlich, wenn die Seite aus gerendert wird. Besser wäre eine unmittelbarere Lösung
          //
          // Update article: sold, inactive
          Article.findByIdAndUpdate(article._id,
            {
              $set:
                {
                  active: false,
                  sold: true
                }
            },
            {
              new: true
            },
            function(err, updated_article) {
              if (err) {console.log(err);}
              console.log('Versteigert durch Timeout:');
              console.log(updated_article);

            // proceed to render 
            res.json({
              status: 'Auktion beendet',
              article: updated_article,
              bids: results[1]
            });
            return;
          });
        }
      } else { // article hasn’t expired yet OR is already sold
        res.json({
          status: (article.active && !article.sold) ? 'Auktion' : 'Auktion beendet',
          article: results[0],
          bids: results[1],
          // etwas blöd: url ist hart-gecodet, z.b. kein localhost
          permalink: results[0].permalink,
          localpermalink: `http://localhost:3000/uploads/${results[0].image_filename}`
      });
    }
  });
};
