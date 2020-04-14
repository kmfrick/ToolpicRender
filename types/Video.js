const tmp = require('tmp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const Stream = require('stream');


const formatMimes = new Map([
  ['mov', 'video/quicktime'],
  ['mp4', 'video/mp4']
]);


module.exports = {
  setFfmpegPath(path) {
    ffmpeg.setFfmpegPath(path);
  },
  getMime(format) {
    return formatMimes.get(format);
  },
  render(opts) {
    const { page, format, __stream, videoOptions, __instance } = opts;

    const { frameRate, duration, vcodec, pix_fmt, width, height } = videoOptions;
    console.log("FPS: " + frameRate + ", Duration: " + duration + ", VCodec: " + vcodec + ", Format: " + format);

    const theoreticallyFrameLength = 1000 / frameRate;
    const frameTimeIndexes = new Array(Math.ceil((duration / 1000) * frameRate)).fill(true).map((val, index) => {
      return Math.round(theoreticallyFrameLength * index);
    });

    return new Promise(function(resolve, reject) {
      tmp.dir(async function _tempDirCreated(err, dirPath, cleanupCallback) {
        if (err) throw err;

        const framesPath = dirPath + "/frame%04d.png";

        for (let timestamp of frameTimeIndexes) {
          let i = frameTimeIndexes.indexOf(timestamp);

          await page.evaluate(function(timestamp) {
            render.seekAnimations(timestamp);
          }, timestamp);

          const tmpFilePath = dirPath + "/frame" + String(i).padStart(4, "0") + ".png";

          await page.screenshot({
            path: tmpFilePath,
            type: 'png'
          });

          __instance.emit("progress", {
            description: 'keyframing',
            progress: (i + 1) / frameTimeIndexes.length
          });

        }

        const command = ffmpeg(framesPath);
        command.inputOptions([
          '-r ' + frameRate,
          '-f image2'
        ]);
        command.outputOptions([
          '-movflags isml+frag_keyframe',
          //'-c:v libvpx',
          //'-c:v libvpx-vp9',
          '-vcodec ' + vcodec, // libx264 libvpx qtrle ffvhuff huffyuv png
          //'-filter_complex [0:v][1:v]alphamerge',
          '-crf 25',
          '-pix_fmt ' + pix_fmt // argb yuv420p
          //`-vf "movie='image',alphaextract[a];[in][a]alphamerge"`,
          //'-c:v qtrle'

        ]);
        command.fps(frameRate);
        command.size(width + "x" + height);
        command.toFormat(format);
        command.on("progress", function(progress) {
          __instance.emit("progress", {
            description: 'rendering',
            progress: progress.percent / 100
          });
        });
        command.on("end", function() {
          console.log("Converted Video!");
          cleanupCallback();
          command.kill();
        });
        command.on("error", function(err) {
          console.error(err);
          command.kill();
        });

        command.pipe(__stream, {
          end: true
        });

        resolve(true);
      });
    });


  },

};
