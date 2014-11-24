(function(w, Vue, $, _){
  'use strict';

  w.speaker.init();

  var notify = function(){
    document.getElementById("sound-pi").currentTime = 0;
    document.getElementById("sound-pi").play();
  };
  var countdown = function(){
    document.getElementById("sound-countdown").currentTime = 0;
    document.getElementById("sound-countdown").play(100);
  };
    var alerm = function(){
    document.getElementById("sound-alerm").currentTime = 0;
    document.getElementById("sound-alerm").play(100);
  };
  var toSec = function(msec) {
    var seconds = Math.floor(msec/1000);
    var mseconds = msec - (seconds * 1000);

    return seconds + '秒' + mseconds;
  };
  
  Vue.filter('laptime', function(t){
    var hours = Math.floor(t / 3600000);
    var minutes = Math.floor((t - hours * 3600000)/60000);
    var seconds = Math.floor((t - hours * 3600000 - minutes * 60000)/1000);
    var mseconds = Math.floor((t - hours * 3600000 - minutes * 60000 - seconds * 1000));
    // format
    hours = ( '0' + hours ).slice( -2 );
    minutes = ( '0' + minutes ).slice( -2 );
    seconds = ( '0' + seconds ).slice( -2 );
    mseconds = ( '00' + mseconds ).slice( -3 );

    return hours + ':' + minutes + ':' + seconds + '.' + mseconds;
               
  });

  var watch;
  var laptimer = new Vue({
    data: {
      reports: [],
      results: [],
      drivers: [],
      number: ''
    },
    ready: function() {
      $('#number').focus();
    },
    methods: {
      driver: function(number){
        var driver = _.where(this.drivers, {number: number}).shift();
        return driver.name;
      },
      clear: function(number){
        var reports = _.filter(this.reports, function(r) { return r.number !== number; });
        this.reports = reports;
        var results = _.filter(this.results, function(r) { return r.number !== number; });
        this.results = results;
        $('#number').focus();
      },
      save: function(e) {
        notify();
        var car = _.where(this.drivers, {number: this.number});
        if (_.isEmpty(car)) {
          this.drivers.push({number: this.number, name: this.number});
        }
        var now = new Date();

        var result = {
          number: this.number,
          start: 0,
          total: 0,
          laps: 0,
          lap: 0
        };

        var latest = _.chain(this.results)
        .filter(function(r){ return r.number == result.number; })
        .first()
        .value();

        if (latest === undefined) {
          latest = result;
          latest.start = now.getTime();
        }
        
        result.laps = latest.laps + 1;
        result.start = latest.start;
        result.total = now.getTime() - result.start;
        result.lap = result.total - latest.total;

        this.results.unshift(result);
        this.number = '';

        e.stopPropagation();

        return result;
      }
    }
  });
  
  // free mode
  w.free = laptimer.$addChild({
    inherit: true,
    el: '#free',
    methods: {
      save: function(e) {
        var result = laptimer.save(e);
        w.speaker.speak(this.driver(result.number)  + '、'  + toSec(result.lap));
        this.update(result);
      },
      update: function(result){
        var report = _.filter(this.reports, function(r) { return r.number === result.number; });

        if (_.isEmpty(report)) {
          result.best = 0;
          this.reports.push(result);
        } else {
          var r = report[0];
          var idx = _.indexOf(this.reports, r);
          if (r.best == 0 || (r.best > result.lap)) {
            result.best = result.lap;
            w.speaker.speak(this.driver(r.number) + ' ベストラップ 更新');
          } else {
            result.best = r.best;
          }
          this.reports.$set(idx, result);
        }
      }
    }
  });

  // race mode
  w.race = laptimer.$addChild({
    inherit: true,
    el: '#race',
    data: {
      watch: 0,
      firstestlap: {number: '', lap:0 },
      total: 240,
      onTheRace: false
    },
    methods: {
      save: function(e) {
        var result = laptimer.save(e);
        this.update(result);
      },
      countdown: function(callback){
        // callback 地獄 
        setTimeout(function() {
          $('body').css('background-color', 'yellow');
          countdown();
          setTimeout(function() {
            $('body').css('background-color', 'orange');
            setTimeout(function() {
              $('body').css('background-color', 'red');
              setTimeout(function() {
                $('body').css('background-color', 'white');
                callback();
              }, 1000 );
            }, 1000 );
          }, 1000 );
        }, 5000 );
      },
      start: function(){
        $('#number').focus();
        w.speaker.speak('まもなくレース開始です');
        var self = this;
        this.countdown(function(){
          self.onTheRace = true;
          var start = (new Date()).getTime();
          _.each(self.results, function(r){
            r.start = start;
          });
          var time = 0;
          watch = setInterval(function (){
            time = time + 1000;
            self.watch = (self.total * 1000) - time;
            // 30秒ごとにアナウンス
            if ((self.watch) % 30000 == 0) {
              w.speaker.speak('残り' + (self.watch / 60000) + '分です');              
            }
            if (self.watch == (self.total * 1000) / 2) {
              self.broadcast();
            } else if (self.watch <= 0) {
              clearTimeout(watch);
              self.onTheRace = false;
              alerm();
              w.speaker.speak('レース終了です。ゴールしてください');
            }
          }, 1000);
        });
      },
      stop: function(){
        clearTimeout(watch);
        this.onTheRace = false;
        this.watch = 0;
        w.speaker.speak('レースを中断しました');
        $('#number').focus();
      },
      broadcast: function() {
        var first = this.reports[0];
        w.speaker.speak('現在1位は、' + this.driver(first.number) + 'で、' + first.laps + '周目です。');
        var second = this.reports[1];
        if (!_.isEmpty(second)) {
          w.speaker.speak('2位は、' + this.driver(second.number) + 'で、' + second.laps + '周目です');
        }
      },
      update: function(result){
        var report = _.filter(this.reports, function(r) { return r.number === result.number; });

        if (_.isEmpty(report)) {
          result.best = 0;
          this.reports.push(result);
        } else {
          var r = report[0];
          var idx = _.indexOf(this.reports, r);
          if (r.best == 0 || (r.best > result.lap)) {
            result.best = result.lap;
            if (this.firstestlap.lap == 0 || this.firstestlap.lap > result.best) {
              w.speaker.speak(this.driver(r.number) + ' ファーステストラップ 更新しました');
              this.firstestlap = {
                number: r.number,
                lap: result.best
              };
            }
          } else {
            result.best = r.best;
          }
          this.reports.$set(idx, result);
        }

        this.reports = _.sortBy(this.reports, function(r){
          return r.laps * -1;
        });
      }
    }
  });
})(window, Vue, jQuery, _);
