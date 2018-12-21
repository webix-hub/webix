import {extend, bind, isArray} from "../../webix/helpers";
import {$$} from "../../ui/core";
import {assert} from "../../webix/debug";


const Mixin = {
	filterByAll:function(){
		//we need to use dynamic function creating
		var server = false;
		this.data.silent(function(){
			this.filter();
			var first = false;
			for (var key in this._filter_elements){
				assert(key, "empty column id for column with filtering");
				if(!this.isColumnVisible(key))
					continue;
				var record = this._filter_elements[key];
				var originvalue = record[2].getValue(record[0]);

				//saving last filter value, for usage in getState
				var inputvalue = originvalue;
				if (record[1].prepare)
					inputvalue = record[1].prepare.call(record[2], inputvalue, record[1], this);

				//preserve original value
				record[1].value = originvalue;
				var compare = record[1].compare;

				if (!this.callEvent("onBeforeFilter",[key, inputvalue, record[1]])) continue;
				if(record[2].$server || server){ //if one of filters is server side, do not run any client side filters
					server = true;
				} else {
					if (inputvalue === "") continue;

					if (compare){
						compare = this._multi_compare(key, compare);
						this.filter(bind(function(obj, value){
							if (!obj) return false;
							return compare(obj[key], value, obj);
						},this), inputvalue, first);
					}
					else
						this.filter(key, inputvalue, first);

					first = true;
				}
			}

			if (server)
				this._runServerFilter();

		}, this);

		if (!server){
			this.refresh();
			this.callEvent("onAfterFilter",[]);
		}
	},
	_multi_compare: function(key, compare){
		var column = this.getColumnConfig(key);
		var separator = column ? column.optionslist : null;

		//default mode
		if (!separator) 
			return compare;

		if(typeof separator != "string")
			separator = ",";

		return function(itemValue, inputValue, obj){
			if(!itemValue)
				return true;
			var ids = itemValue.split(separator);
			for (var i = 0; i < ids.length; i++) {
				if (compare(ids[i], inputValue, obj))
					return true;
			}
		};
	},
	filterMode_setter:function(mode){
		return extend(this.data._filterMode, mode, true);
	},
	getFilter:function(columnId){
		var filter = this._filter_elements[columnId];
		assert(filter, "Filter doesn't exists for column in question");

		if (filter && filter[2].getInputNode)
			return filter[2].getInputNode(filter[0]);
		return null;
	},
	registerFilter:function(node, config, obj){
		this._filter_elements[config.columnId] = [node, config, obj];
	},
	collectValues:function(id, mode){
		var values = [];
		var checks = { "" : true };

		var obj = this.getColumnConfig(id);
		var options = (mode && mode.visible) ? null : (obj.options||obj.collection);

		if (options){
			if (typeof options == "object" && !options.loadNext){
				//raw object
				if (isArray(options))
					for (var i=0; i<options.length; i++) 
						values.push({ id:options[i], value:options[i] });
				else
					for (var key in options) 
						values.push({ id:key, value:options[key] });
				return values;
			} else {
				//view
				if (typeof options === "string")
					options = $$(options);
				if (options.getBody)
					options = options.getBody();

				this._collectValues.call(options, "id", "value", values, checks);
			}
		} else
			this._collectValues(obj.id, obj.id, values, checks);

		var result  = { values: values };
		this.callEvent("onCollectValues", [id, result]);
		return result.values;
	},
	_collectValues:function(id, value,  values, checks){
		this.data.each(function(obj){
			var test = obj ? obj[id] : "";
			if (test !== undefined && !checks[test]){
				checks[test] = true;
				var lineid = obj[id];
				//special handling for 0 values
				//convert to string to create a valid ID
				if (lineid === 0) lineid = "0";
				values.push({ id:lineid, value:obj[value] });
			}
		}, this, true);

		if (values.length){
			var type = typeof values[0].value === "string" ? "string" : "raw";
			values.sort( this.data.sorting.create({ as:type, by:"value", dir:"asc" }) );
		}
	},
	_runServerFilter: function(){
		this.loadNext(0,0,{
			before:function(){
				if (this.editStop) this.editStop();
				this.clearAll(true);
			},
			success:function(){
				this.callEvent("onAfterFilter",[]);
			}
		},0,1);
	}
};

export default Mixin;