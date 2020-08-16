const formatTypes = new Map([
  ["svg", "svg"],
  ["pdf", "pdf"]
]);

module.exports = {
  getMime(format) {
    return new Map([
      ["svg", "image/svg+xml"],
      ["pdf", "application/pdf"]
    ]).get(format);
  },
  async render(opts) {
    const { page, format, size, __stream, __instance } = opts;


    if (format == "svg") {
      const svgRaw = await page.evaluate(async function() {
        const target = document.querySelector(".result svg");

        return target.outerHTML;
      });

      __instance.emit("progress", {
        description: "templating",
        progress: 0.9
      });

      __stream.send(svgRaw);
    }
    else if (format == "pdf") {
      console.log(size);
      const buffer = await page.pdf({
        width: size.width,
        height: size.height,
        pageRanges: '1',
        margin: {
          top: 0,
          left: 0,
          bottom: 0,
          right: 0
        }
      });

      __instance.emit("progress", {
        description: "templating",
        progress: 0.9
      });


      __stream.write(buffer, 'buffer');
      __stream.end(null, 'buffer');
    }
    return true;
  }
}
