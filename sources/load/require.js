import {create} from "../webix/html.js";
import {exec} from "../webix/helpers.js";
import {ajax} from "./ajax.js";

import Promise from "../thirdparty/promiz";

const _modules = {};	//hash of already loaded modules

//loads module from external js file
export default function require(module, callback, master){
	var promise = Promise.defer();

	if (callback && callback !== true)
		promise = promise.then(function(){ callback.call(master || this); });

	if (require.disabled){
		promise.resolve();
		return promise;
	}

	//multiple files required at once
	if (typeof module != "string"){
		var count = module.length||0;
		
		if (!count){
			// { file: true, other: true }
			for (let file in module) count++; // eslint-disable-line
			let callback2 = function(){
				count--;
				if (count === 0)
					promise.resolve();
			};
			for (let file in module)
				require(file, callback2, master);
		} else {
			// [ file, other ]
			let callback2 = function(){
				if (count){
					count--;
					require(module[module.length - count - 1], callback2, master);
				} else {
					promise.resolve();
				}
			};
			callback2();
		}
		return promise;
	}

	if (_modules[module] !== true){
		var fullpath = module;

		//css, async, no waiting
		if (module.substr(module.length-4) == ".css") {
			var link = create("LINK",{  type:"text/css", rel:"stylesheet", href:fullpath});
			document.getElementsByTagName("head")[0].appendChild(link);
			promise.resolve();
			return promise;
		}

		//js, async, waiting
		if (callback === true){
			//sync mode
			exec( ajax().sync().get(fullpath).responseText );
			_modules[module]=true;

		} else {

			if (!_modules[module]){	//first call
				_modules[module] = [promise];

				var newScript = document.createElement("script");
				var calls = _modules[module];	//callbacks

				newScript.onerror = function(){
					_modules[module] = false;
					for (var i=0; i<calls.length; i++)
						calls[i].reject();
				};

				newScript.onload = function(){
					_modules[module] = true;
					for (var i=0; i<calls.length; i++)
						calls[i].resolve();
				};
				document.getElementsByTagName("head")[0].appendChild(newScript);
				newScript.src = fullpath;
				
			} else	//module already loading
				_modules[module].push(promise);

		}
	} else 
		promise.resolve();

	return promise;
}