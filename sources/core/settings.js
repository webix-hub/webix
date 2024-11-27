import {extend} from "../webix/helpers";

const Settings={
	$init:function(){
		/* 
			property can be accessed as this.config.some
			in same time for inner call it have sense to use _settings
			because it will be minified in final version
		*/
		this._settings = this.config = {}; 
	},
	define:function(property, value){
		if (typeof property === "object")
			return this._parseSettingColl(property);
		return this._define(property, value);
	},
	_define:function(property, value, coll){
		//method with name {prop}_setter will be used as property setter
		//setter is optional
		const setter = this[property + "_setter"];
		return (this._settings[property] = setter ? setter.call(this, value, property, coll) : value);
	},
	//process configuration object
	_parseSettingColl:function(coll){
		if (coll) {
			// set value for each setting/property from config
			for (const property in coll) 
				this._define(property, coll[property], coll);
		}
	},
	//helper for object initialization
	_parseSettings:function(obj,initial){
		//initial - set of default values
		var settings = {}; 
		if (initial)
			settings = extend(settings,initial);
					
		//code below will copy all properties over default one
		if (typeof obj === "object" && !obj.tagName)
			extend(settings,obj, true);	
		//call config for each setting
		this._parseSettingColl(settings);
	},
	_mergeSettings:function(config, defaults){
		for (var key in defaults)
			switch(typeof config[key]){
				case "object": 
					config[key] = this._mergeSettings((config[key]||{}), defaults[key]);
					break;
				case "undefined":
					config[key] = defaults[key];
					break;
				default:	//do nothing
					break;
			}
		return config;
	}
};

export default Settings;