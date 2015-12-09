(function(exports) {
    "use strict";

    // No, this is not going to be as dumb and stupid as xplain.

    var XorgServer = {};

    var Pixmap = new Class({
        initialize: function(buffer) {
            this._buffer = buffer;
            this._pendingDraws = [];
        },

        _fetchNextDraw: function(destBuffer, cb) {
        },

        addDraw: function(draw) {
            this._pendingDraws.push(draw);
        },
    });

    var Server = new Class({
        initialize: function(crtc) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('component');
            this._toplevel.classList.add('xorg-server');

            this._crtc = crtc;
            this._bufferManager = new Base.SingleBufferManager(this._crtc);

            this._drawHelper = new Base.DrawHelper(this._bufferManager, drawSequence);
            this._toplevel.appendChild(this._drawHelper.elem);

            this.elem = this._toplevel;
        },

        _fetchNextDraw: function(destBuffer, cb) {
            var buf = this._crtc.fetchNextBuffer();

            var seq;
            if (buf) {
                var draw = new Base.ChunkedDrawer("Scan Out Buffer", destBuffer, buf);
                var seq = new Base.DrawSequence([draw]);
            } else {
                seq = null;
            }

            cb(seq);
        },

        handleKey: function(kc) {
            if (kc == 'o')
                this._drawHelper.toggleAuto();
            else if (kc == 'p')
                this._drawHelper.drawOnce();
            else if (kc == '[')
                this._drawHelper.decRate(27);
            else if (kc == ']')
                this._drawHelper.incRate(27);
            else if (kc == ',')
                this._bufferManager.display.toggleVis();
        },
    });
    XorgServer.Server = Server;

    exports.XorgServer = XorgServer;

})(window);
