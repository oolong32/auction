var mongoose = require('mongoose');
var moment = require('moment');

var Schema = mongoose.Schema;

var ArticleSchema = Schema({
  title: {type: String, required: true},
  // image_name: {type: String, required: true}, // <----------------- ???
  // image_url: {type: String, required: true},  // <----------------- ???
  description: {type: String, required: true},
  start_price: {type: Number, required: true, validate: {validator: Number.isInteger, message: '{Value} ist keine Zahl.'}}, // stays the same
  base_price: {type: Number, required: true, validate: {validator: Number.isInteger, message: '{Value} ist keine Zahl.'}},  // gets updated
  instant_buy_price: {type: Number, required: true, validate: {validator: Number.isInteger, message: '{Value} ist keine Zahl.'}},
  sold: {type: Boolean, required: true, default: false},
  active: {type: Boolean, required: true, default: true},
  image_filename: {type: String, required: false},
}, {
  timestamps: true
});

// Virtual for article’s URL
ArticleSchema
.virtual('url')
.get(function () {
  return '/article/' + this._id;
});

// Virtual for article’s date
ArticleSchema
.virtual('date_formatted')
.get(function () {
  return moment(this.createdAt).locale('de-ch').format('lll');
});

// Virtual for article’s update date
ArticleSchema
.virtual('updated_formatted')
.get(function () {
  return moment(this.updatedAt).locale('de-ch').format('lll');
});

// Virtual for article’s expiration date
ArticleSchema
.virtual('expiration_formatted')
.get(function () {
  return moment(this.createdAt).add(2, 'days').locale('de-ch').format('lll');
});

// Virtual for article’s date UNFORMATTED
ArticleSchema
.virtual('date_unformatted')
.get(function () {
  return moment(this.createdAt).locale('de-ch').format();
});

// Virtual for article’s expiration date UNFORMATTED
ArticleSchema
.virtual('expiration_unformatted')
.get(function () {
  return moment(this.createdAt).add(2, 'days').locale('de-ch').format();
});

// Virtual for remaining time to expiration date
ArticleSchema
.virtual('remaining_formatted')
.get(function () {
  // sollte 22 h vorher auf Stunden umstellen, ab 45 Min. zu Minuten.
  // Hier keine Zeit, aber scheint redundant? Siehe expiration_formatted
  return moment(this.createdAt).add(2, 'days').locale('de-ch').fromNow(true);
});

//Export model
module.exports = mongoose.model('Article', ArticleSchema);
