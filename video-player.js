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

    var Player = new Class({
        initialize: function(bufferManager, seq) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('component');
            this._toplevel.classList.add('video-player');

            this._seq = seq;
            this._bufferManager = bufferManager;

            this._drawOperations = [];
            this._drawOperations.push(new Base.DrawOperation("Draw Video", 0, 0, function(cb) {
                this._seq.nextFrame(function(img) {
                    cb(img);
                });
            }.bind(this)));
            this._makeFakeUI();

            var drawSequence = new Base.DrawSequence(this._drawOperations);
            this._drawHelper = new Base.DrawHelper(this._bufferManager, drawSequence);
            this._toplevel.appendChild(this._drawHelper.elem);

            this.elem = this._toplevel;
        },

        _makeFakeUI: function() {
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
            this._drawOperations.push(new Base.SimpleDrawOperation("Draw Rounded Rect", overlayX, overlayY, canvas));

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
            this._drawOperations.push(new Base.SimpleDrawOperation("Draw Prev Button", x, overlayY + iconPad, canvas));
            x += iconSize + iconPad;

            // Pause button
            canvas = Utils.makeCanvas(iconSize, iconSize);
            ctx = canvas.getContext('2d');
            ctx.rect(0, 0, 6, 16);
            ctx.rect(10, 0, 8, 16);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            this._drawOperations.push(new Base.SimpleDrawOperation("Draw Pause Button", x, overlayY + iconPad, canvas));
            x += iconSize + iconPad;

            // Next button
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
            this._drawOperations.push(new Base.SimpleDrawOperation("Draw Next Button", x, overlayY + iconPad, canvas));
            x += iconSize + iconPad;

            var seekW = overlayW - x;
            var seekH = 8;
            var seekY = overlayY + (overlayH - seekH) / 2;
            this._drawOperations.push(new Base.DrawOperation("Draw Seek Bar", x, seekY, function(cb) {
                // Seek bar
                var canvas = Utils.makeCanvas(seekW, seekH);
                var ctx = canvas.getContext('2d');
                // Trough
                ctx.fillStyle = '#666666';
                ctx.rect(0, 0, seekW, seekH);
                ctx.fill();
                ctx.beginPath();
                ctx.fillStyle = '#ffffff';
                var progress = this._seq.getProgress();
                ctx.rect(0, 0, seekW * progress, seekH);
                ctx.fill();
                cb(canvas);
            }.bind(this)));
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
    VideoPlayer.Player = Player;

    exports.VideoPlayer = VideoPlayer;

})(window);
