# Toolpic Render

This module provides the functionality to render *Toolpic* templates statically as PNG, JPG or any kind of video.
This module is not made for web usage but can be used within any node environment.

## Why?

When we think about all the techniques we're using in `toolpic` such as **Vue.js**, **animejs**, **Mapbox** and so on, we aseethat they are perfectly working in browser. Just better: We don't have to *think* about them, we can easily look how beautiful the default client we've developed for FridaysForFuture is behaving. Everything will be visible and editable live on the client-side without any server rendering engine. Why should we use server based rendering?

**There are 3 reasons:**

1. **I/O:** SVG and the behavior of all its features never is the exact same in different browsers and versions. Not all features of CSS are fully supported in all common versions of modern browsers and even if they are supported, they behave differently in a lot of cases. When you're just using SVG for graphic design this fact may does not be that present in your daily work but *Toolpic* does a lot of more than just using SVG + CSS: Because some graphical/mathematical relations are not possible with SVG vanilla *Toolpic* provides functionality to use full featureset of Vue.js: That includes **Custom Components, Directives and usage of methods within the SVG/Vue context**. This means: **A lot of Javascript execution in the SVG context.** In connection with the usage of a lot of cool CSS3 features (a normal graphic designing application would not use, because it can offer alternatives), we can never ensure that a template looks the same on every device and every browser. Sometimes the differences are marginal but sometimes this makes a template unusable at all. Because we want to provide the exact same result on every device when you export your SharePic or Video for production, the rendering API ensures this functionality for everyone.

2. **Scaling down:** Sometimes we want to render templates within a context, in which we just need one template with a very basic configuration. For example: *Profile Picture Generators* that just need an image as argument. In this cases, we do not want to include and load a whole client framework as *Toolpic Core*. But we need just an API that can be requested by our client and returns ready-to-use images. This makes the usability of template rendering flexible and easy to scale, even if we have a very simple application.

3. **Video/Animating:** While image rendering could work on client-side more or less stable, this gets problematic when we try to export our *animejs* driven animations on SVG elements to valid encoded video files with alpha transparency, a frame rate and so on. This use cases needs the usage of a library such as `ffmpeg`, which is not really available on client-side. Even if such a library or a *ffmpeg port* for web usage exists (e.g. using *Emscripten*) (there are some ports available), such a solution would not be stable in the way a modular templating system requires stability. The performance would be horrible, depending on the device the application is running on.  To provide a flexible and stable animating environment, a server based evaluation of `ffmpeg` is necessary.

## Install

```bash
$ npm install toolpic-render
```

## Usage


The usage is very simple. `toolpic-render` exports a class that can be constructed without any arguments.

```javascript
const ToolpicRender = require('toolpic-render');


const renderInstance = new ToolpicRender();
// -> renderInstance.browser
// -> renderInstance.__app
// -> renderInstance.port
```

When constructing a new `ToolpicRender` class, the system firstly mounts a new *browser* using `puppeteer` (headless chrome).
Also, a small *delivery server* will be started between port `6500` and `65500`
This delivery server is used to deliver a small *client-application* including some HTML and Javascript that will be used to call *Toolpic Core* correctly and place the context correctly into the DOM. The delivery server also ensures correct delivering for **assets** your pre-compiled Template Component is needing. More about that below.

## API

#### on:`ready`

The `ready` event will be fired after the main configuration such as a delivery server or the browser initialization finished. Now, all properties can be accessed.

#### `browser`

Because the rendering system is based on top of `puppeteer`, `browser` of an instance returns the browser instance in which the templates will be rendered.


#### `port`

In `port`, the port of the virtual development server is stored. This is a value between `65000` and `65500` (mostly `65000`).

#### `__app`

The *delivery server* is based on `expressjs`, so the express instance is stored at `__app`.


#### `render(options)`

To render a template `render(<options>)` will be used as the following:


```javascript
const process = renderInstance.render({
  width: 1200,
  height: 1200,
  type: 'image',
  format: 'jpg',
  component: {
    root: 'https://path.to/pre-compiled/standalone/TemplateComponent/TemplateComponent.vue.js',
    assets: 'https://path.to/pre-compiled/standalone/TemplateComponent',
  },
  data: {

  },
  videoOptions: {
    duration: 2000,
    frameRate: 24,
    vcodec: "libx264",
    pix_fmt: "yuv420p"
  },
  pipeTarget: WriteStream,
  renderings: 3,
  FFMPEG_PATH: './path/to/ffmpeg'
});
```

##### `width`

The `width` property just represents the width the image should be rendered. It#s recommend to use the same that is stored in the Template Component (`component.root`)

##### `height`

The `height` property just represents the height the image should be rendered. It#s recommend to use the same that is stored in the Template Component (`component.root`)

##### `type`

The `type` property is mostly used for display purposes and specifies what kind of `format`'s are available.
The value can be `image` or `video`.

#### `format`

The `format` depends on what a kind of `type` you specify.
Depending on your `type`, possible values are:

| type    | possible values |
| ----    | --------------- |
| `image` | `jpg`, `png`    |
| `video` | `mp4`, `mov`    |


#### `video`

The `video` object contains additional properties that are used for templates of `type`: `video` to specify rendering process such as `frameRate` or encoding parameters.
Looks like the following:

```javascript
{
  // The duration of the video sequence (that will be previewed and rendered)
  duration: 2000,
  // Frame rate for rendering process (on client side, it is high as possible)
  frameRate: 24,
  // Video codec to encode, please have a look at ffmpeg's accepted vcodec values
  vcodec: "libx264",
  // Pixel format to be used, please have a look at ffmpeg's accepted pix_fmt's values
  pix_fmt: "yuv420p"
}
```

##### `pipeTarget`

`pipeTarget` represents any *WriteStream* the rendered image or video will be written to. In case of an implementation within a server API ecosystem, the `response` (also known as `res`) you get from the request handler is a good idea. But you can use every possible *WriteStream* here.

##### `renderings`

With `renderings` you specify a number of rendering processes that will repeated with a 50ms delay to ensure mathematical calculations made by *Toolpic Directives*, *Toolpic Custom Components* or whatever will be correct. Sound weird? If you're using fonts in your calculations this is needed to ensure that everything looks perfect.


##### `FFMPEG_PATH`

The `FFMPEG_PATH` value is a path to a valid `ffmpeg` executable the API should use for encoding video sequences.

### Getting `root` and `assets`

Maybe `root` and `assets` paths are confusing you. This is kindly the most interesting aspect of this rendering system. if you read the documentation of our `Toolpic Client Fridays For Future`, you got that all templates are valid pre-compiled *VueComponents*, so we are calling them *Template Components*. Even if you pre-compile them when building the *Client* using webpack, they cannot be used as standalone packages because of a lot of dependencies. That's the reason, why we're packing them a second time to work on their own. This happens using the `webpack.templates.js` config file (in Client Repo).

To make this pre-compiled standalone *Template Components* work with a rendering system, you just have to store them on any server or CDN you like to. Then, you ship the absolute URL to `root` property of `options` when calling `render(options)`. You also should ship the path the assets are living at to the `assets` property (which is mostly the same directory as the `root` file lives).

**Important:** Please ensure, that the Control-Origin policy of the webserver/CDN a template is located on is a wildcard `*/*`.

#### Asset Delivery System

Because we cannot set something like a dynamic `publicPath` that gets defined when importing the module and we don't know the location in which our `root` file and the `assets` will live at the end of the day, we cannot set any location preferences when configuring the `webpack.templates.js` to bundle our *Template Components*. So, they will always be requested at root level (`/`) when importing them. Because they are imported in our *client-application* that lives locally on some port between `65000` and `65500`, the assets would trigger an error when they're getting requested. Because of this, we let the `render()` method know the absolute path in which the `assets` are stored: The local *delivery server* is abled to look wether he can find the requested asset (that is absolutely not stored on our server at root (`/`) level) at any of current registered `assets` locations. Depending on how many different templates are rendering at the same time, of course, there is an amount of possible locations. But because the delivery server just send `HEAD` requests and you should just use stable CDN's or webservers, this action doesn't needs a lot of time. If a template is rendered successfully, the related `asset` target will be removed after 5000ms to prevent a session that is currently loading the `root` file but didn't started requesting the assets while the related asset target was already registered to run into error when a second session that uses the same combination of `root` and `assets` closed the *WriteStream*).


##### on:`progress`

When something happened while processing the template, the `progress` event will be fired.
It will give you one argument containing an object that describes the current action using `description` property and the current state of it using `progress` property.

```javascript
process.on("progress", data => {
  // Log progress object
  console.log(data);
  /*
  -->
      {
        description: "configuring",
        progress: 0.75
      }
  */
});
```

`description`: Any String
`progress`: Value between `0` and `1`
