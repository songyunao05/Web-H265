const LOG_LEVEL_JS = 0;
const LOG_LEVEL_WASM = 1;
const LOG_LEVEL_FFMPEG = 2;

const DECODER_H264 = 0;
const DECODER_H265 = 1;

const CHUNK_SIZE = 65536;

self.Module = {
  onRuntimeInitialized: function () {
    onWasmLoaded();
  }
};

self.importScripts("./libffmpeg.js");

function Decoder() {
  this.videoSize = null;
  this.videoCallback = null;
  this.fileData = null;
  this.closeDoWhile = false;
  this.i_stream_size = 0;
  this.filePos = 0;
  this.pts = 0;
  this.readerIndex = 0;
  this.totalSize = 0;
  this.startTimer = null;
  this.wsDataArr = [];
};

Decoder.prototype.initParam = function () {
  this.videoSize = null;
  this.fileData = null;
  this.closeDoWhile = false;
  this.i_stream_size = 0;
  this.filePos = 0;
  this.pts = 0;
  this.readerIndex = 0;
  this.totalSize = 0;
  if (this.startTimer) {
    clearInterval(this.startTimer);
    this.startTimer = null;
  }
  this.wsDataArr = [];
};

Decoder.prototype.handleOnMessage = function (e) {
  switch (e.state) {
    case 0: // 开始解码
      this.connectWSFlag = e.connectWSFlag
      if (!this.connectWSFlag) {
        if (typeof e.data !== 'string') {
          if (!this.closeDoWhile) {
            this.handleWSData(e.data);
          }
        } else {
          let temData = JSON.parse(e.data);
          if (temData.code != 200) {
            this.handleOnMessage({
              state: 1
            })
            self.postMessage({
              state: 1
            })
          } else if (temData.cmd == 'codec') {
            let retFlag = this.openDecoder();
            if (!retFlag) {
              this.handleOnMessage({
                state: 1
              })
              self.postMessage({
                state: 1
              })
            }else{
              self.postMessage({
                state: 2
              })
            }
          }
        }
      } else {
        this.fileData = e.files;
        this.displayVideoFrame();
      }
      break;
    case 1: // 停止解码并初始化
      this.clearDecoder();
      this.initParam();
      break;
    case 2: // 暂停解码
      if (e.type === 'pause') {
        this.closeDoWhile = true;
      } else {
        this.closeDoWhile = false;
        if (this.connectWSFlag) {
          clearInterval(this.startTimer);
          this.startTimer = null;
          this.handleDecoder();
        }
      }
      break;
  };
};

Decoder.prototype.openDecoder = function () {
  let temState = null;
  if (!this.connectWSFlag) {
    // ws
    temState = DECODER_H264;
  } else {
    // file
    temState = DECODER_H265;
  }
  let ret = Module._openDecoder(temState, this.videoCallback, LOG_LEVEL_WASM);
  if (ret == 0) {
    console.log("打开解码器成功");
    return true;
  } else {
    console.error("打开解码器失败,失败原因：", ret);
    return false;
  };
}

Decoder.prototype.displayVideoFrame = function () {
  let retFlag = this.openDecoder();
  if (retFlag) {
    self.postMessage({
      state: 2
    })
    this.readStreamFn();
    this.handleDecoder();
  }
};

Decoder.prototype.handleWSData = function (bufferData) {
  let typedArray;
  if (bufferData instanceof ArrayBuffer) {
    typedArray = new Uint8Array(bufferData);
  } else {
    typedArray = bufferData
  }
  let size = typedArray.length;
  let cacheBuffer = Module._malloc(size);
  Module.HEAPU8.set(typedArray, cacheBuffer);
  this.totalSize += size;
  // console.log("[" + (++this.readerIndex) + "] Read len = ", size + ", Total size = " + this.totalSize);
  Module._decodeData(cacheBuffer, size, this.pts++);
  if (cacheBuffer != null) {
    Module._free(cacheBuffer);
    cacheBuffer = null;
  };
}

Decoder.prototype.handleDecoder = function () {
  this.startTimer = setInterval(() => {
    if (this.i_stream_size > 0 && !this.closeDoWhile) {
      this.readStreamFn();
    } else {
      clearInterval(this.startTimer);
    };
  }, 200);
}

Decoder.prototype.readStreamFn = function () {
  let reader = new FileReader();
  reader.onload = res => {
    let typedArray = new Uint8Array(res.target.result);
    let size = typedArray.length;
    let cacheBuffer = Module._malloc(size);
    Module.HEAPU8.set(typedArray, cacheBuffer);
    this.totalSize += size;
    // console.log("[" + (++this.readerIndex) + "] Read len = ", size + ", Total size = " + this.totalSize);
    Module._decodeData(cacheBuffer, size, this.pts++);
    if (cacheBuffer != null) {
      Module._free(cacheBuffer);
      cacheBuffer = null;
    };
    if (size < CHUNK_SIZE) {
      console.log('文件解码完毕')
      this.clearDecoder();
      this.initParam();
    };
  };
  this.i_stream_size = this.readFileSlice(reader, this.filePos, CHUNK_SIZE);
  this.filePos += this.i_stream_size;
}

Decoder.prototype.readFileSlice = function (reader, start_addr, size) {
  let fileSize = this.fileData.size;
  let fileSlice;

  if (start_addr > fileSize - 1) {
    return 0;
  } else if (start_addr + size > fileSize - 1) {
    fileSlice = this.blobSlice(start_addr, fileSize);
    reader.readAsArrayBuffer(fileSlice);
    return fileSize - start_addr;
  } else {
    fileSlice = this.blobSlice(start_addr, start_addr + size);
    reader.readAsArrayBuffer(fileSlice);
    return size;
  };
};

Decoder.prototype.blobSlice = function (start_addr, end_addr) {
  if (this.fileData.slice) {
    return this.fileData.slice(start_addr, end_addr);
  };
  // compatible firefox
  if (this.fileData.mozSlice) {
    return this.fileData.mozSlice(start_addr, end_addr);
  };
  // compatible webkit
  if (this.fileData.webkitSlice) {
    return this.fileData.webkitSlice(start_addr, end_addr);
  };
  return null;
};

Decoder.prototype.onWasmLoaded = function () {
  this.videoCallback = Module.addFunction(function (addr_y, addr_u, addr_v, stride_y, stride_u, stride_v, width, height, pts) {
    // console.log("[%d]In video callback, size = %d * %d, pts = %d", ++videoSize, width, height, pts)
    // console.log(`[${++_this.videoSize}]In video callback, size = ${width} * ${height}, pts = ${pts}`)
    let size = width * height + (width / 2) * (height / 2) + (width / 2) * (height / 2);
    let data = new Uint8Array(size);
    let pos = 0;
    for (let i = 0; i < height; i++) {
      let src = addr_y + i * stride_y;
      let tmp = HEAPU8.subarray(src, src + width);
      tmp = new Uint8Array(tmp);
      data.set(tmp, pos);
      pos += tmp.length;
    };
    for (let i = 0; i < height / 2; i++) {
      let src = addr_u + i * stride_u;
      let tmp = HEAPU8.subarray(src, src + width / 2);
      tmp = new Uint8Array(tmp);
      data.set(tmp, pos);
      pos += tmp.length;
    };
    for (let i = 0; i < height / 2; i++) {
      let src = addr_v + i * stride_v;
      let tmp = HEAPU8.subarray(src, src + width / 2);
      tmp = new Uint8Array(tmp);
      data.set(tmp, pos);
      pos += tmp.length;
    };
    let obj = {
      state: 0,
      data: data,
      width,
      height
    };
    self.postMessage(obj, [obj.data.buffer]);
  });
}

Decoder.prototype.clearDecoder = function () {
  Module._flushDecoder();
  Module._closeDecoder();
};

self.decoder = new Decoder;

self.onmessage = function (event) {
  if (!self.decoder) {
    console.log("解码器初始化失败，退出解码");
    return;
  };
  self.decoder.handleOnMessage(event.data);
};

function onWasmLoaded() {
  if (self.decoder) {
    self.decoder.onWasmLoaded();
  } else {
    console.log("没有解码器");
  };
};