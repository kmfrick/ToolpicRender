function init(root, dataset = {}, usingInitDataObj = true, renderings = 3) {

  return new Promise(async function(resolve, reject) {
    const componentModule = await import(root);

    try {
      if (usingInitDataObj) {
        try {
          const defaultDataObj = eval('(' + window.ToolpicTemplateComponent.default.data + ')()');
          const datasetFilled = objFillDefaults(dataset, defaultDataObj);
          const dataFunction = new Function(`
            return ${ JSON.stringify(datasetFilled, null, 2) };
          `);
          window.ToolpicTemplateComponent.default.data = dataFunction;
        }
        catch (err) {
          console.error(err);
        }
      }

      console.log("Data set");


      const target = document.querySelector(".result");

      const render = new Toolpic.default(window.ToolpicTemplateComponent);
      window.render = render;

      if (!usingInitDataObj) {
        render.dataset = dataset;
      }

      render.listenForResources().then(() => {
        console.log("Images loaded!");
        resolve(true);
      });

      target.append(render.context);

      render.Vue.$forceUpdate();
    }

    catch (err) {



      console.error(err);


    }
  });
}


function objFillDefaults(obj, defaults) {
  Object.keys(defaults).forEach(key => {
    if (!(key in obj)) {
      obj[key] = defaults[key];
    }
    else if (typeof defaults[key] == "object" && defaults[key] != null) {
      obj[key] = objFillDefaults(obj[key], defaults[key]);
    }
  });
  return obj;
}
