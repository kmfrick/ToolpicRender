const EventEmitter = require('events');
const express = require('express');
const http = require('http');
const Stream = require('stream');

const Types = {
  "image": require(__dirname + '/types/Image'),
  "video": require(__dirname + '/types/Video')
};

class RenderingProcess extends EventEmitter {
  constructor(serverRendererInstance, opts, deliveryServer) {
    super();

    this.__serverInstance = serverRendererInstance;
    this.browser = serverRendererInstance.browser;
    this.opts = opts;
    this.deliveryServerApplicationEntry = 'http://' + deliveryServer + '/';

    const { type, format } = this.opts;

    this.mime = Types[type].getMime(format);
    if ("setFfmpegPath" in Types[type]) {
      Types[type].setFfmpegPath(this.opts.FFMPEG_PATH);
    }

    this.__render(this.stream);

  }
  async __render() {
    const { type, format, component, videoOptions, data, renderings, delay } = this.opts;
    const writeStream = this.opts.pipeTarget;

    this.page = await this.openPage(this.deliveryServerApplicationEntry);

    this.emit("progress", {
      description: 'configuring',
      progress: 0.25
    });

    // Register assets related to the root file because when we import the root file within the client-application using init(<rootFile>, <dataset>), the assets will be requedted at root /<assetUID>
    // This is because webpack cannot offer a completely dynamic 'publicPath' that could be set when importing (limits of Web API's)
    this.__serverInstance.registerComponentAssets(component.root, component.assets);
    // -> Now, we registered the assets and the delivery server is abled to proxy them when they are requested at root /<assetUID>

    writeStream.on("close", () => {
      setTimeout(() => {
        this.__serverInstance.unregisterComponentAssets(component.root);
      }, 5000)
    });

    //console.log("Init...");
    this.page.on("error", function(err) {
      //console.error(err);
    });
    this.page.on("pageerror", function(err) {
      //console.error(err);
    });
    this.page.on("console", function(msg) {
      //console.log(msg);
    });

    console.log("Init...");

    // Wait for component to be mounted and all assets to be loaded
    const res = await this.page.evaluate(async function(componentsRootFile, __data, renderings) {
      return await init(componentsRootFile, __data, true);
    }, component.root, data);
    console.log("Inited!");

    this.emit("progress", {
      description: 'templating',
      progress: 0.75
    });

    for (var i = 0; i < renderings; i++) {
      await this.page.evaluate(async function(__data) {
        window.render.dataset = __data;
        window.render.Vue.$forceUpdate();
        return window.render.dataset;
      }, data);
      await new Promise(function(resolve, reject) {
        setTimeout(resolve, 50);
      });
    }

    await new Promise(function(resolve, reject) {
      setTimeout(resolve, delay);
    });

    await Types[type].render({
      __stream: writeStream,
      page: this.page,
      format,
      videoOptions: videoOptions ? Object.assign(videoOptions, {
        width: this.opts.width,
        height: this.opts.height
      }) : undefined,
      __instance: this
    });

    await this.page.close();
  }
  async openPage(url) {
    const page = await this.browser.newPage();
    // Make background transparent (important for alpha transparency)
    page._emulationManager._client.send('Emulation.setDefaultBackgroundColorOverride', {
      color: {
        r: 0,
        g: 0,
        b: 0,
        a: 0
      }
    });
    // Set viewport to boundings of the requested document
    await page.setViewport({
      width: this.opts.width,
      height: this.opts.height
    });

    // Go to living Toolpic instance for rendering process
    await page.goto(url);

    return page;
  }
}

module.exports = RenderingProcess;
