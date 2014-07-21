(function(exports) {
    "use strict";

    var VideoPlayer = {};

    var ImageSequence = new Class({
        initialize: function(name, max) {
            this._name = name;
            this._currentFrame = 1;
            this._maxFrame = max;
        },

        _buildFilename: function(i) {
            return 'frames/' + this._name + '/' + this._name + '_' + i + '.png';
        },

        _loadFrame: function(cb) {
            var img = new Image();
            img.onload = function() {
                cb(img);
            };
            img.src = this._buildFilename(this._currentFrame);
        },

        getProgress: function() {
            return this._currentFrame / this._maxFrame;
        },

        nextFrame: function(cb) {
            this._loadFrame(cb);
            this._currentFrame++;
            if (this._currentFrame > this._maxFrame)
                this._currentFrame = 1;
        },
    });
    VideoPlayer.ImageSequence = ImageSequence;

    // http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
    function roundedRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    var BaseVideoPlayer = new Class({
        initialize: function(crtc, seq) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('component');
            this._toplevel.classList.add('video-player');

            this._crtc = crtc;
            this._seq = seq;
            this._bufferManager = this._makeBufferManager();
            this._toplevel.appendChild(this._bufferManager.display.elem);
            this._drawHelper = new Base.ChunkedDrawerHelper(this._bufferManager, this._fetchNextDraw.bind(this));
            this._makeFakeUI();

            this.elem = this._toplevel;
        },

        _makeFakeUI: function() {
            this._fakeUIElems = [];

            var canvas, ctx;

            var overlayX = 20;
            var overlayY = 300;

            var overlayW = 440;
            var overlayH = 40;

            var iconSize = 16;
            var iconPad = (overlayH - iconSize) / 2;

            // Rounded rect base
            canvas = Utils.makeCanvas(overlayW, overlayH);
            ctx = canvas.getContext('2d');
            roundedRect(ctx, 0, 0, overlayW, overlayH, 10);
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = 0.7;
            ctx.fill();
            this._fakeUIElems.push({
                canvas: canvas,
                x: overlayX,
                y: overlayY
            });

            var x = overlayX + iconPad;

            // Prev button
            canvas = Utils.makeCanvas(iconSize, iconSize);
            ctx = canvas.getContext('2d');
            ctx.moveTo(16, 0);
            ctx.lineTo(4, 8);
            ctx.lineTo(16, 16);
            ctx.moveTo(12, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(12, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            this._fakeUIElems.push({
                canvas: canvas,
                x: x,
                y: overlayY + iconPad
            });
            x += iconSize + iconPad;

            // Pause button
            canvas = Utils.makeCanvas(iconSize, iconSize);
            ctx = canvas.getContext('2d');
            ctx.rect(0, 0, 6, 16);
            ctx.rect(10, 0, 8, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            this._fakeUIElems.push({
                canvas: canvas,
                x: x,
                y: overlayY + iconPad
            });
            x += iconSize + iconPad;

            // Forward button
            canvas = Utils.makeCanvas(iconSize, iconSize);
            ctx = canvas.getContext('2d');
            ctx.moveTo(0, 0);
            ctx.lineTo(12, 8);
            ctx.lineTo(0, 16);
            ctx.moveTo(4, 0);
            ctx.lineTo(16, 8);
            ctx.lineTo(4, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            this._fakeUIElems.push({
                canvas: canvas,
                x: x,
                y: overlayY + iconPad
            });
            x += iconSize + iconPad;

            var seekW = overlayW - x;
            var seekH = 8;
            var seekY = overlayY + (overlayH - seekH) / 2;
            this._fakeUIElems.push({
                seek: true,
                x: x,
                y: seekY,
                w: seekW,
                h: seekH
            });
        },

        _makeSeekBar: function(elem, progress) {
            // Seek bar
            var canvas = Utils.makeCanvas(elem.w, elem.h);
            var ctx = canvas.getContext('2d');
            // Trough
            ctx.fillStyle = '#666666';
            ctx.rect(0, 0, elem.w, elem.h);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.rect(0, 0, elem.w * progress, elem.h);
            ctx.fill();
            return canvas;
        },

        _fetchNextDraw: function(destBuffer, cb) {
            this._seq.nextFrame(function(img) {
                var draws = [];
                draws.push(new Base.ChunkedDrawer(destBuffer, img));
                this._fakeUIElems.forEach(function(elem) {
                    var canvas;
                    if (elem.canvas)
                        canvas = elem.canvas;
                    else if (elem.seek)
                        canvas = this._makeSeekBar(elem, this._seq.getProgress());
                    draws.push(new Base.ChunkedDrawer(destBuffer, canvas, elem.x, elem.y));
                }.bind(this));
                var seq = new Base.DrawSequence(draws);
                cb(seq);
            }.bind(this));
        },

        handleKey: function(kc) {
            if (kc == 'q')
                this._drawHelper.toggleAuto();
            else if (kc == 'w')
                this._drawHelper.drawOnce();
            else if (kc == 'e')
                this._drawHelper.decRate(33);
            else if (kc == 'r')
                this._drawHelper.incRate(33);
            else if (kc == 'z')
                this._bufferManager.display.toggleVis();
        },
    });

    var SingleBufferVideoPlayer = new Class({
        Extends: BaseVideoPlayer,

        _makeBufferManager: function() {
            return new Base.SingleBufferManager(this._crtc);
        },
    });
    VideoPlayer.SingleBufferVideoPlayer = SingleBufferVideoPlayer;

    var AlwaysAllocateBufferVideoPlayer = new Class({
        Extends: BaseVideoPlayer,

        _makeBufferManager: function() {
            return new Base.AlwaysAllocateBufferManager(this._crtc);
        },
    });
    VideoPlayer.AlwaysAllocateBufferVideoPlayer = AlwaysAllocateBufferVideoPlayer;

    exports.VideoPlayer = VideoPlayer;

})(window);
