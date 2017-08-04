var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = Schema({
  first_name: {type: String, required: true, max: 100},
  last_name: {type: String, required: true, max: 100},
  email: {type: String, required: true, unique: true},
  password: {type: String}
  // bids: [{ type: Schema.Types.ObjectId, ref: 'Bid' }]
});

// Virtual for user’s full name
UserSchema
.virtual('name')
.get(function () {
  return this.first_name + ' ' + this.last_name;
});

// Virtual for author's URL
UserSchema
.virtual('url')
.get(function () {
  // console.log(this.name + '’s id is: ' + this._id);
  return '/user/' + this._id;
});

//Export model
module.exports = mongoose.model('User', UserSchema);

/*
In the Controller we should be able to list the bids per user as follows (?)

Bid
.find({ user : this_user._id })
.exec(function (err, bids) {
  if (err) return handleError(err);
  // returns all Bids that have this_user's id as their user.
});

*/
