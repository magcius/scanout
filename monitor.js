(function(exports) {
    "use strict";

    var Monitor = {};

    var CRTC = new Class({
        initialize: function() {
            this._scanoutBuffer = null;
        },

        setScanoutBuffer: function(newBuffer) {
            this._scanoutBuffer = newBuffer;
        },

        fetchNextBuffer: function() {
            return this._scanoutBuffer;
        },
    });
    Monitor.CRTC = CRTC;

    var MonitorDisplay = new Class({
        initialize: function(crtc) {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('component');
            this._toplevel.classList.add('monitor');

            this._crtc = crtc;
            this._bufferManager = new Base.SingleBufferManager(null);

            var drawOperation = new Base.DrawOperation("Scan Out Buffer", 0, 0, Base.BUFFER_WIDTH, Base.BUFFER_HEIGHT, function(cb) {
                cb(this._crtc.fetchNextBuffer());
            }.bind(this));
            var drawSequence = new Base.DrawSequence([drawOperation]);

            this._drawHelper = new Base.DrawHelper(this._bufferManager, drawSequence);
            this._toplevel.appendChild(this._drawHelper.elem);

            this.elem = this._toplevel;
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
    Monitor.MonitorDisplay = MonitorDisplay;

    exports.Monitor = Monitor;

})(window);
