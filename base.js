(function(exports) {
    "use strict";

    var Base = {};

    var BufferDisplay = new Class({
        initialize: function(buffer) {
            this._buffer = buffer;

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

    var BUFFER_WIDTH = 480;
    var BUFFER_HEIGHT = 360;
    var Buffer = new Class({
        initialize: function() {
            this.width = BUFFER_WIDTH;
            this.height = BUFFER_HEIGHT;

            // Allocate the buffer
            this.canvas = Utils.makeCanvas(this.width, this.height);
            this.canvas.classList.add('buffer-content');
            this.ctx = this.canvas.getContext('2d');

            // ... and clear it to solid black.
            this.ctx.save();
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();

            this.display = new BufferDisplay(this);
        },
    });

    Base.BUFFER_WIDTH = BUFFER_WIDTH;
    Base.BUFFER_HEIGHT = BUFFER_HEIGHT;

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
                this._ctx.fillStyle = '#ff2266';
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
        initialize: function(dest, src, x, y, w, h) {
            this._dest = dest;
            this._display = this._dest.display;
            this._destOffsX = (x || 0);
            this._destOffsY = (y || 0);

            this._src = src;
            this._srcImage = (this._src.canvas || this._src);

            this._chunkSize = 8;

            this._chunksInScanline = (w / this._chunkSize);
            this._totalScanlines = (h / this._chunkSize);

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

    var DrawOperationDisplay = new Class({
        initialize: function(drawOp) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('draw-operation');

            this._drawOp = drawOp;
            this._toplevel.textContent = this._drawOp.title;

            this.elem = this._toplevel;
        },

        setActive: function(active) {
            this._toplevel.classList.toggle('active', active);
        },
    });

    var DrawOperation = new Class({
        initialize: function(title, x, y, w, h, fetchNextSrcBuffer) {
            this.title = title;
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this._fetchNextSrcBuffer = fetchNextSrcBuffer;
            this.display = new DrawOperationDisplay(this);
        },

        makeDrawer: function(destBuffer, cb) {
            this._fetchNextSrcBuffer(function(srcBuffer) {
                if (srcBuffer)
                    cb(new ChunkedDrawer(destBuffer, srcBuffer, this.x, this.y, this.w, this.h));
                else
                    cb(null);
            }.bind(this));
        },
    });
    Base.DrawOperation = DrawOperation;

    var SimpleDrawOperation = new Class({
        Extends: DrawOperation,

        initialize: function(title, x, y, src) {
            this.parent(title, x, y, src.width, src.height, function(cb) {
                cb(src);
            });
        },
    });
    Base.SimpleDrawOperation = SimpleDrawOperation;

    var DrawSequenceDisplay = new Class({
        initialize: function(sequence) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('draw-sequence');

            this._sequence = sequence;
            this._subdisplays = [];
            // XXX: private access, yuck
            this._sequence._draws.forEach(function(draw) {
                var display = draw.display;
                this._subdisplays.push(display);
                this._toplevel.appendChild(display.elem);
            }.bind(this));
            this._currentDraw = -1;

            this.elem = this._toplevel;
        },

        setCurrentDraw: function(idx) {
            if (this._currentDraw >= 0)
                this._subdisplays[this._currentDraw].setActive(false);
            this._currentDraw = idx;
            this._subdisplays[this._currentDraw].setActive(true);
        },

        setActive: function(active) {
            this._toplevel.classList.toggle('active', active);
        },
    });

    var DrawSequence = new Class({
        initialize: function(draws) {
            this._draws = draws;
            this._currentDraw = -1;
            this.display = new DrawSequenceDisplay(this);
        },

        advance: function() {
            this._currentDraw++;
            if (this._currentDraw >= this._draws.length)
                this._currentDraw = 0;

            this.display.setCurrentDraw(this._currentDraw);
            return (this._currentDraw == 0);
        },

        makeDrawer: function(destBuffer, cb) {
            var draw = this._draws[this._currentDraw];
            this.display.setCurrentDraw(this._currentDraw);
            draw.makeDrawer(destBuffer, cb);
        },
    });
    Base.DrawSequence = DrawSequence;

    var SingleBufferManager = new Class({
        initialize: function(crtc) {
            this._crtc = crtc;
            this._buffer = new Buffer();
            this.display = this._buffer.display;

            if (this._crtc)
                this._crtc.setScanoutBuffer(this._buffer);
        },

        fetchNextDestBuffer: function() {
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
            this._toplevel.appendChild(buffer.display.elem);
        },

        moveToScanoutPile: function(buffer) {
            var display = buffer.display;
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

        fetchNextDestBuffer: function() {
            // Move the existing buffer to the scanout pile.
            if (this._currentBuffer) {
                this._crtc.setScanoutBuffer(this._currentBuffer);
                this.display.moveToScanoutPile(this._currentBuffer);
            }

            // Create a new buffer
            this._currentBuffer = new Buffer();
            this.display.addNewBuffer(this._currentBuffer);
            return this._currentBuffer;
        },
    });
    Base.AlwaysAllocateBufferManager = AlwaysAllocateBufferManager;

    // Manages initiating draw sequences.
    var DrawHelper = new Class({
        initialize: function(destBufferManager, drawOperation) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('drawer-helper');

            this._destBufferManager = destBufferManager;
            this._drawOperation = drawOperation;

            this._frameClock = new Utils.AnimationFrameClock(this._tick.bind(this));

            this._toplevel.appendChild(this._destBufferManager.display.elem);
            this._toplevel.appendChild(this._drawOperation.display.elem);

            this._rate = 20;
            this._auto = false;
            this._currentDraw = null;
            this._currentDestBuffer = null;

            this.elem = this._toplevel;
        },

        _fetchAndDraw: function() {
            var isNewFrame = this._drawOperation.advance();
            if (isNewFrame)
                this._currentDestBuffer = this._destBufferManager.fetchNextDestBuffer();

            this._drawOperation.makeDrawer(this._currentDestBuffer, function(newDraw) {
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

            this._currentDraw = null;
            if (this._auto)
                this._fetchAndDraw();
            return false;
        },

        drawOnce: function() {
            if (this._currentDraw == null)
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
    Base.DrawHelper = DrawHelper;

    exports.Base = Base;

})(window);
