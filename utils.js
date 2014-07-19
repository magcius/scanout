(function(exports) {
    "use strict";

    var Utils = {};

    Utils.makeCanvas = function(w, h) {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        return canvas;
    }

    var AnimationFrameClock = new Class({
        initialize: function(func) {
            this._func = func;
            this._time = undefined;
            this._running = false;
        },

        _schedule: function() {
            window.requestAnimationFrame(this._tick.bind(this));
        },

        _tick: function(time) {
            var dt;
            if (this._time === undefined)
                dt = 0;
            else
                dt = (time - this._time);

            this._time = time;

            this._running = this._func(dt);
            if (this._running)
                this._schedule();
        },

        start: function() {
            if (this._running)
                return;

            this._running = true;
            this._schedule();
        },
    });
    Utils.AnimationFrameClock = AnimationFrameClock;

    exports.Utils = Utils;

})(window);
