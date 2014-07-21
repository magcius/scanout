(function() {
    "use strict";

    var Demo = new Class({
        initialize: function() {
            this._toplevel = document.createElement('div');
            this._toplevel.classList.add('demo');

            this._inputContainer = document.createElement('div');
            this._inputContainer.classList.add('input-container');
            this._toplevel.appendChild(this._inputContainer);

            this._outputContainer = document.createElement('div');
            this._outputContainer.classList.add('output-container');
            this._toplevel.appendChild(this._outputContainer);

            this._crtc = new Monitor.CRTC();
            this._components = [];

            this._buildLayout();

            this.elem = this._toplevel;
        },

        _buildLayout: function() {},

        _addInput: function(component) {
            this._components.push(component);
            this._inputContainer.appendChild(component.elem);
        },
        _addOutput: function(component) {
            this._components.push(component);
            this._outputContainer.appendChild(component.elem);
        },

        demoIn: function() {},
        demoOut: function() {
            this._outputContainer.classList.remove('fullscreen');
        },

        handleKey: function(kc) {
            this._components.forEach(function(component) {
                component.handleKey(kc);
            });

            if (kc == 'l')
                this._outputContainer.classList.toggle('fullscreen');
        },
    });

    var MonitorDemo = new Class({
        Extends: Demo,

        _buildLayout: function() {
            this.parent();
            this._addOutput(new Monitor.MonitorDisplay(this._crtc));
        },
    });

    var SimpleVideoPlayer = new Class({
        Extends: MonitorDemo,

        _buildLayout: function() {
            this.parent();
            var videoPlayer = new VideoPlayer.AlwaysAllocateBufferVideoPlayer(this._crtc, new VideoPlayer.ImageSequence('rr', 38));
            this._addInput(videoPlayer);
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
