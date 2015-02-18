var CACHED_IMAGE_W = 500;
var CACHED_IMAGE_H = CACHED_IMAGE_W;
var CACHED_IMAGE_SIZE = CACHED_IMAGE_W*CACHED_IMAGE_H;
var THUMBNAIL_W = 100;
var THUMBNAIL_H = 100;

//----------------------------------------------------------------------------------
function scale_ratio(w, h, max)
{
    if (w > h) {
        h = Math.round(h*max/w);
        w = max;
    }
    else {
        w = Math.round(w*max/h);
        h = max;
    }
    return [w,h]
}

function copy_canvas(image) {
	var canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	canvas.getContext("2d").drawImage(image, 0, 0);
	return canvas;
}

GA_Event = function(action, label, value) {
    ga('send','event','web-extension', action, label, value);
};

GA_page = function(page) {
    ga('send','pagesview', page);
};


//----------------------------------------------------------------------------------
// RGB<->LAB conversions, based on https://github.com/harthur/color-convert/blob/master/conversions.js

function rgb2xyz(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

  // assume sRGB
  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);

  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return [x * 100, y *100, z * 100];
}

function rgb2lab(rgb) {
  var xyz = rgb2xyz(rgb),
        x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);

  return [l, a, b];
}

function xyz2rgb(xyz) {
  var x = xyz[0] / 100,
      y = xyz[1] / 100,
      z = xyz[2] / 100,
      r, g, b;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

  // assume sRGB
  r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    : r = (r * 12.92);

  g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    : g = (g * 12.92);

  b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    : b = (b * 12.92);

  r = (r < 0) ? 0 : r;
  g = (g < 0) ? 0 : g;
  b = (b < 0) ? 0 : b;

  return [r * 255, g * 255, b * 255];
}

function lab2rgb(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      x, y, z, y2;

  if (l <= 8) {
    y = (l * 100) / 903.3;
    y2 = (7.787 * (y / 100)) + (16 / 116);
  } else {
    y = 100 * Math.pow((l + 16) / 116, 3);
    y2 = Math.pow(y / 100, 1/3);
  }

  x = x / 95.047 <= 0.008856 ? x = (95.047 * ((a / 500) + y2 - (16 / 116))) / 7.787 : 95.047 * Math.pow((a / 500) + y2, 3);

  z = z / 108.883 <= 0.008859 ? z = (108.883 * (y2 - (b / 200) - (16 / 116))) / 7.787 : 108.883 * Math.pow(y2 - (b / 200), 3);

  return xyz2rgb([x, y, z]);
}

//----------------------------------------------------------------------------------
// contrast-stretching

// based on code from js-objectdetect
function equalize_histogram(src, range) {
    var srcLength = src.length;
    var dst = src;

    // Compute histogram and histogram sum:
    var hist = new Float32Array(range);
    var sum = 0;
    for (var i = 0; i < srcLength; ++i) {
        ++hist[~~src[i]];
        ++sum;
    }

    // Compute integral histogram:
    var prev = hist[0];
    for (var i = 1; i < range; ++i) {
        prev = hist[i] += prev;
    }

    // Equalize image:
    var norm = (range-1) / sum;
    for (var i = 0; i < srcLength; ++i) {
        dst[i] = hist[~~src[i]] * norm;
    }
    return dst;
}

//----------------------------------------------------------------------------------

function ImageInAverage(image, array_type, from_rgb, normalize) {
    var self = this;
    self.from_rgb = from_rgb;
    self.normalize = normalize;

    self.L = new array_type(CACHED_IMAGE_SIZE);
    self.A = new array_type(CACHED_IMAGE_SIZE);
    self.B = new array_type(CACHED_IMAGE_SIZE);
    self.length = CACHED_IMAGE_SIZE;
    self.orig_width = $(image).width();
    self.orig_height = $(image).height();
    self.url = $(image).attr("src");
    self.thumbnail = null;
    self.muted = true;

    var resize = function(img, w, h) {
	var c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	$(c).hide();
	document.body.appendChild(c);
	var ctx = c.getContext('2d');
	ctx.drawImage(img, 0, 0, c.width, c.height);
	return c;
    }
    
    self.pre_process = function(image) {
        // prepare thumbnail
        var th_ratio = scale_ratio(self.orig_width, self.orig_height, THUMBNAIL_W);
	//        var thumb_canvas = $(image).pixastic("resize", {"width":th_ratio[0], "height":th_ratio[1], "leaveDOM":true})[0]; // WHY IN A LIST?
	var thumb_canvas = resize(image, th_ratio[0], th_ratio[1]);
	//


        self.thumbnail= new Image();
        self.thumbnail.src = thumb_canvas.toDataURL("image/png");
        $(self.thumbnail).css({'width':th_ratio[0],'height':th_ratio[1]});
        $.data(self.thumbnail, "iia", self);

        // resize for averaging
	//        var canvas = $(image).pixastic("resize", {"width":CACHED_IMAGE_W, "height":CACHED_IMAGE_H, "leaveDOM":true})[0]; // WHY IN A LIST?
	var canvas = resize(image, CACHED_IMAGE_W, CACHED_IMAGE_H);
        //circle_crop(canvas);

        var ctx = canvas.getContext('2d');
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        for (var i = 0; i < data.length/4; i++) {
            // white background assumed for alpha < 255
            var alpha = data[i*4+3];
            var color = [
                Math.round(data[i*4]*alpha/255.0 + (255-alpha)),
                Math.round(data[i*4+1]*alpha/255.0 + (255-alpha)),
                Math.round(data[i*4+2]*alpha/255.0 + (255-alpha))]
            if (self.from_rgb != undefined)
                color = self.from_rgb(color);
            //var lab = rgb2lab([data[i*4], data[i*4+1], data[i*4+2]]);
            self.L[i] = color[0];
            self.A[i] = color[1];
            self.B[i] = color[2];
        }
        if (self.normalize === 1)
            equalize_histogram(self.L,100);
        else if (self.normalize === 3) {
            equalize_histogram(self.L,256);
            equalize_histogram(self.A,256);
            equalize_histogram(self.B,256);
        }
    }
    self.pre_process(image);
}

function ImageInAverage_RGB(image)   { return ImageInAverage.call(this, image, Uint8Array); }
function ImageInAverage_RGBeq(image) { return ImageInAverage.call(this, image, Uint8Array, undefined, 3); }
function ImageInAverage_LAB(image)   { return ImageInAverage.call(this, image, Int8Array, rgb2lab); }
function ImageInAverage_LABeq(image) { return ImageInAverage.call(this, image, Int8Array, rgb2lab, 1); }

var ORIG=0, ADJUST=1, FILTER=2;

function Average(name, image_class, to_rgb) {
    var self = this;
    self.name = name
    self.image_class = image_class;
    self.to_rgb = to_rgb;

    self.L = new Int32Array(CACHED_IMAGE_SIZE);
    self.A = new Int32Array(CACHED_IMAGE_SIZE);
    self.B = new Int32Array(CACHED_IMAGE_SIZE);
    self.length = CACHED_IMAGE_SIZE;
    self.count = 0;
    self.width_sum = 0;
    self.height_sum = 0;
    self.images = [];
    // url > image cache
    self.url_to_image = {};

    // rendering cache
    self._render_cache = [null,null,null];
    self._invalidate_cache = function(idx) {
        if (idx === undefined) {
            idx = 0;
        }
        for (var i=idx; i<self._render_cache.length; i++) {
            self._render_cache[i] = null;
        }
    }

    // post-processing configuration
    self.PRESETS = [{name:"oldBoot",title:"old boot"},
                        {name:"glowingSun",title:"glowing sun"},
                        {name:"jarques",title:"jarques"},
                        {name:"lomo",title:"lomo"},
                        {name:"crossProcess",title:"cross process"},
                        {name:"clarity",title:"clarity"},
                        {name:"concentrate",title:"concentrate"},
                        {name:"hazyDays",title:"hazy days"}];

    self.reset_post_processing = function() {
        self.current_filter = null;
        self.adjustments = {'brightness': {v:0}, 'contrast': {v:0}, 'saturation': {v:0}, 'exposure': {v:0}, 'vibrance': {v:0}};
        self._invalidate_cache(ADJUST);
    };
    self.reset_post_processing();

    self.adjust = function(name, value) {
        self.adjustments[name].v = value;
        self._invalidate_cache(ADJUST);
    }

    self.set_filter = function(filter) {
        self.current_filter = filter;
        self._invalidate_cache(FILTER);
    }

    self.size = function(){
        // calc. avg size
        if (self.count) {
            var avg_width = self.width_sum/self.count;
            var avg_height = self.height_sum/self.count;
        }
        else {
            var avg_width=100, avg_height=100;
        }

        // resize according to average aspect ratio
        var size = scale_ratio(avg_width, avg_height, CACHED_IMAGE_W);
        return size;
    };

    self.optimal_size = function() {
        if (self.count == 0)
            return [100,100];

        // calc. avg size
        var avg_width = self.width_sum/self.count;
        var avg_height = self.height_sum/self.count;

        // calc. max dimensions
        var max_w=0, max_h=0;
        for (var i=0; i<self.images.length; i++) {
            if (self.images[i].orig_width > max_w)
                max_w = self.images[i].orig_width;
            if (self.images[i].orig_height > max_h)
                max_h = self.images[i].orig_height;
        }

        var size1 = scale_ratio(avg_width, avg_height, max_w);
        var size2 = scale_ratio(avg_width, avg_height, max_h);
        if (size1[0]*size1[1] > size2[0]*size2[1])
            return size1;
        else
            return size2;
    }

    self.add = function(image) {
        // accepts image element
        image = new self.image_class(image); // includes pre-processing
        self.images.push(image);
        self.unmute(image);
        self.url_to_image[image.url] = image;
        return image;
    };

    self.remove = function(image) {
        // accepts ImageInAverage!
        self.mute(image);
        var index = self.images.indexOf(image);
        delete self.url_to_image[image.url];
        self.images.splice(index, 1);
    };

    self.remove_by_url = function(url) {
        self.remove(self.url_to_image[url]);
    };

    self.unmute = function(image) {
        GA_Event("send", "event", "extension","unmute", image.url);
        // accepts ImageInAverage!
        if (!image.muted)
            return;
        for (var i = 0; i < image.length; i++) {
            self.L[i] += image.L[i];
            self.A[i] += image.A[i];
            self.B[i] += image.B[i];
        }
        self.count++;
        self.width_sum += image.orig_width;
        self.height_sum += image.orig_height;
        image.muted = false;
        self._invalidate_cache();
    }

    self.mute = function(image) {
        GA_Event("extension","mute", image.url);
        // accepts ImageInAverage!
        if (image.muted)
            return;
        for (var i = 0; i < image.length; i++) {
            self.L[i] -= image.L[i];
            self.A[i] -= image.A[i];
            self.B[i] -= image.B[i];
        }
        self.count--;

        self.width_sum -= image.orig_width;
        self.height_sum -= image.orig_height;
        image.muted = true;
        self._invalidate_cache();
    }

    self._render_raw = function() {
        // post-processing

        // prepare output canvas
        var canvas = document.createElement("canvas");
        canvas.width = CACHED_IMAGE_W;
        canvas.height = CACHED_IMAGE_H;
        var ctx = canvas.getContext('2d');
        var imgData = ctx.getImageData(0, 0, CACHED_IMAGE_W, CACHED_IMAGE_H);

        // average, convert to rgb and put in canvas
        for (var i = 0; i < self.length; i++) {
            var rgb = [self.L[i]/self.count, self.A[i]/self.count, self.B[i]/self.count];
            if (self.to_rgb != undefined)
                rgb = self.to_rgb(rgb);
            imgData.data[i*4] = rgb[0];
            imgData.data[i*4+1] = rgb[1];
            imgData.data[i*4+2] = rgb[2];
            imgData.data[i*4+3] = 255;
        }
        ctx.putImageData(imgData,0,0);

        var size = self.size();
	var canvas = $(canvas).pixastic("resize", {"width":size[0], "height":size[1], "leaveDOM":true})[0];
        //var canvas = Pixastic.process(canvas, "resize", {"width":size[0], "height":size[1], "leaveDOM":true})[0];
        $(canvas).attr("style","");

        return canvas;
    };

    self.render = function(cb) {
        console.log('rendering');
        if (self.count === 0) {
            cb(null);
            return;
        }

        // render raw average
        var canvas = self._render_cache[ORIG];
        if (canvas === null) {
            canvas = self._render_raw();
            self._render_cache[ORIG] = canvas;
        }

        // render adjustments
        // possible optimization: only if needed
        if (self._render_cache[ADJUST] === null) {
	    self.adjustments && GA_Event('render-adjustments', JSON.stringify(self.adjustments));
            canvas = copy_canvas(canvas);
            Caman(canvas, function() {
                var caman = this;

                // adjustments
                _.each(self.adjustments, function(v,k) {
                    if (v.v != 0) {
                        caman[k](parseInt(v.v));
                    }
                });

                caman.render(function(){
                    console.log('rendered adjustments');
                    self._render_cache[ADJUST] = canvas;
                    self._continue_rendering(cb);
                });
            });
        }
        else { self._continue_rendering(cb); }
    };

    self._continue_rendering = function(cb) {
        var canvas = self._render_cache[ADJUST];

        // filter (preset)
        if (self.current_filter) {
            if (self._render_cache[FILTER] === null) {
                self.current_filter && GA_Event('render-filter', self.current_filter.name);
                canvas = copy_canvas(canvas);
                Caman(canvas, function() {
                    var caman = this;
                    caman[self.current_filter.name]();

                    caman.render(function(){
                        console.log('rendered filter');
                        self._render_cache[FILTER] = canvas;
                        cb(canvas);
                    });
                });
            }
            else { cb(self._render_cache[FILTER]); }
        }
        else { cb(canvas); }
    }
}

function Average_RGB(name) { return Average.call(this, name, ImageInAverage_RGB); }
function Average_RGBeq(name) { return Average.call(this, name, ImageInAverage_RGBeq); }
function Average_LAB(name) { return Average.call(this, name, ImageInAverage_LAB, lab2rgb); }
function Average_LABeq(name) { return Average.call(this, name, ImageInAverage_LABeq, lab2rgb); }
