(function (f, define) {
    define(["./kendo.data", "./kendo.slider", "./kendo.toolbar"], f);
})(function () {

    var __meta__ = { // jshint ignore:line
        id: "mediaplayer",
        name: "MediaPlayer",
        category: "web",
        description: "",
        depends: ["data", "slider", "toolbar"]
    };

    (function ($, undefined) {
        var kendo = window.kendo,
        CHANGE = "change",
        PROGRESS = "progress",
        ERROR = "error",
        STATE_PLAY = "k-i-play",
        STATE_PAUSE = "k-i-pause",
        TITLEBAR = "k-mediaplayer-titlebar",
        TITLE = "k-title",
        TOOLBAR = "k-mediaplayer-toolbar",
        SLIDER = "k-mediaplayer-seekbar",
        VOLUME_SLIDER = "k-mediaplayer-volume",
        MEDIA = "k-mediaplayer-media",
        DOT = ".",
        ui = kendo.ui,
        ns = ".kendoMediaPlayer",
        baseTime = new Date(1970,0,1),  
        timeZoneSec = baseTime.getTimezoneOffset() * 60;                
        Widget = kendo.ui.Widget,
        //extend = $.extend,
        proxy = $.proxy,
        //each = $.each,
        templates = {
            htmlPlayer: "<video class='" + MEDIA + "'> </video>",
            titleBar: "<div class='" + TITLEBAR + "'><span class='" + TITLE + "'>Video Title</span><a role='button' class='k-icon k-font-icon k-i-playlist-open' style='float: right;''>Open Playlist</a></div>",
            toolBar: "<div class='" + TOOLBAR + "'> </div>",
            toolBarTime: "<span id='currentTime'>00:00:00</span> / <span id='duration'>00:00:00</span>",
            slider: "<input class='" + SLIDER + "' value='0' />",
            volumeSlider: "<input class='" + VOLUME_SLIDER + "'/>",
            toolTip: "#= kendo.toString(new Date(value), 'HH:mm:ss') #",
            playlistButton: "<a role='button' class='k-icon k-font-icon " + PLAYLIST_OPEN + "' style='float: right;''>Open Playlist</a>",
            playlist: template("<div style='height: 286px; margin-right: -280px;'' class='" + PLAYLIST + "'>" + 
                                    "<ul class='k-list'>" +
                                        "#= renderPlaylistItems(data) #" +
                                    "</ul>" +
                                "</div>"),
            playlistItem: template("<li class='k-list-item k-active-item'>" +
                                        "<a title='#= title #' href='\\#'>" +
                                            "<span class='k-image-wrap'>" +
                                                "<img alt='#= poster #' src='#= poster #'>" +
                                            "</span>" +
                                            "<span class='k-title'>#= title #</span></a></li>")
        },
        rendering = {
            renderPlaylistButton: function (options) {
              if (options.playlist && !(options.playlist.button === false)) {
                  return templates.playlistButton;
              }
              return "";
            },

            renderPlaylistItems: function (data) {
                var html = "",
                    i = 0;
                
                for (var i = 0; i < data.length; i++) {
                    var item = data[i];
                    html += templates.playlistItem({
                                title: item.title,
                                poster: item.poster
                            });
                }

                return html;
            }
        },
        DataSource = kendo.data.DataSource;


        var MediaPlayer = Widget.extend({
            init: function (element, options) {
                wrapper = $(element),

                options = $.isArray(options) ? { dataSource: options } : options;

                Widget.fn.init.call(this, element, options);

                wrapper.addClass("k-mediaplayer k-widget");
            
                options = this.options;
                
                this._createHtmlPlayer(options);

                this._createTitlebar(options);

                this._createToolbar(options);

                this._createSlider();

                this._createVolumeSlider(options);

                this._dataSource();

                if (this.options.autoBind) {
                    this.dataSource.fetch();
                }

                kendo.notify(this);
            },

            events: [

            ],

            options: {
                name: "MediaPlayer",
                autoBind: true,
                autoPlay: false,
                autoRepeat: false,
                volume: 100,
                fullScreen: false,
                mute: false,
                forwardSeek: false
            },

            _initData: function (options) {
                if (options.dataSource) {
                }
            },

            setDataSource: function (dataSource) {
                this.options.dataSource = dataSource;
                this._dataSource();

                if (this.options.autoBind) {
                    dataSource.fetch();
                }
            },

            _msToTime: function(ms) {
                var time = new Date(baseTime.getTime());
                time.setSeconds(ms);
                return time;
            },

            _timeToSec: function(time) {
                var curTime = new Date(time).getTime();
                return curTime / 1000;
            },

            _createTitlebar: function(options) {
                titleBar = wrapper.find(DOT + TITLEBAR);
                if (titleBar.length === 0) {
                    this._playlistButtonClickHandler = proxy(this._playlistButtonClick, this);
                    wrapper.append(templates.titleBar(extend(options, rendering)));
                    wrapper.find(DOT + PLAYLIST_OPEN).on("click" + ns, this._playlistButtonClickHandler);
                }
            },

            _playlistButtonClick: function () {
                wrapper.find(DOT + PLAYLIST).toggle();
            },

            _createSlider: function() {
                var sliderElement = wrapper.find(DOT + SLIDER);
                if (sliderElement.length === 0) {
                    this._sliderDragChangeHandler = proxy(this._sliderDragChange, this);
                    this._sliderDraggingHandler = proxy(this._sliderDragging, this);
                    wrapper.append(templates.slider);
                    sliderElement = $(DOT + SLIDER);
                    slider = new ui.Slider(sliderElement[0], {
                        smallStep: 1000,
                        tickPlacement: "none",
                        showButtons: false,
                        change: this._sliderDragChangeHandler,
                        slide: this._sliderDraggingHandler,
                        tooltip: {
                            template: templates.toolTip
                        }
                    });
                }
            },

            _createVolumeSlider: function(options) {
                volumeSliderlement = wrapper.find(DOT + VOLUME_SLIDER);
                if (volumeSliderlement.length === 0) {
                    this._volumeDraggingHandler = proxy(this._volumeDragging, this);
                    wrapper.append(templates.volumeSlider);
                    volumeSliderlement = $(DOT + VOLUME_SLIDER);
                    volumeSlider = new ui.Slider(volumeSliderlement[0], {
                        smallStep: 1,
                        orientation: "vertical",
                        value: options.mute ? 0 : 60,
                        min: 0,
                        max: 100,
                        slide: this._volumeDraggingHandler,
                        tickPlacement: "none",
                        showButtons: false
                    });
                }
            },

            _createPlaylist: function (data) {
                var playlistElement = wrapper.find(DOT + PLAYLIST);
                if (playlistElement.length === 0) {
                    this._playlistItemClickHandler = proxy(this._playlistItemClick, this);
                    wrapper.append(templates.playlist(extend(this.options, { data: data }, rendering)));
                    wrapper.find(DOT + PLAYLIST + "> ul > li").on("click" + ns, this._playlistItemClickHandler);
                    if (this.options.playlist.hidden) {
                        wrapper.find(DOT + PLAYLIST).hide();
                    }
                }
            },

            _resetTime: function(){
                this._media.currentTime = 0;
                this._mediaTimeUpdate();
                $.grep(toolBar.options.items, function(e) { return !!e.template; }).template = templates.toolBarTime; 
            },

            _playlistItemClick: function (e) {
                var item = $(e.target).parents("li");
                var data = this.dataSource.data();
                var currentItem = data[item.index()];
                if (currentItem) {
                    this._updateToolbarTitle(currentItem);
                    this._resetTime();
                    wrapper.find(DOT + MEDIA + " > source").remove();
                    wrapper.find(DOT + MEDIA).attr("src", currentItem.url);
                    this.play();
                    wrapper.find("#play").children().first().removeClass(STATE_PLAY)
                                                            .addClass(STATE_PAUSE);
                }
            },

            _createToolbar: function (options) {
                var toolBarElement = wrapper.find(DOT + TOOLBAR);
                if (toolBarElement.length === 0) { 
                    this._toolbarClickHandler = proxy(this._toolbarClick, this);                    
                    wrapper.append(templates.toolBar);
                    toolBarElement = $(DOT + TOOLBAR);
                    toolBarElement.width($(DOT + MEDIA).width());
                    toolBar = new ui.ToolBar(toolBarElement, {
                        resizable: true, 
                        click: this._toolbarClickHandler,
                        items: [
                            { type: "button", id: "play", spriteCssClass: "k-icon k-font-icon k-i-play" },
                            { type: "separator" },
                            { 
                                id: "timeTemplate",
                                template: templates.toolBarTime
                            },
                            { type: "button", id: "fullscreen", spriteCssClass: "k-icon k-font-icon k-i-fullscreen-enter" },
                            { type: "button", id: "volume", spriteCssClass: "k-icon k-font-icon k-i-volume-high" },
                            { type: "button", id: "hdbutton", spriteCssClass: "k-icon k-font-icon k-i-HD" }
                        ]
                    });
                    toolBarElement.width("auto");
                    currentTimeElement = toolBarElement.find("#currentTime");
                    durationElement = toolBarElement.find("#duration");
                    if (options.autoPlay) {
                        wrapper.find("#play").children().first()
                            .removeClass(STATE_PLAY)
                            .addClass(STATE_PAUSE); 
                    }
                } 
            },

            _toolbarClick: function (e) {
                var target = $(e.target).children().first();
                var isPaused = this._media.paused;

                if (e.id === "play") {
                    if (isPaused) {
                        this.play();
                        target
                            .removeClass(STATE_PLAY)
                            .addClass(STATE_PAUSE);                        
                    } 
                    else {
                        this.pause();
                        target
                            .removeClass(STATE_PAUSE)
                            .addClass(STATE_PLAY);   
                    }
                }

                if (e.id === "volume") {
                    
                }
            },

            _sliderDragging: function(e) {
                this._isDragging = true;
            },

            _sliderDragChange: function(e) {
                var tzOffset = timeZoneSec * 1000;
                this._isDragging = false;
                this._media.currentTime = this._timeToSec(e.value - tzOffset);
            },

            _volumeDragging: function(e) {
                this._media.volume = e.value / 100;
            },

            _mediaTimeUpdate: function(e) {
                var currentTime = this._msToTime(this._media.currentTime);
                currentTimeElement.text(kendo.toString(currentTime, 'HH:mm:ss'));
                if (!this._isDragging) {
                    slider.value((this._media.currentTime + timeZoneSec) * 1000);
                }
            },

            _mediaDurationChange: function(e) {
                var durationTime = this._msToTime(this._media.duration);
                durationElement.text(kendo.toString(durationTime, 'HH:mm:ss'));
                slider.setOptions({
                    min: baseTime.getTime(),
                    max: durationTime.getTime()
                });
                slider._distance = Math.round(slider.options.max - slider.options.min);
                slider._resize();

                if (!this._isFirstRun) {
                    this._resetTime();
                    this._isFirstRun = true;
                }
            },

             _createHtmlPlayer: function (options) {
                this._mediaTimeUpdateHandler = proxy(this._mediaTimeUpdate, this);
                this._mediaDurationChangeHandler = proxy(this._mediaDurationChange, this);
                wrapper.append(templates.htmlPlayer);
                this._media = wrapper.find(DOT + MEDIA)[0];
                $(this._media)
                    .css({
                        width: wrapper.width(),
                        height: wrapper.height() 
                    });
					
                if (options.autoPlay) {
                    $(this._media).attr("autoplay", "");  
                    
                }

                if (options.mute) {
                    this._media.volume = 0.0;  
                }
                else{
                    this._media.volume = 0.6;
                }

				
                this._media.ontimeupdate = this._mediaTimeUpdateHandler;
                this._media.ondurationchange = this._mediaDurationChangeHandler; 
            },

            setOptions: function (options) {
                if ("dataSource" in options) {
                    this._initData(options);
                }
                Widget.fn.setOptions.call(this, options);
            },

            destroy: function () {
                Widget.fn.destroy.call(this);

                this._unbindDataSource();

                this._playlistItemClickHandler = null;
                this._playlistButtonClickHandler = null;

                this._toolbarClickHandler = null;
                this._sliderDragChangeHandler = null;
                this._sliderDraggingHandler = null;
                this._volumeDraggingHandler = null;

                this.element.off(ns);
                this.element.find(DOT + PLAYLIST + "> ul > li").off(ns);
                this.element.find(DOT + PLAYLIST_OPEN).off(ns);

                this._media.ontimeupdate = this._mediaTimeUpdateHandler = null;
                this._media.ondurationchange = this._mediaDurationChangeHandler = null;

                kendo.destroy(this.element);
            },

            play: function () {
                this._media.play();
                return this;
            },

            pause: function () {
                this._media.pause();
                return this;
            },

            fullScreen: function (value) {
                return this;
            },

            _dataSource: function () {
                if (this.dataSource && this._refreshHandler) {
                    this._unbindDataSource();
                } else {
                    this._refreshHandler = proxy(this._refresh, this);
                    this._progressHandler = proxy(this._progress, this);
                    this._errorHandler = proxy(this._error, this);
                }

                this.dataSource = DataSource.create(this.options.dataSource)
                                    .bind(CHANGE, this._refreshHandler)
                                    .bind(PROGRESS, this._progressHandler)
                                    .bind(ERROR, this._errorHandler);
            },

            _unbindDataSource: function () {
                this.dataSource.unbind(CHANGE, this._refreshHandler)
                                .unbind(PROGRESS, this._progressHandler)
                                .unbind(ERROR, this._errorHandler);
            },

            _refresh: function () {
                var data = this.dataSource.data();
                if (data && data[0]) {

                    if (this.options.playlist) {
                        this._createPlaylist(data);
                    }

                    this._updateToolbarTitle(data[0]);
                    
                    var sourceElement = document.createElement("source");
                    sourceElement.setAttribute("src", data[0].url);
                    wrapper.find(DOT + MEDIA).append(sourceElement);
                }
            },

            _error: function () {
            },

            _progress: function () {
            },

        });

        ui.plugin(MediaPlayer);

    })(window.kendo.jQuery);

    return window.kendo;

}, typeof define == 'function' && define.amd ? define : function (a1, a2, a3) { (a3 || a2)(); });
