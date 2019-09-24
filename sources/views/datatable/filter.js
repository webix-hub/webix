import {extend, bind} from "../../webix/helpers";
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
				return false;
			var ids = itemValue.toString().split(separator);
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

		if (filter && filter[2].getInputNode)
			return filter[2].getInputNode(filter[0]);
		return null;
	},
	registerFilter:function(node, config, obj){
		this._filter_elements[config.columnId] = [node, config, obj];
	},
	collectValues:function(id, mode){
		let values;
		let obj = this.getColumnConfig(id);
		let options = (mode && mode.visible) ? null : obj.collection;

		if (options)
			values = this._collectValues.call(options, "id", "value");
		else values = this._collectValues(obj.id, obj.id);

		let result  = { values: values };
		this.callEvent("onCollectValues", [id, result]);
		return result.values;
	},
	_collectValues:function(id, value){
		let checks = { "" : true };
		let values = [];

		this.data.each(function(obj){
			let test = obj ? obj[id] : "";
			if (test !== undefined && !checks[test]){
				checks[test] = true;
				let lineId = obj[id];
				//special handling for 0 values
				//convert to string to create a valid ID
				if (lineId === 0) lineId = "0";
				values.push({ id:lineId, value:obj[value] });
			}
		}, this, true);

		if (values.length){
			let type = typeof values[0].value === "string" ? "string" : "raw";
			values.sort( this.data.sorting.create({ as:type, by:"value", dir:"asc" }) );
		}
		return values;
	},
	_runServerFilter: function(){
		this.loadNext(0, 0, 0, 0, 1).then((data) => {
			if (this.editStop)this.editStop();
			this.clearAll(true);
			this.parse(data);
			this.callEvent("onAfterFilter",[]);
		});
	}
};

export default Mixin;