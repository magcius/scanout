(function(exports) {
    "use strict";

    var Base = {};

    var Buffer = new Class({
        initialize: function() {
            this.width = 480;
            this.height = 360;

            // Allocate the buffer
            this.canvas = Utils.makeCanvas(this.width, this.height);
            this.canvas.classList.add('buffer-content');
            this.ctx = this.canvas.getContext('2d');

            // ... and clear it to solid black.
            this.ctx.save();
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        },
    });

    var ChunkedDrawerVisualization = new Class({
        initialize: function(bufferWidth, bufferHeight) {
            this.canvas = Utils.makeCanvas(bufferWidth, bufferHeight);
            this.canvas.classList.add('buffer-content');
            this._ctx = this.canvas.getContext('2d');

            this._chunks = [];
            this._frameClock = new Utils.AnimationFrameClock(this._tick.bind(this));
            this._enabled = true;
        },

        _tick: function(dt) {
            // Clear canvas.
            this.canvas.width = this.canvas.width;

            // Nothing to do!
            if (!this._chunks.length)
                return false;

            for (var i = 0; i < this._chunks.length; i++) {
                var chunk = this._chunks[i];
                this._ctx.save();

                // Draw each chunk.
                var x = chunk[0],
                    y = chunk[1],
                    w = chunk[2],
                    h = chunk[3],
                    a = chunk[4];
                this._ctx.fillStyle = '#ff6666';
                this._ctx.globalAlpha = a;
                this._ctx.fillRect(x, y, w, h);

                // Fade each chunk out.

                // Chunks survive for 0.2 seconds, with a linear fade.
                var chunkLifetime = 0.2;
                var dtSecs = (dt / 1000);
                chunk[4] -= dtSecs / chunkLifetime;

                this._ctx.restore();
            }

            this._chunks = this._chunks.filter(function(chunk) {
                // Remove dead chunks.
                return chunk[4] >= 0.01;
            });

            return true;
        },

        onChunkModified: function(x, y, w, h) {
            if (!this._enabled)
                return;

            this._chunks.push([x, y, w, h, 1.0]);
            this._frameClock.start();
        },

        toggle: function() {
            this._enabled = !this._enabled;
        },
    });
    Base.ChunkedDrawerVisualization = ChunkedDrawerVisualization;

    var ChunkedDrawer = new Class({
        initialize: function(dest, src, x, y) {
            this._dest = dest;
            this._display = this._dest.$display;
            this._destOffsX = (x || 0);
            this._destOffsY = (y || 0);

            this._src = src;
            this._srcImage = (this._src.canvas || this._src);

            this._chunkSize = 8;

            var destW = this._src.width,
                destH = this._src.height;
            this._chunksInScanline = (destW / this._chunkSize);
            this._totalScanlines = (destH / this._chunkSize);

            this._totalChunks = (this._chunksInScanline * this._totalScanlines);

            this._currentChunk = 0;
        },

        onChunkModified: function(x, y, w, h) {},

        tick: function(dt) {
            // The clock "dt" is in some artificial time space. To pick
            // an arbitrary point, each chunk takes 1 unit in this time
            // space to scan.

            while (dt--) {
                var cx = Math.floor(this._currentChunk % this._chunksInScanline);
                var cy = Math.floor(this._currentChunk / this._chunksInScanline);

                var s = this._chunkSize;
                var srcX = cx * s;
                var srcY = cy * s;
                var destX = this._destOffsX + srcX;
                var destY = this._destOffsY + srcY;

                this._dest.ctx.drawImage(this._srcImage,
                    srcX, srcY, s, s,
                    destX, destY, s, s);

                if (this._display)
                    this._display.onChunkModified(destX, destY, s, s);

                this._currentChunk++;
                if (this._currentChunk >= this._totalChunks) {
                    // We're done.
                    return false;
                }
            }
            return true;
        },
    });
    Base.ChunkedDrawer = ChunkedDrawer;

    var DrawSequence = new Class({
        initialize: function(draws) {
            this._draws = draws;
            this._currentDraw = 0;
        },

        tick: function(dt) {
            var draw = this._draws[this._currentDraw];
            if (!draw.tick(dt)) {
                this._currentDraw++;
                if (this._currentDraw >= this._draws.length)
                    return false;
            }
            return true;
        },
    });
    Base.DrawSequence = DrawSequence;

    var BufferDisplay = new Class({
        initialize: function(buffer) {
            this._buffer = buffer;
            this._buffer.$display = this;

            this._toplevel = document.createElement('div');
            this._toplevel.appendChild(this._buffer.canvas);
            this._toplevel.classList.add('buffer-display');

            this._drawVis = new ChunkedDrawerVisualization(this._buffer.width, this._buffer.height);
            this._toplevel.appendChild(this._drawVis.canvas);
            this.onChunkModified = this._drawVis.onChunkModified.bind(this._drawVis);

            this.elem = this._toplevel;
        },

        toggleVis: function() {
            this._drawVis.toggle();
        },
    });

    var SingleBufferManager = new Class({
        initialize: function(crtc) {
            this._crtc = crtc;
            this._buffer = new Buffer();
            this.display = new BufferDisplay(this._buffer);

            if (this._crtc)
                this._crtc.setScanoutBuffer(this._buffer);
        },

        onDrawDone: function() {
            // Don't do anything.
        },

        fetchNewBuffer: function() {
            return this._buffer;
        },
    });
    Base.SingleBufferManager = SingleBufferManager;

    var AlwaysAllocateBufferDisplay = new Class({
        initialize: function() {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('always-allocate-buffer-display');

            this.elem = this._toplevel;

            // Add two fake buffers as our background.
            var elem;
            elem = document.createElement('div');
            elem.classList.add('buffer-display');
            elem.classList.add('buffer-content');
            elem.classList.add('fake');
            this._toplevel.appendChild(elem);

            elem = document.createElement('div');
            elem.classList.add('buffer-display');
            elem.classList.add('buffer-content');
            elem.classList.add('fake');
            elem.classList.add('scanout');
            this._toplevel.appendChild(elem);
        },

        addNewBuffer: function(buffer) {
            var display = new BufferDisplay(buffer);
            this._toplevel.appendChild(display.elem);
        },

        moveToScanoutPile: function(buffer) {
            var display = buffer.$display;
            display.elem.classList.add('scanout');
        },
    });

    // Always allocates a new buffer.
    var AlwaysAllocateBufferManager = new Class({
        initialize: function(crtc) {
            this._crtc = crtc;
            this.display = new AlwaysAllocateBufferDisplay();
            this._currentBuffer = null;
        },

        onDrawDone: function() {
            this._crtc.setScanoutBuffer(this._currentBuffer);
            this.display.moveToScanoutPile(this._currentBuffer);
        },

        fetchNewBuffer: function() {
            this._currentBuffer = new Buffer();
            this.display.addNewBuffer(this._currentBuffer);
            return this._currentBuffer;
        },
    });
    Base.AlwaysAllocateBufferManager = AlwaysAllocateBufferManager;

    // Helper for demos that control chunked drawing
    var ChunkedDrawerHelper = new Class({
        initialize: function(destBufferManager, fetchNextDraw) {
            this._destBufferManager = destBufferManager;
            this._fetchNextDraw = fetchNextDraw;

            this._frameClock = new Utils.AnimationFrameClock(this._tick.bind(this));

            this._rate = 20;
            this._auto = false;
            this._currentDraw = null;
        },

        _fetchAndDraw: function() {
            var destBuffer = this._destBufferManager.fetchNewBuffer();
            this._fetchNextDraw(destBuffer, function(newDraw) {
                setTimeout(function() {
                    this._currentDraw = newDraw;
                    if (this._currentDraw)
                        this._frameClock.start();
                }.bind(this), 1);
            }.bind(this));
        },

        _tick: function() {
            if (this._currentDraw.tick(this._rate))
                return true;

            this._destBufferManager.onDrawDone();

            this._currentDraw = null;
            if (this._auto)
                this._fetchAndDraw();
            return false;
        },

        drawOnce: function() {
            this._fetchAndDraw();
        },

        _setAuto: function(auto) {
            this._auto = auto;
            if (this._auto)
                this._fetchAndDraw();
        },

        toggleAuto: function() {
            this._setAuto(!this._auto);
        },

        incRate: function(v) {
            this._rate += v;
        },

        decRate: function(v) {
            this._rate = Math.max(0, this._rate - v);
        }
    });
    Base.ChunkedDrawerHelper = ChunkedDrawerHelper;

    exports.Base = Base;

})(window);
