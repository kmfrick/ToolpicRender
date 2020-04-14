const EventEmitter = require('events');
const express = require('express');
const http = require('http');
const puppeteer = require('puppeteer');
const Url = require('url');
const { findPort } = require(__dirname + '/helpers');
const request = require('request');

const RenderingProcess = require(__dirname + '/RenderingProcess');

class ServerRenderer extends EventEmitter {
  constructor() {
    super();

    this.assetDirs = new Map();

    this.__init().then(() => {
      console.log("(Toolpic Renderer) Dev server listening on localhost:" +  this.port);
      this.emit("ready");
    });
  }
  async __init() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=desktop'
      ],
      ignoreHTTPSErrors: true,
    	dumpio: false
    });
    this.port = await findPort(65000, 65100);
    this.__app = express();
    // Asset delivery system (proxy) -> Because we do not know something like a 'publicPath' when webpacking the component, the required assets always will be requested at root /<asset>
    this.__app.use("/:query", async (req, res, next) => {
      const requestedAssetUrl = await this.getRelatedAsset(req.params.query);
      if (requestedAssetUrl) {
        request.get(requestedAssetUrl).pipe(res);
      }
      else {
        next();
      }
    });
    this.__app.use(express.static(__dirname + '/client-application'));
    http.createServer(this.__app).listen(this.port);


    /*const page = await this.browser.newPage();
    await page
        .goto('chrome://gpu', { waitUntil: 'networkidle0', timeout: 20 * 60 * 1000 })
        .catch(e => console.log(e));
    await page.screenshot({
        path: 'stats/gpu_stats.png'
    });*/

  }
  render(opts) {

    const instance = new RenderingProcess(this, opts, 'localhost:' + this.port);

    return instance;
  }
  registerComponentAssets(rootFile, assetsDir) {
    this.assetDirs.set(rootFile, assetsDir);
  }
  unregisterComponentAssets(rootFile) {
    this.assetDirs.delete(rootFile);
  }
  async getRelatedAsset(query) {
    for (let [rootFile, assetDir] of this.assetDirs) {
      const endpoint = assetDir + '/' + query;
      const endpointValid = await ServerRenderer.endpointExists(endpoint);
      if (endpointValid) {
        return endpoint;
      }
    }
    return undefined;
  }
  static endpointExists(url) {

    return new Promise(function(resolve, reject) {
      request(url, {
        method: 'HEAD'
      }, function(err, response) {
        if (response && response.statusCode) {
          resolve(response.statusCode == 200);
        }
        else {
          resolve(false);
        }
      });
    });
  }

}
module.exports = ServerRenderer;
