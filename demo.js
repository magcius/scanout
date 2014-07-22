(function() {
    "use strict";

    var Demo = new Class({
        initialize: function() {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('demo');

            this._crtc = new Monitor.CRTC();
            this._components = [];

            this._buildLayout();

            this.elem = this._toplevel;
        },

        _buildLayout: function() {},

        _addComponent: function(component) {
            this._components.push(component);
            var wrapper = document.createElement('div');
            wrapper.classList.add('component-wrapper');
            wrapper.appendChild(component.elem);
            this._toplevel.appendChild(wrapper);
        },

        demoIn: function() {},
        demoOut: function() {},

        handleKey: function(kc) {
            this._components.forEach(function(component) {
                component.handleKey(kc);
            });
        },
    });

    var SimpleVideoPlayer = new Class({
        Extends:Demo,

        _buildLayout: function() {
            var videoPlayer = new VideoPlayer.AlwaysAllocateBufferVideoPlayer(this._crtc, new VideoPlayer.ImageSequence('rr', 38));
            this._addComponent(videoPlayer);

            this._addComponent(new Monitor.MonitorDisplay(this._crtc));
        }
    });

    var DEMOS = [
        // Layout 0: Nothing on the monitor
        // new MonitorDemo(),

        // Layout 1: Single-buffered video player, monitor
        new SimpleVideoPlayer(),
    ];

    var DemoRunner = new Class({
        initialize: function() {
            this._demoContainer = document.querySelector('.demo-container');

            this._demos = [];
            this._currentDemo = 0;

            DEMOS.forEach(function(demo) {
                this._addDemo(demo);
            }.bind(this));
        },

        _addDemo: function(demo) {
            this._demos.push(demo);
            this._demoContainer.appendChild(demo.elem);
            this._updateStyles();
        },

        _updateStyles: function() {
            this._demos.forEach(function(demo, i) {
                demo.elem.classList.toggle('is-prev', i < this._currentDemo);
                demo.elem.classList.toggle('is-next', i > this._currentDemo);
            }.bind(this));
        },
        _getCurrentDemo: function() {
            return this._demos[this._currentDemo];
        },
        _setCurrentDemo: function(idx) {
            if (this._currentDemo == idx)
                return;
            if (idx < 0)
                return;
            if (idx > this._demos.length - 1)
                return;

            this._getCurrentDemo().demoOut();
            this._currentDemo = idx;
            this._getCurrentDemo().demoIn();

            this._updateStyles();
        },

        handleKey: function(kc) {
            var idx = '1234567890'.indexOf(kc);
            if (idx >= 0)
                this._setCurrentDemo(idx);

            this._getCurrentDemo().handleKey(kc);
        },
    })

    var runner = new DemoRunner();

    window.addEventListener('keypress', function(e) {
        var kc = e.key || String.fromCharCode(e.keyCode);
        runner.handleKey(kc);
    });

})();
