/**
\file error.js
A plugin to handle window.onerror events and beacon pre readyState errors by adding them to the beacon
*/

(function(w) {

    var d=w.document;

    BOOMR = BOOMR || {};
    BOOMR.plugins = BOOMR.plugins || {};

    var impl = {
	superObjects: {
	    XMLHttpRequest: XMLHttpRequest
	},
	reportRuntime: true,
	errorsBeforeReady: [],
	error_url: "",
	handleEvent : function(message, file, line, column, error) {
	    error = error || {};
	    var errorMessage = {
		message: message,
		origin: file,
		line: line,
		col: column,
		stack: error.stack || ""
	    };

	    if (d.readyState !== "complete") {
		impl.errorsBeforeReady.push(errorMessage);
	    } else if (impl.reportRuntime) {
		impl.sendData(errorMessage);
	    }

	    /* make sure we run the onerror function we initially replaced but
	     also don't explode the call stack if Boomerang ran twice */
	    if (typeof impl.wonerror !== "undefined") {
		if ( !impl.wonerror.__boomerang) {
		    impl.wonerror(message, file, line, column, error);
		}
	    }
	},
	handleXHRError: function(event) {
	    if (event.currentTarget.status > 399) {
		impl.sendData({
		    status: event.currentTarget.status,
		    statusText: event.currentTarget.statusText,
		    responseURL: event.currentTarget.responseURL,
		    timestamp: event.timeStamp,
                    loaded: event.loaded,
		    position: event.position
		});
	    }
	},
	onloaded: function() {
	    console.log("error: onloaded() called:", impl.errorsBeforeReady);
	    impl.errorsBeforeReady.forEach(function(error) {
		this.sendData(error);
	    },impl);
	},
	sendData : function(data) {
	    var keys = Object.keys(data);
	    var urlenc = "";
	    for (var i in keys) {
		urlenc += keys[i] + "=" + data[keys[i]] + "&";
	    }
	    BOOMR.info("Url-encoded string: " + urlenc);
	    var url = impl.error_url + "?" + urlenc;
	    var img = new Image();
	    img.src = url;
	    img.remove();
	},
	replaceObjects: function() {
	    w.XMLHttpRequest = function() {
		var ret = new impl.superObjects.XMLHttpRequest(arguments[0]);
		ret.addEventListener("error", impl.handleXHRError);
		ret.addEventListener("abort", impl.handleXHRError);
		ret.addEventListener("load", impl.handleXHRError);
		return ret;
	    };
	}
    };

    BOOMR.plugins.error = {
	init: function(config) {
	    var i, properties = ["reportRuntime", "error_url"];
	    BOOMR.utils.pluginConfig(impl, config, "error", properties);
	    impl.handleEvent.__boomerang = true;

	    impl.replaceObjects();

	    if (w.onerror === null) {
		w.onerror = impl.handleEvent;
		return this;
	    } else {
		/* don't override defined onerror function but rather let it be
		 executed after beacon callback was run */
		impl.wonerror = w.onerror;
		w.onerror = impl.handleEvent;
	    }
	    return this;
	},
	is_complete: function() {
	    return true;
	}
    };

}(window));
