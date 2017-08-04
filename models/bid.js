var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var BidSchema = Schema({
  amount: {type: Number, required: true, validate: {validator: Number.isInteger, message: '{Value} ist keine Zahl.'}},
  article: { type: Schema.ObjectId, ref: 'Article', required: true }, //reference to the associated article
  user: { type: Schema.ObjectId, ref: 'User', required: true }, //reference to the associated article
  // nicht sicher: article und user sollten vielleicht keine referenzen auf andere felder in modellen sein, sonder ein string, der dazu dient, die anderen modelle anzusteuern, oder?
  // was braucht es?
  // datum?
});

// Virtual for bid's URL
BidSchema
.virtual('url')
.get(function () {
  return '/bid/' + this._id;
});

//Export model
module.exports = mongoose.model('Bid', BidSchema);
