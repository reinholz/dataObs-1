Template.observationsList.helpers({
  environment: function() {
    return Environments.find({_id: this._id});
  }
});