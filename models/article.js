var mongoose = require('mongoose');
var moment = require('moment');
require('moment-duration-format');

var Schema = mongoose.Schema;

var ArticleSchema = Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  start_price: { // stays the same
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{Value} ist keine Zahl.'
    }
  },
  base_price: { // gets updated
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{Value} ist keine Zahl.'
    }
  },
  instant_buy_price: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isInteger,
      message: '{Value} ist keine Zahl.'
    }
  },
  sold: {
    type: Boolean,
    required: true,
    default: false
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  image_filename: {
    type: String,
    required: false
  },
},
{
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
  // return moment(this.createdAt).add(2, 'days').locale('de-ch').format('lll');
  return moment(this.createdAt).add(1, 'days').locale('de-ch').format('lll');
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
  // return moment(this.createdAt).add(2, 'days').locale('de-ch').format();
  return moment(this.createdAt).add(1, 'days').locale('de-ch').format();
});

// Virtual for remaining time to expiration date in hours
ArticleSchema
.virtual('remaining_hours')
.get(function () {
  // Stunden in ganzen Zahlen
  // var exp = moment(this.createdAt).add(2, 'days'); // expiration date
  var exp = moment(this.createdAt).add(1, 'days'); // expiration date
  var now = moment(); // now
  return moment.duration(exp.diff(now)).format('h'); // für diesen Käse musste extra ein Plugin installiert werden
  // https://www.npmjs.com/package/moment-duration-format
});

// Virtual for remaining time to expiration date
ArticleSchema
.virtual('remaining_formatted')
.get(function () {
  // sollte 22 h vorher auf Stunden umstellen, ab 45 Min. zu Minuten.
  // Hier keine Zeit, aber scheint redundant? Siehe expiration_formatted
  return moment(this.createdAt).add(1, 'days').locale('de-ch').fromNow(true);
});

// Virtual for getting url
ArticleSchema
.virtual('permalink')
.get(function () {
  return `https://auction.francoisenussbaumer.ch/uploads/${this.image_filename}`;
});

//Export model
module.exports = mongoose.model('Article', ArticleSchema);
