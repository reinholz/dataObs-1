/*
* JS file for observatory.js
*/
var Stopwatch = require('stopwatchjs');
var timer = new Stopwatch();
//var timerUpdate;
var lastChoices = {};

import * as observation_helpers from '/client/helpers/observations.js'

Template.observatory.created = function() {
  Session.set('envId', Router.current().params._envId);
  const obsId = Router.current().params._obsId;
  // observation_helpers.createTableOfContributions(obsId);

  var labelsObj = SequenceParameters.find({'children.envId':Router.current().params._envId}).fetch();

  var parameterPairs = labelsObj[0]['children']['parameterPairs'];
  seqLabels = []
  for (i=0;i<parameterPairs;i++) {
    if (!labelsObj[0]['children']['label'+i]) {
      return;
    } else {
      seqLabels[i] = labelsObj[0]['children']['label'+i].replace(/\s+/g, '').replace(/[^\w\s]|_/g, "")
    }
  }
  aTagSelectArray = []
}

// Updates Timerq
function clockSet() {
  var secs = timer.value;
  var hours = Math.floor(secs / (60*60));
  if (hours < 10) {
    hours = '0' + hours;
  }
  var divisor_for_minutes = secs % (60 * 60);
  var minutes = Math.floor(divisor_for_minutes / 60);
 if (minutes < 10) {
    minutes = '0' + minutes;
  }
  var divisor_for_seconds = divisor_for_minutes % 60;
  var seconds = Math.ceil(divisor_for_seconds);
  if (seconds < 10) {
    seconds = '0' + seconds;
  }
  //$('#obs-timer').text(''+hours+':'+minutes+':'+seconds);
}

//Create Timer and Toggle Options
Template.observatory.rendered = function() {
  var obs = Observations.find({_id: Router.current().params._obsId}).fetch()[0];
  var seqParams = SequenceParameters.find({'children.envId': Router.current().params._envId}).fetch()[0];
  var timerVal = obs.timer;
  timer.value = timerVal;
  timer.start();

  //timerUpdate = setInterval(clockSet, 1000);

  var paramPairs = seqParams.children.parameterPairs;
  if (paramPairs) {
      for (var p=0; p<paramPairs;p++){
        if(seqParams['children']['toggle'+p] == "on") {
          var params = seqParams['children']['parameter'+p]
          var label = seqParams['children']['label'+p]
          createToggle(params, label);
        }
      }
  }


  var params = "Blank,Last Choices";
  var label = "Contribution Defaults";

  createToggle(params, label);

  $(document).keyup(function(e) {
     if (e.keyCode == 27) {
        $('#seq-param-modal').removeClass('is-active');
      $('#seq-data-modal').removeClass('is-active');
    }
  });
}

function createToggle(params, label) {
  if (params) {
    var choices = params.split(',');
    togglers = $('.toggle-dash');
    var wrap = $('<div/>', {class: 'column c--observation__toggle-container'}).appendTo(togglers);
    $("<p/>",{
      text: label,
      class: 'c--observation-toggle__label o--modal-label',
    }).appendTo(wrap);
    var span = $('<span/>').appendTo(wrap);

    var select = $('<select/>', {
        class:"c--observation-toggle_select",
        data_label: label
      }).appendTo(span);

    for (var c in choices) {
      $('<option/>', {
        value: choices[c],
        text: choices[c]
      }).appendTo(select);
    }
  }
}

Template.observatory.helpers({
  environment: function() {
    var env = Environments.find({_id: Router.current().params._envId}).fetch()[0];
    return env;
  },
  observation: function () {
    var obs = Observations.find({_id: Router.current().params._obsId}).fetch()[0];
    return obs;
  },
  subject: function() {
    return Subjects.find({envId: this.envId});
  }
});

Template.observatory.events({
  'click .back-head-params': function(e) {
    //Save stopwatch value
    timer.stop();
    //clearInterval(timerUpdate);
    curr_time = timer.value;
    update = {obsId: Router.current().params._obsId, timer: curr_time};
    Meteor.call('timerUpdate', update);
    Router.go('observationList', {_envId:Router.current().params._envId});
  },
  'click .dragger': function(e) {
    //Create Sequence
    ga('Sequences', 'Add');

    var myId;
    if ($(e.target).is('p')) {
      myId = $(e.target).parent().attr('id')
    } else {
      myId = $(e.target).attr('id');
    }

    observation_helpers.populateParamBoxes(myId);
    $('#seq-param-modal').addClass('is-active');
  },
  'click .help-button': function (e) {
    $('#help-env-modal').addClass("is-active");
  },
  'click #help-close-modal': function(e) {
    $('#help-env-modal').removeClass("is-active");
  },
  'click .modal-card-foot .button': function(e) {
    $('#help-env-modal').removeClass("is-active");
  },
  'click .modal-background': function(e){
    $('#seq-param-modal').removeClass('is-active');
    $('#seq-data-modal').removeClass('is-active');
    $('#help-env-modal').removeClass("is-active");
  },
  'click .modal-close': function(e){
    $('#seq-param-modal').removeClass('is-active');
    $('#seq-data-modal').removeClass('is-active');
  },
  'click .edit-observation-name': function(e) {
    editObservationName(this._id);
  },
  'click #delete-observation': function(e) {
    deleteObservation(this._id);
  },
  'click #save-seq-params': function(e) {
    var info = {};
    info['studentId'] = $('.js-modal-header').attr('data_id');
    info['Name'] = $('.js-modal-header').attr('data_name');
    envId = Router.current().params._envId;
    obsId = Router.current().params._obsId;

    var obsRaw = Observations.find({_id: obsId}).fetch()[0];
    var choices = [];
    var labels = [];

    $('.toggle-item').each(function () {
      if ($(this).attr('data_label') == "Contribution Defaults") {
        return;
      }
      labels.push($(this).attr('data_label'));
      choices.push($(this).val());
    });

    $('.js-subject-labels').each(function () {
      var chosenElement = false;
      var chosenElements = this.nextElementSibling.querySelectorAll('.subj-box-params');

      labels.push(this.textContent);
      chosenElements.forEach(function(ele) {
        if ($(ele).hasClass('chosen')) {
            choices.push(ele.textContent.replace(/\n/ig, '').trim());
            chosenElement = true;
        }
      })

      if (chosenElement === false) {
          choices.push(undefined);
      }
    });

    for (label in labels) {
      info[labels[label]] = choices[label];
    }

    lastChoices = info;

    var sequence = {
      envId: envId,
      time: timer.value,
      info: info,
      obsId: obsId,
      obsName: obsRaw.name
    };

    Meteor.call('sequenceInsert', sequence, function(error, result) {
     if (error) {
       alert(error.reason);
     } else {
       ga('Sequences', 'Add - Success');
       $('#seq-param-modal').removeClass('is-active');
     }
   });
  },
  'click .edit-seq': function(e) {
    observation_helpers.editContribution(e);
  },
  'click .delete-seq': function(e) {
    observation_helpers.deleteContribution(e);
  },
  'click #show-all-observations':function (e){
    observation_helpers.createTableOfContributions(this._id);
    ga('Observation', 'View sequence list');
    $('#seq-data-modal').addClass('is-active');
  },
  'click #edit-seq-params': function(e) {
    seqId = $(e.target).attr('data_seq');

    var info = {};
      info['studentId'] = $('.js-modal-header').attr('data_id');
      info['Name'] = $('.js-modal-header').attr('data_name');
      envId = Router.current().params._envId;
      obsId = Router.current().params._obsId;
      var choices = [];
      var labels = [];
      $('.toggle-item').each(function () {
        if ($(this).attr('data_label') == "Contribution Defaults") {
          return;
        }
        labels.push($(this).attr('data_label'));
        choices.push($(this).val());
      });


    $('.js-subject-labels').each(function () {
      var chosenElement = false;
      var chosenElements = this.nextElementSibling.querySelectorAll('.subj-box-params');
      labels.push(this.textContent);
      chosenElements.forEach(function(ele) {
        if ($(ele).hasClass('chosen')) {
            choices.push(ele.textContent.replace(/\n/ig, '').trim());
            chosenElement = true;
        }
      })

      if (chosenElement === false) {
          choices.push(undefined);
      }
    });


      for (label in labels) {
        info[labels[label]] = choices[label];
      }

      var sequence = {
        info: info,
        seqId: seqId
      };

      Meteor.call('sequenceUpdate', sequence, function(error, result) {
       if (error) {
         alert(error.reason);
       } else {
         ga('Sequences', 'Edit - Success');
         $('#seq-param-modal').removeClass('is-active');
       }
     });

    //This should happen at the end...
    $('#seq-param-modal').removeClass('is-active');
    observation_helpers.createTableOfContributions(this._id);
    $('#seq-data-modal').addClass('is-active');
  }
});

Template.registerHelper( 'math', function () {
  return {
    mul ( a, b ) { return a * b; },
    div ( a, b ) { return b ? a / b : 0; },
    sum ( a, b ) { return a + b; },
    sub ( a, b ) { return a - b; },
  }
});


function editObservationName(obsId) {
  let context = $('.observation[data-obs-id="' + obsId + '"]');

  var obs_name = $('.observation-name', context);
  var obs_name_wrapper = $('.observation-name-wrapper', context);
  var currently_editing = !!(obs_name.hasClass('editing'));
  var save_button = $('.edit-observation-name.button', context);

  save_button.addClass('is-loading');

  if (!currently_editing) {
    obs_name_wrapper.prepend($('<input>', {
      class: 'edit-obs-name inherit-font-size',
      value: obs_name.html()
    }));

    obs_name.addClass('editing');
    obs_name.hide();
    save_button.show();

    $(context, '.edit-obs-name').on('keyup', function(e) {
      if (e.keyCode === 13) {
        save_button.click()
      }
    })
  }

  else {
    var new_obs_name = $('.edit-obs-name', context);
    var new_name = new_obs_name.val();

    var args = {
      'obsId': obsId,
      'obsName': new_name,
    };

    Meteor.call('observationRename', args, function(error, result) {
      var message;
      if (result) {
        message = $('<span/>', {
          class: 'name-save-result tag is-success inline-block success-message',
          text: 'Saved'
        });
        obs_name.html(new_name);
        ga('Observations', 'Rename');
      }
      else {
        message = $('<span/>', {
          class: 'name-save-result tag is-warning inline-block error-message',
          text: 'Failed to save. Try again later'
        })
      }
      obs_name_wrapper.append(message);

      setTimeout(function() {
        message.remove();
      }, 3000);

      return 0;
    });

    save_button.show();
    new_obs_name.remove();
    obs_name.removeClass('editing');
    obs_name.show();
  }

  save_button.removeClass('is-loading');
}

function deleteObservation(obsId) {
  var result = confirm("Are you sure you want to delete this observation?");
  if (result) {
    Meteor.call('observationDelete', obsId, function(error, result) {
      if (!error) {
        ga('Observations', 'Delete');
        Router.go('environmentList');
      }
    })
  }
}