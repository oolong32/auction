var express = require('express');
var multer = require('multer');
var mime = require('mime');
var path = require('path');
var bodyParser = require('body-parser');
var csrf = require('csurf');
var userLog = require('debug')('userLog');

var router = express.Router();
var bodyParser = bodyParser.urlencoded({ extended: false })
var csrfProtection = csrf();

// Require controller modules
var index_controller = require('../controllers/indexController.js')
var register_controller = require('../controllers/registerController.js')
var login_controller = require('../controllers/loginController.js')
var logout_controller = require('../controllers/logoutController.js')
var user_controller = require('../controllers/userController.js');
var bid_controller = require('../controllers/bidController.js');
var article_controller = require('../controllers/articleController.js');

// Multer (file upload)
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads'))
  },
  filename: function (req, file, cb) {
    // Dateiname, Endung für Bildupload
    cb(null, file.fieldname + '-' + Date.now() + '.' + mime.extension(file.mimetype))
  }
})
var upload = multer({
  storage: storage,
  limits: {fileSize: 2000000},
  fileFilter: function(req, file, cb) {
    var filetypes = /jpeg|jpg|png|gif/;
    var mime_type = mime.extension(file.mimetype);
    // var mime_type = filetypes.test(file.mimetype);
    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mime_type && extname) {
      return cb(null, true);
    }
    cb('Error: Es werden nur folgende Dateitypen akzeptiert: ' + filetypes)
  }
});

// Check if logged in
function requireLogin(req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

// Check if admin
function requireAdmin(req, res, next) {
  if (req.user) { // is the user logged in (redundant, if requireLogin() is called first (so what)
    // test if user belongs to admin group
    if (req.user.email != "josef.renner@gmail.com" || /\w+(\.\w+)?@francoisenussbaumer\.ch/.test(req.user.email)) {
      userLog(`${req.user.first_name} ${req.user.last_name} tried to access admin!`);
      res.redirect('/');
    } else {
      userLog('Hello Admin');
      next();
    }
  } else {
    res.redirect('/');
  }
}

// log user
function logUser(req, res, next) {
  if (req.user) {
    userLog(`User Name: ${req.user.first_name} ${req.user.last_name}`);
    userLog(`User Mail: ${req.user.email}`);
  } else {
    userLog('not logged in');
  }
  next();
}

// ROUTES

// RESET article (quick&dirty)
router.get('/reset-article', index_controller.reset_article);

// GET auction home page
router.get('/', logUser, csrfProtection, index_controller.index);

// POST auction home page (aka. bid)
router.post('/', bodyParser, requireLogin, index_controller.bid);

// GET instant buy
router.get('/instant-buy', requireLogin, index_controller.instant_buy);

// Register/Login/Logout ======================================

// GET Registration page 
router.get('/register', bodyParser, csrfProtection, register_controller.register_get);

// POST Registration page 
router.post('/register', bodyParser, csrfProtection, register_controller.register_post);

// GET new password page
router.get('/new-password', bodyParser, csrfProtection, register_controller.new_password_get);

// POST new password page
router.post('/new-password', bodyParser, csrfProtection, register_controller.new_password_post);

// GET Login page
router.get('/login', bodyParser, csrfProtection, login_controller.login_get);

// POST Login page
router.post('/login', bodyParser, csrfProtection, login_controller.login_post);

// GET Logout
router.get('/logout', logout_controller.logout);

// Users ====================================================

// GET User list
router.get('/user', user_controller.user_list);

// GET form to create User
// router.get('/user/create', user_controller.user_create_get);

// POST form to create User
// router.post('/user/create', user_controller.user_create_post);

// GET User details
router.get('/user/:id', user_controller.user_detail);

// GET request to delete User
router.get('/user/:id/delete', user_controller.user_delete_get);

// POST request to delete User
router.post('/user/:id/delete', bodyParser, user_controller.user_delete_post);

// Articles (Bilder) ========================================

// GET Article list
router.get('/article', requireAdmin, article_controller.article_list);

// GET form to create Article
router.get('/article/create', requireLogin, requireAdmin, bodyParser, article_controller.article_create_get);

// POST form to create Article
router.post('/article/create', requireLogin, requireAdmin, upload.single('image'), article_controller.article_create_post);

// GET form to update Article
router.get('/article/:id/update', bodyParser, requireAdmin, upload.single('image'), article_controller.article_update_get);

// POST form to update Article
router.post('/article/:id/update', requireAdmin, upload.single('image'), article_controller.article_update_post);

// GET Article detail
router.get('/article/:id', requireAdmin, article_controller.article_detail_get);

// GET form to delete Article
router.get('/article/:id/delete', requireAdmin, article_controller.article_delete_get);

// POST form to delete Article
router.post('/article/:id/delete', requireAdmin, bodyParser, article_controller.article_delete_post);

// Bids (Gebote) ===========================================

// Get Bid overview
router.get('/bid', requireAdmin, bid_controller.bid_list);

// GET form to create Bid
// router.get('/bid/create', bid_controller.bid_create_get);

// POST form to create Bid
// router.post('/bid/create', bid_controller.bid_create_post);

// GET Bid details
router.get('/bid/:id', requireAdmin, bid_controller.bid_detail_get);

// GET form to delete Bid
router.get('/bid/:id/delete', requireAdmin, csrfProtection, bid_controller.bid_delete_get);

// POST form to delete Bid
router.post('/bid/:id/delete', requireAdmin, bodyParser, bid_controller.bid_delete_post);

module.exports = router;
