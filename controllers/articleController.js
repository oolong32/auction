var Article = require('../models/article');
var Bid = require('../models/bid');
var User = require('../models/user.js');
var fs = require('fs');
var async = require('async');
var path = require('path');

// Display list of all Articles
exports.article_list = function(req, res, next) {
  Article.find()
    .sort([['date', 'descending']])
    .exec(function (err, list_articles) {
      if (err) { return next(err); }
      //Successful, so render
      res.render('article_list', {
        title: 'Auflistung Bilder',
        article_list: list_articles
    });
  });
};

// GET Article Detail
exports.article_detail_get = function(req, res, next) {
   async.parallel({
    article: function(callback) {  
      Article.findById(req.params.id)
        .populate('bids')
        .exec(callback);
    },
    bid_list: function(callback) {
      Bid.find({ 'article': req.params.id })
      .populate('user')
      .sort({amount: 'desc'})
      .exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }

    // check time to expiration
    var now = Date.now();
    console.log(results.article);
    var date = results.article.createdAt.getTime();
    var expiration = date + 7*24*60*60*1000;
    var remaining =  expiration - now;

    var rmg_secs = remaining / 1000;
    var rmg_hours = parseInt(rmg_secs / 3600);
    var rmg_days = parseInt(rmg_hours / 24);
    rmg_hours %= 24;
    rmg_secs %= 3600; // extract hours
    var rmg_mins = parseInt(rmg_secs / 60);
    rmg_secs %= 60; // extract minutes
    rmg_secs = parseInt(rmg_secs);

    console.log(rmg_days + ':' + rmg_hours + ':' + rmg_mins + ':' + rmg_secs + ' remaining');

    //Successful, so render
    res.render('article_detail', {
      title: 'Angebot Details',
      article: results.article,
      bid_list: results.bid_list
    });
  }); 
};

// GET form to create Articles
exports.article_create_get = function(req, res, next) {
  res.render('article_create_form', {
    title: 'Bild erfassen'
  });
};

// POST form to create Articles
exports.article_create_post = function(req, res, next) {
  req.checkBody('title', 'Titel angeben').notEmpty(); 
  req.checkBody('description', 'Beschreibung angeben').notEmpty(); 
  req.checkBody('base_price', 'Preise in ganzen Zahlen angeben, bitte').isInt();
  req.checkBody('instant_buy_price', 'Preise in ganzen Zahlen angeben, bitte.').isInt();
  // req.checkBody('image', 'Bild für Upload wählen').notEmpty();

  //Trim and escape the name field.
  req.sanitize('title').escape();
  req.sanitize('title').trim();
  req.sanitize('description').escape();
  req.sanitize('description').trim();
  req.sanitize('base_price').escape();
  req.sanitize('base_price').trim();
  req.sanitize('instant_buy_price').escape();
  req.sanitize('instant_buy_price').trim();

  //Run the validators
  var errors = req.validationErrors();

  //Create a genre object with escaped and trimmed data.
  var article = new Article(
    { title: req.body.title,
      description: req.body.description,
      start_price: req.body.base_price, // Grundpreis, ändert sich nicht
      base_price: req.body.base_price - 10, // Trick 77, damit es richtig beginnt
      instant_buy_price: req.body.instant_buy_price,
      image_filename: req.file.filename
    });

  if (errors) {
    // If there are errors render the form again, passing the
    // previously entered values and errors
    res.render('article_create_form', {
      title: 'Bild erfassen',
      article: article,
      errors: errors
    });
    return;
  } 
  else {
    // Data from form is valid.
    // Check if Article with same title already exists
    // it would probably be better to check the filename?
    Article.findOne({ 'title': req.body.title })
      .exec( function(err, found_article) {
        console.log('found_article: ' + found_article);
        if (err) { return next(err); }

        if (found_article) { 
          // Article exists, redirect to its detail page
          res.redirect(found_article.url);
        }
        else {
          article.save(function (err) {
            if (err) { return next(err); }
            // Article saved. Redirect to user detail page
            res.redirect(article.url);
          });
        }
    });
  }
};

// Display Article update form on GET
exports.article_update_get = function(req, res, next) {
  req.sanitize('id').escape();
  req.sanitize('id').trim();
  //Get Article data for form
  async.parallel({
      article: function(callback) {
          Article.findById(req.params.id).exec(callback);
      }
  }, function(err, results) {
    if (err) { return next(err); }
    console.log(results.article);
    res.render('article_create_form', {
      title: 'Datensatz aktualisieren',
      article: results.article
    });
  });
};

// Display Article update form on POST
exports.article_update_post = function(req, res, next) {
  req.checkBody('title', 'Titel angeben').notEmpty(); 
  req.checkBody('description', 'Beschreibung angeben').notEmpty(); 
  req.checkBody('base_price', 'Preise in ganzen Zahlen, bitte.').isInt();
  req.checkBody('instant_buy_price', 'Preise in ganzen Zahlen, bitte.').isInt();
  // console.log(req.file);
  // console.log(req.file.filename);

  //Trim and escape the name field.
  req.sanitize('title').escape();
  req.sanitize('title').trim();
  req.sanitize('description').escape();
  req.sanitize('description').trim();
  req.sanitize('base_price').escape();
  req.sanitize('base_price').trim();
  req.sanitize('instant_buy_price').escape();
  req.sanitize('instant_buy_price').trim();

  //Run the validators
  var errors = req.validationErrors();

  // Check database for existing image
  Article.findById(req.params.id, function(err, foo) {
    if (err) {console.log(err);}
    // check image, replace/delete if neccessary
    if (req.file) { // there is a file-upload
      if (foo.image_filename) { // there’s already an image, let’s unlink it
        var p = path.join(__dirname, '../public/uploads')
        p += '/' + foo.image_filename;
        fs.unlink(p, function(err) {
          if (err) {console.log(err);}
          Article.findByIdAndUpdate(req.params.id, {image_filename: req.file.filename}, function(err, x) { // write new image filename to database
            if (err) {console.log(err);}
          });
        });
      }
    }
    // create article
    article = new Article(
      { title: req.body.title,
        description: req.body.description,
        start_price: req.body.base_price,
        base_price: req.body.base_price, // dieses Feld wird später mit jedem Gebot erhöht
        instant_buy_price: req.body.instant_buy_price,
        // if there was an upload we want the new image, else the existing one
        image_filename: req.file ? req.file.filename : foo.image_filename, // can’t get only foo.image_filename, because database update (see above) might not be done yet.
        _id:req.params.id
      });    
    // call function with article
    handleArticleData(article);
  });

  function handleArticleData(article) {
    if (errors) {
      //If there are errors render the form again, passing the previously entered values and errors
      console.log('Update article failed, retry.');
      // wenn hier das bild noch einmal ausgewechselt wird, gibts einen fehler :-(
      // auf dem server und in der datenbank wird alles korrekt geschrieben, aber in der darstellung klappt es nicht. ev. werden noch die alten daten übergeben?
      res.render('article_create_form', { title: 'Datensatz erneut aktualisieren', article: article, errors: errors });
      return;
    } 
    else {
      Article.findByIdAndUpdate(req.params.id, article, {}, function (err, thearticle) {
        if (err) { return next(err); }
        // Article saved. Redirect to user detail page
        res.redirect(thearticle.url);
      });
    }
  }
}

// Display Article delete form on GET
exports.article_delete_get = function(req, res, next) {
  async.parallel({
    article: function(callback) {     
      Article.findById(req.params.id).exec(callback);
    },
    article_bids: function(callback) {
      Bid.find({ 'article': req.params.id }).populate('user').exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Successful, so render
    res.render('article_delete', {
      title: 'Datensatz löschen',
      article: results.article,
      article_bids: results.article_bids
    });
  });
};

// Handle Article delete on POST
exports.article_delete_post = function(req, res, next) {
  req.checkBody('articleid', 'Bild-ID muss existieren').notEmpty();  
  // console.log('try deleting article ' + req.body.articleid);
  async.parallel({
    article: function(callback) {     
      Article.findById(req.body.articleid).exec(callback);
    },
    articles_bids: function(callback) {
      Bid.find({ 'article': req.body.articleid },'was ist das hier? Fehlermeldung fals nicht gefunden?').exec(callback);
    }
  }, function(err, results) {
    if (err) { return next(err); }
    //Success
    if (results.article_bids>0) {
      //Author has bids. Render in same way as for GET route.
      res.render('article_delete', {
        title: 'Datensatz löschen',
        article: results.article,
        article_bids: results.article_bids
      });
      return;
    }
    else {
      // Article has no bids. Delete Article and redirect to the list of articles.
      // Gibt es ein Bild?
      Article.findById(req.body.articleid).exec(function(err, data) {
        console.log('found image ' + data.image_filename);
        var p = path.join(__dirname, '../public/uploads')
        p += '/' + data.image_filename;
        fs.unlink(p, function(err) {
          if (err) {console.log(err);}
        });
      });
      Article.findByIdAndRemove(req.body.articleid, function deleteArticle(err) {
        if (err) { return next(err); }
        //Success - got to article list
        res.redirect('/article');
      });
    }
  });
};
