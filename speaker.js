(function(w){
  w.speaker = {
    speaking: false,
    queue: [],
    init: function(){
      var self = this;
      setInterval(function(){
        if(self.queue.length > 0) {
          var msg = self.queue[0];
          if(!self.speaking) {
            speechSynthesis.speak(msg);
            self.queue.shift();
          }
        }
      }, 1000);
    },
    speak: function(text){
      var self = this;
      var msg = new SpeechSynthesisUtterance();
      msg.volume = 10;
      msg.rate = 0.1;
      msg.pitch = 10;
      msg.text = text;
      msg.lang = 'ja-JP';
      msg.continuous = false;
      msg.onerror = function(e) {
        self.speaking = false;
        console.log(e);
      };
      msg.onstart = function() {
        console.log('start');
        self.speaking = true;
      };
      msg.onend = function() {
        console.log('end', self.queue);
        self.speaking = false;
      };
      msg.boundary = function() {
        self.speaking = false;
      };
      if (msg instanceof SpeechSynthesisUtterance) {
        this.queue.push(msg);
      }
    }
  };
})(window);
