const formatTypes = new Map([
  ["jpg", "jpeg"],
  ["jpeg", "jpeg"],
  ["png", "png"]
]);

module.exports = {
  getMime(format) {
    return 'image/' + formatTypes.get(format);
  },
  async render(opts) {
    const { page, format, __stream, __instance } = opts;

    const type = formatTypes.get(format);

    const buffer = await page.screenshot({
      type,
      quality: type === 'jpeg' ? 95 : undefined
    });

    __instance.emit("progress", {
      description: "templating",
      progress: 0.9
    });


    __stream.write(buffer, 'buffer');
    __stream.end(null, 'buffer');

    return true;
  }
}
