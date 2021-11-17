function RenderWorker() {
  this.renderArr = [];
  this.playerTimer = null;
  this.fps = 25 // 帧率
}

RenderWorker.prototype.init = function () {
  if (!this.playerTimer) {
    self.postMessage({
      type: 0
    });
    this.playerTimer = setInterval(() => {
      self.postMessage({
        type: 0
      });
    }, 1000 / this.fps);
  }
}

RenderWorker.prototype.stop = function () {
  if (this.playerTimer) {
    clearInterval(this.playerTimer)
    this.playerTimer = null
  }
  self.postMessage({
    type: 1
  })
}

RenderWorker.prototype.handleOnMessage = function (e) {
  switch (e.type) {
    case 0:
      this.init()
      break;
    case 1:
      this.stop()
      break;
  }
}

self.renderWorker = new RenderWorker();

self.onmessage = function (event) {
  if (!self.renderWorker) {
    console.log('画布初始化失败');
    return
  };
  self.renderWorker.handleOnMessage(event.data);
}