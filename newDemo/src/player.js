import {
  EventEmitter
} from "eventemitter3";
import {
  WebGLPlayer
} from './webgl'
import {
  H265WS
} from './ws'
import DecoderWorker from './worker/decoder.worker.js';
import RenderWorker from './worker/render.worker.js';

export class Player extends EventEmitter {
  constructor(url) {
    super();
    this.decodeWorker = null;
    this.webglPlayer = null;
    this.renderWorker = null;
    this.files = null;
    this.url = url;
    this.h265ws = null;
    this.renderArr = [];
    this.initDecodeWorker();
    this.wsConnectObj = {
      state: true,
      code: 1
    };
  };

  initDecodeWorker() {
    this.decodeWorker = new DecoderWorker();
    this.decodeWorker.onmessage = event => {
      let objData = event.data;
      switch (objData.state) {
        case 0:
          this.canvasPlay(objData);
          break;
        case 1:
          this.stopPlay();
          this.stopDecoder();
          break;
        case 2:
          if (this.webglPlayer) {
            this.renderWorker.postMessage({
              type: 0
            })
          }
          break;
      };
    };
  };

  initPlayer(canvasPlayer) {
    if (canvasPlayer) {
      this.webglPlayer = new WebGLPlayer(canvasPlayer, {
        preserveDrawingBuffer: false
      });
    }
    if (!this.renderWorker) {
      this.renderWorker = new RenderWorker();
      this.renderWorker.onmessage = event => {
        let renderData = event.data;
        switch (renderData.type) {
          case 0:
            this.renderPlayer()
            break;
          case 1:
            console.log('关闭render woker成功');
            break;
        };
      }
    }
  };

  getVideoFile(files) {
    this.files = files;
  };

  initWebSocket() {
    if (this.url) {
      this.h265ws = new H265WS(this.url);
    };
  };

  stopPlay() {
    this.webglPlayer = null;
    if (this.files) {
      this.files = null;
    }
    if (this.renderWorker) {
      this.renderWorker.postMessage({
        type: 1
      })
    };
    this.renderArr = [];
    if (this.h265ws && this.wsConnectObj.code === 3) {
      this.h265ws.stopWS();
      this.h265ws.closeWS();
      this.h265ws = null;
    }
    this.wsConnectObj = {
      state: true,
      code: 1
    };
    /**TODO:
     * 需监听页面关闭或者页面跳转时再触发，
     * 关闭线程后，需重新开启，也就时重新new Player()
     * 暂注释，后续优化时再加入此项
     * this.decodeWorker.terminate();
     */
  };

  stopDecoder() {
    if (this.decodeWorker) {
      this.decodeWorker.postMessage({
        state: 1
      });
    } else {
      console.log('解码器不存在');
    }
  };

  fullScreen() {
    if (this.webglPlayer) {
      this.webglPlayer.fullscreen();
    } else {
      console.log('播放器不存在或没有可播放的视频');
    }
  }

  play(flag, isFile) {
    switch (flag) {
      case 0:
        if (isFile) {
          if (this.files && this.files.size <= 0) return;
          if (this.files.name.indexOf('265') > 0) {
            let obj = {
              state: 0,
              files: this.files,
              connectWSFlag: isFile
            }
            this.decodeWorker.postMessage(obj)
          } else {
            console.log('文件格式不正确');
          }
        } else {
          // websocket播放调试
          this.h265ws.on('open', this.webSocketOpen.bind(this))
          this.h265ws.on('error', this.webSocketError.bind(this))
          this.h265ws.on('data', this.webSocketData.bind(this))
          this.h265ws.on('close', this.webSocketClose.bind(this))
        }
        break;
      case 1:
        this.wsConnectObj.code = 3;
        this.stopDecoder();
        this.stopPlay();
        break;
      case 2:
        this.fullScreen();
        break;
    }
  }

  webSocketOpen() {
    console.log('连接成功，发送请求', this.h265ws)
    if (this.h265ws) {
      this.h265ws.sendWs();
    }
  }

  webSocketError(err) {
    console.log('websocket error', err.code, err.message)
    this.wsConnectObj = e;
    if (!this.wsConnectObj.state) {
      this.decodeWorker.postMessage({
        state: 1
      });
      this.stopPlay();
    }
  }

  webSocketData(data) {
    if (typeof data !== 'string') {
      let temData = new Uint8Array(data);
      this.decodeWorker.postMessage({
        state: 0,
        connectWSFlag: false,
        data: temData
      }, [temData.buffer])
    } else {
      if (JSON.parse(data).code == 200) {
        this.decodeWorker.postMessage({
          state: 0,
          connectWSFlag: false,
          data: data
        })
      }
    }
  }

  webSocketClose(e) {
    console.log('websocket close', e);
    this.wsConnectObj = e;
    if (!this.wsConnectObj.state) {
      this.decodeWorker.postMessage({
        state: 1
      });
      this.stopPlay();
    }
  }

  canvasPlay(obj) {
    this.renderArr.push(obj);
  }

  renderPlayer() {
    let obj = this.renderArr.shift();
    if (this.files && this.files.size > 0) {
      if (this.renderArr.length > 1000) {
        this.decodeWorker.postMessage({
          state: 2,
          type: 'pause'
        })
        this.temNum = 1;
      } else if (this.temNum > 0 && this.renderArr.length < 100) {
        this.decodeWorker.postMessage({
          state: 2
        })
        this.temNum = 0;
      }
    } else {
      // if (this.renderArr.length > 3) {
      //   console.log('renderArr长度》3', this.renderArr.length)
      //   this.renderArr = this.renderArr.slice(-3)
      // }
      if (this.renderArr.length > 75) {
        this.decodeWorker.postMessage({
          state: 2,
          type: 'pause'
        })
        this.temNum = 1;
      } else if (this.temNum > 0 && this.renderArr.length < 26) {
        this.decodeWorker.postMessage({
          state: 2
        })
        this.temNum = 0;
      }
    }
    if (obj) {
      let data;
      if (obj.data instanceof ArrayBuffer) {
        data = new Uint8Array(obj.data);
      } else {
        data = obj.data
      }
      let width = obj.width;
      let height = obj.height;
      let yLength = width * height;
      let uvLength = (width / 2) * (height / 2);
      this.webglPlayer.renderFrame(data, width, height, yLength, uvLength);
    } else {
      /**TODO:
       * 暂时注释,清空画布功能
       * this.webglPlayer.gl.clearColor(0.1, 0.1, 0.1, 1.0);
       * this.webglPlayer.gl.clear(this.webglPlayer.gl.COLOR_BUFFER_BIT);
       */
      if (!this.wsConnectObj.state) {
        this.wsConnectObj.code = 3;
        this.stopDecoder();
        this.stopPlay();
      }
    }
  }
}