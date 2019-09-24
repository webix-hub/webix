import {errorMessage} from "./common";

import promise from "../../thirdparty/promiz";
import require from "../../load/require";
import env from "../../webix/env";

import {assert} from "../../webix/debug";
import {toNode} from "../../webix/helpers";
import {download} from "../../webix/html";
import {$$} from "../../ui/core";

export const toPNG = function(id, options){
	var defer = promise.defer();

	return require(env.cdn + "/extras/html2canvas-1.0.min.js").then(function(){
		//backward compatibility
		if (typeof options === "string") options = { filename: options };
		options = options || {};

		var view = $$(id);
		if (view && view.$exportView)
			view = view.$exportView(options);
		assert(view, errorMessage);
		if(!view) return defer.reject(errorMessage);

		var node = view ? view.$view : toNode(id);
		var filename = (options.filename||"Data")+".png";

		window.html2canvas(node, {background:"#fff", logging:false, useCORS:true}).then(function(canvas) {
			var callback = function(data){
				if(options.download !== false)
					download(data, filename);
				canvas.remove();
				defer.resolve(data);
			};
			if(canvas.msToBlob)
				callback(canvas.msToBlob());
			else
				canvas.toBlob(callback, "image/png");
		});
		return defer;
	});
};