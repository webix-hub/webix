import {uid, isArray, bind} from "../webix/helpers";
import {$$} from "../ui/core";

import i18n from "../webix/i18n";
import {use} from "../services";

import template from "../webix/template";



/*Data collection mapping logic */

const MapCollection = {
	$init:function(){
		this.$ready.push(this._create_scheme_init);
		this.attachEvent("onStructureUpdate", this._create_scheme_init);
		this.attachEvent("onStructureLoad", function(){
			if(!this._scheme_init_order.length)
				this._create_scheme_init();
		});
	},
	_create_scheme_init:function(){
		var stack = this._scheme_init_order = [];
		var config = this._settings;

		if (config.columns)
			this._build_data_map(config.columns);
		if (this._settings.map)
			this._process_field_map(config.map);

		if (stack.length){
			this.data._scheme_init = function(obj){
				for (var i=0; i<stack.length; i++){
					stack[i](obj);
				}
			};
		}
	},
	_process_field_map:function(map){
		for (var key in map)
			this._scheme_init_order.push(this._process_single_map(key, map[key]));
	},
	_process_single_map:function(target, map, extra){
		var source = map.replace(/^(\s|)\((date|number)\)/, "");
		var getSource;
		if (source === ""){
			getSource = a => a[target];
		} else {
			if (source.indexOf("#") === -1 && source.indexOf("{") === -1){
				source = "#"+source+"#";
			}
			getSource = template(source);
		}

		if (map.indexOf("(date)")===0){
			if (extra && !extra.format) extra.format = i18n.dateFormatStr;

			return function(obj){
				const dateStr = (getSource(obj) || "").toString();
				obj[target] = i18n.parseFormatDate(dateStr);
			};
		} else if (map.indexOf("(number)")===0){
			return function(obj){
				obj[target] = getSource(obj)*1;
			};
		} else {
			return function(obj){
				obj[target] = getSource(obj) || "";
			};
		}
	},
	_build_data_map:function(columns){ //for datatable
		for (var i=0; i<columns.length; i++){
			var map = columns[i].map;
			var id = columns[i].id;
			if (!id) {
				id = columns[i].id = "i"+uid();
				if (!columns[i].header)
					columns[i].header = "";
			}
			if (map)
				this._scheme_init_order.push(this._process_single_map(id, map, columns[i]));

			this._map_options(columns[i]);
		}
	},
	_map_options:function(element){
		var options = element.options||element.collection;
		if(options){
			if (typeof options === "string"){
				//id of some other view
				var options_view = $$(options);
				//or url
				if (!options_view){
					options_view = new (use("DataCollection"))({ url: options });
					this._destroy_with_me.push(options_view);
				}
				//if it was a view, special check for suggests
				if (options_view.getBody) options_view = options_view.getBody();
				this._bind_collection(options_view, element);
			} else if (!options.loadNext){
				if (options[0] && typeof options[0] == "object"){
					//[{ id:1, value:"one"}, ...]
					options = new (use("DataCollection"))({ data:options });
					this._bind_collection(options, element);
					this._destroy_with_me.push(options);
				} else {
					//["one", "two"]
					//or
					//{ 1: "one", 2: "two"}
					if (isArray(options)){
						var data = {};
						for (var ij=0; ij<options.length; ij++) data[options[ij]] = options[ij];
						element.options = options = data;
					}
					element.template = element.template || this._collection_accesser(options, element.id, element.optionslist);
				}
			} else {
				//data collection or view
				this._bind_collection(options, element);
			}
		}
	},
	_bind_collection:function(options, element){
		if (element){
			delete element.options;
			element.collection = options;
			element.template = element.template || this._bind_accesser(options, element.id, element.optionslist);
			var id = options.data.attachEvent("onStoreUpdated", bind(function(){
				this.refresh();
				if(this.refreshFilter)
					this.refreshFilter(element.id);
			}, this));
			this.attachEvent("onDestruct", function(){
				if (!options.$destructed) options.data.detachEvent(id);
			});
		}
	},
	_collection_accesser:function(options, id, multi){
		if (multi){
			var separator = typeof multi=="string"?multi:",";
			return function(obj){
				var value = obj[id] || obj.value;
				if (!value) return "";
				var ids = value.split(separator);
				for (var i = 0; i < ids.length; i++)
					ids[i] = options[ids[i]] || "";
				
				return ids.join(", ");
			};
		} else {
			return function(obj){
				return options[obj[id]]||obj.value||"";
			};
		}
	},
	_bind_accesser:function(col, id, multi){
		if (multi) {
			var separator = typeof multi=="string"?multi:",";
			return function(obj){
				var value = obj[id] || obj.value;
				if (!value) return "";

				var ids = value.split(separator);
				for (var i = 0; i < ids.length; i++){
					var data = col.data.pull[ids[i]];
					ids[i] = data ? (data.value  || "") : "";
				}
				
				return ids.join(", ");
			};
		} else {
			return function(obj){
				var prop = obj[id]||obj.value,
					data = col.data.pull[prop];
				if (data && (data.value || data.value ===0))
					return data.value;
				return "";
			};
		}
	}
};

export default MapCollection;