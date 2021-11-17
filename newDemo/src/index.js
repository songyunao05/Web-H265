import {
  Player
} from './player'

const url1 = 'ws://192.168.1.115:7500/ms/wsr/media?url=rtsp://admin:12345@192.168.1.12:554/Streaming/Channels/102?transportmode=unicast&profile=Profile_101'
const url = 'ws://192.168.1.115:7500/ms/wsr/media?url=rtsp://admin:12345@192.168.1.62:554/Streaming/Channels/102?transportmode=unicast&profile=Profile_101';

export default function BasicsPlayer() {
  this.bossDiv = document.getElementById('app');
  this.url = url;
  this.filesArr = [];
  this.playerArr = [];
  this.initBasicsPlayer();
}

BasicsPlayer.prototype.initBasicsPlayer = function () {
  this.bossDiv.style.padding = '10px';
  this.bossDiv.style.display = 'flex';
  this.bossDiv.style.alignItems = 'center';
  this.bossDiv.style.flexWrap = 'wrap';
  this.bossDiv.style.justifyContent = 'space-between';
  for (let i = 0; i < 4; i++) {
    let aPlayer = document.createElement('div');
    aPlayer.style.width = '49%';
    aPlayer.id = 'aPlayer';
    if (i > 1) {
      aPlayer.style.marginTop = '30px';
    };
    this.bossDiv.appendChild(aPlayer);
  };
  let boxPlayerArr = document.querySelectorAll('#aPlayer');
  boxPlayerArr.forEach((item, index) => {
    let iDiv = this.getContentLabel('i', index);
    item.appendChild(iDiv);
    let cDiv = this.getContentLabel('c', index);
    item.appendChild(cDiv);
    let bDiv = this.getContentLabel('b', index);
    item.appendChild(bDiv);
  });
  this.playerArr.forEach(item => {
    let player = new Player(this.url);
    item.player = player;
  })
  // TODO: 测试使用
  let temDiv = document.createElement('div');
  let temBtn1 = document.createElement('button');
  temBtn1.innerText = '全播放'
  let temBtn2 = document.createElement('button');
  temBtn2.innerText = '全停止'
  temBtn1.addEventListener('click', () => {
    this.playerArr.forEach(item => {
      // item.player.url = url1;
      item.player.url = url;
      item.player.initPlayer(item.canvasDiv);
      if(item.player.h265ws){
        item.player.h265ws.stopWS();
        item.player.h265ws.closeWS();
      }
      item.player.initWebSocket();
      item.player.play(0, false);
    })
  })
  temBtn2.addEventListener('click', () => {
    this.playerArr.forEach((item, index) => {
      this.initParams(index, 1)
    })
  })
  temDiv.appendChild(temBtn1);
  temDiv.appendChild(temBtn2);
  temDiv.style.margin = '20px 0 0 40%';
  this.bossDiv.appendChild(temDiv)
}

BasicsPlayer.prototype.getContentLabel = function (type, index) {
  let playerDiv = document.createElement('div');
  switch (type) {
    case 'i':
      let inputDiv = document.createElement('input');
      inputDiv.type = 'file';
      inputDiv.addEventListener('change', e => {
        this.filesArr[index] = {
          inputDiv: inputDiv,
          filesData: e.target.files[0]
        };
      });
      playerDiv.appendChild(inputDiv);
      break;
    case 'c':
      let canvasDiv = document.createElement('canvas');
      this.playerArr[index] = {
        canvasDiv: canvasDiv
      }
      playerDiv.appendChild(canvasDiv);
      break;
    case 'b':
      let playDiv = document.createElement('button');
      playDiv.innerHTML = '播放';
      playDiv.addEventListener('click', e => {
        if (this.filesArr[index] && this.filesArr[index].filesData.size > 0) {
          this.changePlayBox(index, 0, true);
        } else if (this.url) {
          this.changePlayBox(index, 0, false);
        } else {
          console.log(`播放器${index}号没有文件或摄像头连接, 不能播放`);
        }
        e.stopPropagation();
      });
      let stopDiv = document.createElement('button');
      stopDiv.innerHTML = '停止';
      stopDiv.addEventListener('click', e => {
        this.changePlayBox(index, 1);
        e.stopPropagation();
      });
      let fullscreenDiv = document.createElement('button');
      fullscreenDiv.innerHTML = '全屏';
      fullscreenDiv.addEventListener('click', e => {
        if (this.filesArr[index] && this.filesArr[index].filesData.size > 0) {
          this.changePlayBox(index, 2);
        } else if (this.url) {
          this.changePlayBox(index, 2);
        } else {
          console.log(`播放器${index}号没有文件，不能全屏`);
        };
        e.stopPropagation();
      })
      playerDiv.appendChild(playDiv);
      playerDiv.appendChild(stopDiv);
      playerDiv.appendChild(fullscreenDiv);
      break;
  }
  return playerDiv;
}

BasicsPlayer.prototype.changePlayBox = function (who, state, isFile) {
  switch (who) {
    case 0:
      this.changePlayState(state, who, isFile)
      break;
    case 1:
      this.changePlayState(state, who, isFile)
      break;
    case 2:
      this.changePlayState(state, who, isFile)
      break;
    case 3:
      this.changePlayState(state, who, isFile)
      break;
  }
}

BasicsPlayer.prototype.changePlayState = function (state, who, isFile) {
  switch (state) {
    case 0:
      console.log(`我是${who}播放`);
      this.playerArr[who].player.initPlayer(this.playerArr[who].canvasDiv);
      if (!isFile) {
        this.playerArr[who].player.initWebSocket();
      } else {
        this.playerArr[who].player.getVideoFile(this.filesArr[who].filesData)
      }
      this.playerArr[who].player.play(state, isFile)
      break;
    case 1:
      console.log(`我是${who}停止`);
      this.initParams(who, state);
      break;
    case 2:
      console.log(`我是${who}全屏`);
      if (this.playerArr[who] && this.playerArr[who].player) {
        this.playerArr[who].player.play(state);
      }
      break;
  }
}

BasicsPlayer.prototype.initParams = function (index, state) {
  if (this.filesArr[index] && this.filesArr[index].filesData.size > 0) {
    this.filesArr[index].filesData = null;
    this.filesArr[index].inputDiv.value = null;
  }
  if (this.playerArr[index] && this.playerArr[index].player) {
    this.playerArr[index].player.play(state);
  }
}

new BasicsPlayer();