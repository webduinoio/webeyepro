(async function () {

  class WebEyePro {
    constructor(mqtt, devId, canvasEle) {
      this.canvasEle = canvasEle;
      this.mqtt = mqtt;
      this.devId = devId;
      this.setSubscriber();
    }

    setSubscriber() {
      var self = this;
      this.mqtt.onMessage(this.devId + '/state', function (msg) {
        var cmd = '';
        var data = '';
        if (msg.indexOf(' ') > 0) {
          cmd = '_' + msg.substring(0, msg.indexOf(' ')) + '_';
          data = msg.substring(msg.indexOf(' ') + 1);
        } else {
          cmd = '_' + msg + '_';
        }
        self[cmd](data);
      });
    }

    snapshot() {
      var name = this.devId + '/snapshot';
      console.log("pub " + name);
      this.mqtt.send({ topic: name, message: '' });
    }

    info() {
      var name = this.devId + '/info';
      console.log("pub " + name);
      this.mqtt.send({ topic: name, message: '' });
    }

    _info_(info) {
      console.log(this.devId + " info:" + info);
    }

    _waiting_(msg) {
      console.log(this.devId + " waiting...");
    }

    _uploading_(msg) {
      console.log(this.devId + " uploading...");
    }

    _upload_(strFileInfo) {
      var fileInfo = JSON.parse(strFileInfo.replaceAll("'", '"'));
      console.log(fileInfo);
      var url = 'https://drive.google.com/uc?export=view&id=' + fileInfo['id'];
      var name = fileInfo['name'];
      name = name.replace('snap-', '');
      this.draw(url, name);
    }

    draw(imgURL, text) {
      var canvas = this.canvasEle;
      var ctx = canvas.getContext('2d');
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, canvas.width, canvas.height);
        ctx.font = "10px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText(text, 10, 10)
      };
      img.src = imgURL;
    }
  }

  var webeye = [];
  var canvas = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
  var topics = location.hash.substring(1).split(',');

  var mqtt = new webduino.module.mqttClient();
  await mqtt.connect();

  for (var i = 0; i < topics.length; i++) {
    var canvasEle = document.getElementById(canvas[i]);
    webeye.push(new WebEyePro(mqtt, topics[i], canvasEle));
  }

  function render() {
    layout.className = ''
    layout.classList.add(window.innerWidth > window.innerHeight ? "container1" : "container2");
    for (var i = 0; i < webeye.length; i++) {
      webeye[i].snapshot();
    }
  }

  render();
  setInterval(function () {
    render();
  }, 20 * 1000);

}());