var util = require("util");
var clc = require("cli-color");

var selectorUtil = require("../util/selector");
var BaseElCommand = require("./base/baseElCommand");

// Wait until we've seen a selector as :visible SEEN_MAX times, with a
// wait for WAIT_INTERVAL milliseconds between each visibility test.
var settings = require("../settings");
var MAX_TIMEOUT = settings.COMMAND_MAX_TIMEOUT;
var WAIT_INTERVAL = settings.WAIT_INTERVAL;
var SEEN_MAX = settings.SEEN_MAX;
var JS_SEEN_MAX = settings.JS_SEEN_MAX;

function GetEl() {
  BaseElCommand.call(this);
  this.checkConditions = this.checkConditions.bind(this);
  this.cmd = "getel";
};

util.inherits(GetEl, BaseElCommand);

GetEl.prototype.checkConditions = function () {

  var self = this;
  this.execute(
    this.executeSizzlejs, [this.selector, this.injectedJsCommand()],
    function (result) {
      // Keep a running count of how many times we've seen this element visible
      if (result.isVisible) {
        self.seenCount += 1;
      }

      var elapsed = (new Date()).getTime() - self.startTime;

      // If we've seen the selector enough times or waited too long, then 
      // it's time to pass or fail and continue the command chain.
      if (result.seens >= JS_SEEN_MAX || self.seenCount >= SEEN_MAX || elapsed > MAX_TIMEOUT) {

        // Unlike clickEl, only issue a warning in the getEl() version of this
        if (result.selectorLength > 1) {
          console.log("WARNING: getEl saw selector " + self.selector + " but result length was " + result.selectorLength + ", with " + result.selectorVisibleLength + " of those :visible");
          console.log("Selector did not disambiguate after " + elapsed + " milliseconds, refine your selector or check DOM for problems.");
        }

        if (self.seenCount >= SEEN_MAX || result.seens >= JS_SEEN_MAX) {

          var elapse = (new Date()).getTime();
          self.time.executeAsyncTime = elapse - self.startTime;
          self.time.seleniumCallTime = 0;
          self.pass();
        } else {
          self.fail();
        }
      } else {
        setTimeout(self.checkConditions, WAIT_INTERVAL);
      }
    });
};

GetEl.prototype.injectedJsCommand = function ($el) {
  return "return $el.length > 0";
};

GetEl.prototype.command = function (selector, cb) {
  this.selector = selectorUtil.normalize(selector);
  this.cb = cb;

  this.successMessage = "Selector '" + this.selector + "' was visible after %d milliseconds.";
  this.failureMessage = "Selector '" + this.selector + "' was not visible after %d milliseconds.";

  this.startTime = (new Date()).getTime();

  // Track how many times we've seen selector as :visible
  this.seenCount = 0;
  this.decide();
  this.checkConditions();

  return this;
};

module.exports = GetEl;
