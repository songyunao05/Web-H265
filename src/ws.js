import {
  EventEmitter
} from "eventemitter3";

export class H265WS extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.ws = null;
    this.initWS();
    this.limitConnect = 1;
    this.limitTimer = null;
    this.limitFlag = false;
  }

  initWS() {
    if ("WebSocket" in window) {
      this.handleWS();
    } else {
      console.log('该浏览器不支持websocket，请使用其他浏览器');
    }
    this.limitFlag = false;
  }

  handleWS() {
    let ws = null;
    try {
      ws = new WebSocket(this.url);
      ws.binaryType = 'arraybuffer';
    } catch (e) {
      let err = {
        state: 'error',
        code: 408,
        content: e.message || e
      }
      return err
    }
    this.ws = ws;
    this.ws.onopen = this.onSocketOpen.bind(this)
    this.ws.onerror = this.onSocketError.bind(this)
    this.ws.onmessage = this.onSocketMessage.bind(this)
    this.ws.onclose = this.onSocketClose.bind(this)
  }

  closeWS() {
    this.ws.close();
  }

  stopWS(){
    this.limitFlag = true;
  }

  sendWs() {
    this.ws.send(JSON.stringify({
      cmd: 'play',
      format: 'h265'
    }))
  }

  onSocketOpen(e) {
    console.log('websocket连接成功', e);
    this.emit('open')
  }

  onSocketError(e) {
    console.log('websocket报错', e);
    this.onReConnect(true)
  }

  onSocketMessage(e) {
    // console.log('websocket数据', e);
    this.emit('data', e.data);
  }

  onSocketClose(e) {
    console.log('websocket关闭连接', e);
    this.onReConnect(false);
  }

  onReConnect(flag) {
    if (!this.limitFlag) {
      this.onHandleReConnet(flag)
    }
  }

  onHandleReConnet(flag) {
    if (!this.limitFlag) {
      this.limitTimer = setTimeout(() => {
        this.limitConnect++;
        if (this.limitConnect > 3) {
          if (!flag) {
            this.emit('close', {
              code: 3,
              state: false
            });
          } else {
            this.emit('error', {
              code: 3,
              message: 'Connect Failed',
              state: false
            });
          }
          if (this.limitTimer) {
            clearTimeout(this.limitTimer)
            this.limitTimer = null;
          }
          this.limitConnect = 1;
        } else {
          this.initWS();
          if (!flag) {
            this.emit('close', {
              code: 2,
              state: true
            });
          } else {
            this.emit('error', {
              code: 2,
              message: 'Connect Failed',
              state: true
            });
          }
        }
      }, 2000);
    } else {
      this.emit('close', {
        code: 3,
        state: false
      });
    }
  }
}