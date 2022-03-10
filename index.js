(async function () {
  if(location.hash.length==0){
    document.getElementsByClassName('btn-show')[0].innerHTML = "錯誤！尚未指定裝置 ID";
    return;
  }
  var topic = location.hash.substring(1);
  imgWait = 'https://st2.depositphotos.com/1561359/7281/v/600/depositphotos_72813225-stock-illustration-stamp-please-wait-in-red.jpg';
  imgTitle = 'https://live.staticflickr.com/1811/42114447255_eaa58e1545_n.jpg';
  gimg.src = imgTitle;

  class MQTT {
    async init(topic) {
      var self = this;
      this.topic = topic;
      this.cb = function (msg) { console.log("recv:", msg); }
      this.mqtt = new webduino.module.mqttClient();
      await this.mqtt.connect();
      await this.mqtt.onMessage(topic + '/state', async (msg) => {
        self.cb(msg);
      });
      return this;
    }
    onMsg(cb) {
      this.cb = cb;
    }
    pub(name, msg) {
      this.mqtt.send({ topic: this.topic + name, message: msg });
    }
  }

  class Btn {
    constructor(eleClass) {
      this.cb = function () {}
      this.btn = document.getElementsByClassName(eleClass)[0];
      var self = this;
      this.btn.addEventListener("click", function (e) {
        self.cb(self.refObj, e);
      });
    }
    onClick(self, cb) {
      this.cb = cb;
      this.refObj = self;
      return this;
    }

    color(c) {
      this.btn.style.color = c;
    }
  }

  class UI {
    constructor(devId) {
      var self = this;
      this.devId = devId;
      this.display = document.getElementsByClassName('btn-show')[0];
      this.createButton();
      this.createCronModel();
      this.createFolderModel();
      this.info = {}
    }

    createButton() {
      this.btnCam = new Btn('btn-cam').onClick(this, this.btn_cam);
      this.btnCron = new Btn('btn-cron').onClick(this, this.btn_cron);
      this.btnFolder = new Btn('btn-folder').onClick(this, this.btn_folder);
    }


    createCronModel() {
      var self = this;
      self.cron_modal = document.getElementById("cron-modal");

      document.getElementById("cron-set")
        .addEventListener("click", function (e) {
          self.show("定時設定更新中...");
          // update cronEnable
          self.info['enableCron'] = cronEnable.checked;
          self.btnCron.color(cronEnable.checked ? '#33ee33' : '#ee3333');
          self.mqtt.pub('/enableCron', cronEnable.checked ? 'True' : 'False');
          // update sendTime
          var radioSendTime = document.querySelector('input[name="sendTime"]:checked');
          self.info['sendTime'] = radioSendTime.value;
          self.mqtt.pub('/sendTime', self.info['sendTime']);
          self.cron_modal.close();
        });

      document.getElementById("cron-close")
        .addEventListener("click", function (e) {
          // update cronEnable
          cronEnable.checked = self.info['enableCron'];
          self.btnCron.color(cronEnable.checked ? '#33ee33' : '#ee3333');
          // update sendTime
          var sendTimeVal = self.info['sendTime'];
          var sendTimeEle = document.getElementById('min' + sendTimeVal);
          sendTimeEle.checked = self;
          self.cron_modal.close();
        });
    }

    createFolderModel() {
      var self = this;
      self.folder_modal = document.getElementById("folder-modal");
      document.getElementById("folderURL")
        .addEventListener("focus", function (e) {
          folderURL.value = '';
        });
      document.getElementById("folder-set")
        .addEventListener("click", function (e) {
          var data = folderURL.value.split('folders/');
          var folderId = data[1];
          self.show("資料夾更新中...");
          self.mqtt.pub('/folderId', folderId);
          folderURL.style['display'] = 'none'
          self.folder_modal.close();
        });
      document.getElementById("folder-open")
        .addEventListener("click", function (e) {
          window.open(folderURL.value, '_blank');
        });
      document.getElementById("folder-close")
        .addEventListener("click", function (e) {
          folderURL.style['display'] = 'none'
          self.folder_modal.close();
        });
    }

    async connect() {
      this.mqtt = await new MQTT().init(this.devId);
      this.mqttpub_info("");
      var self = this;
      this.mqtt.onMsg(function (msg) {
        var cmd = 'mqttsub_';
        var data = '';
        if (msg.indexOf(' ') > 0) {
          cmd += msg.substring(0, msg.indexOf(' '));
          data = msg.substring(msg.indexOf(' ') + 1);
        } else {
          cmd += msg;
        }
        self[cmd](data);
      });
    }

    setInfo(info) {
      info = info.replaceAll('True', 'true');
      info = info.replaceAll('False', 'false');
      info = info.replaceAll("'", '"');
      this.info = JSON.parse(info);
      folderURL.value = "https://drive.google.com/drive/u/0/folders/" + this.info['folderId'];
      this.btnCam.color('white');

      // update cronEnable
      cronEnable.checked = this.info['enableCron'];
      this.btnCron.color(cronEnable.checked ? '#33ee33' : '#ee3333');

      // update sendTime
      var sendTimeVal = this.info['sendTime'];
      var sendTimeEle = document.getElementById('min' + sendTimeVal);
      sendTimeEle.checked = true;

      this.btnFolder.color('white');
    }

    getInfo() {
      return this.info;
    }

    btn_cam(self, e) {
      self.mqtt.pub('/snapshot', "");
    }

    btn_cron(self, e) {
      self.cron_modal.showModal();
    }

    btn_folder(self, e) {
      self.folder_modal.showModal();
      folderURL.style['display'] = ''
    }

    mqttpub_info(data) {
      this.mqtt.pub('/info', data);
    }

    mqttpub_scriptURL(data) {
      this.mqtt.pub('/scriptURL', data);
    }

    mqttpub_reboot(data) {
      this.mqtt.pub('/reboot', data);
    }

    mqttsub_reboot(data) {
      this.show("WebEye Pro 重新開機...");
    }

    mqttsub_ready(info) {
      this.setInfo(info);
      this.show("WebEye Pro 上線");
    }

    mqttsub_info(info) {
      var self = this;
      this.setInfo(info);
      this.show("更新 WebEye Pro 設定資訊");
      setTimeout(function () {
        self.show("WebEye Pro");
      }, 2000);
      //console.log("info:", this.getInfo());
    }

    mqttsub_setOK(info) {
      var self = this;
      if (info == 'folderId') {
        self.show("資料夾更新完成");
        setTimeout(function () {
          self.show("WebEye Pro");
        }, 2000);
      }
      if (info == 'enableCron') {
        self.show("定時設定更新完成");
        setTimeout(function () {
          self.show("WebEye Pro");
        }, 2000);
      }
    }

    mqttsub_ping(data) {
      this.show("連線中...");
    }

    mqttsub_pong(data) {
      this.show("連線完成");
    }

    mqttsub_waiting(data) {
      this.show("WebEye Pro 拍照中...");
    }

    mqttsub_uploading(data) {
      this.show("照片讀取中...");
      gimg.src = imgWait;
    }

    async mqttsub_upload(strFileInfo) {
      var self = this;
      var fileInfo = JSON.parse(strFileInfo.replaceAll("'",'"'));
      this.show("照片讀取中...");
      //console.log("fileInfo....", fileInfo);
      self.show(fileInfo['name']);
      gimg.src = 'https://drive.google.com/uc?export=view&id=' + fileInfo['id']
      //console.log("OK:", fileInfo['id']);
    }

    show(text) {
      this.display.innerHTML = text;
    }
  }

  var ui = new UI(topic);
  await ui.connect();
}());