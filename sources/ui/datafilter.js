import {preventEvent} from "../webix/html";
import {ajax} from "../load/ajax";
import template from "../webix/template";
import {bind, extend} from "../webix/helpers";
import {$$} from "../ui/core";
import i18n from "../webix/i18n";
import {_event} from "../webix/htmlevents";
import wDate from "../core/date";


const datafilter = {
	textWaitDelay:500,
	"summColumn":{
		getValue:function(node){ return node.firstChild.innerHTML; },
		setValue: function(){},
		refresh:function(master, node, value){ 
			var result = 0;
			master.mapCells(null, value.columnId, null, 1, function(value){
				value = value*1;
				if (!isNaN(value))
					result+=value;
			}, true);

			if (value.format)
				result = value.format(result);
			if (value.template)
				result = value.template({value:result});

			node.firstChild.innerHTML = result;
		},
		trackCells:true,
		render:function(master, config){ 
			if (config.template)
				config.template = template(config.template);
			return ""; 
		}
	},
	"masterCheckbox":{
		getValue:function(){},
		setValue:function(){},
		getHelper:function(node, config){
			return {
				check:function(){ config.checked = false; node.onclick(); },
				uncheck:function(){ config.checked = true; node.onclick(); },
				isChecked:function(){ return config.checked; }
			};
		},
		refresh:function(master, node, config){
			node.onclick = function(){
				this.getElementsByTagName("input")[0].checked = config.checked = !config.checked;
				var column = master.getColumnConfig(config.columnId);
				var checked = config.checked ? column.checkValue : column.uncheckValue;
				master.data.each(function(obj){
					obj[config.columnId] = checked;
					master.callEvent("onCheck", [obj.id, config.columnId, checked]);
					this.callEvent("onStoreUpdated", [obj.id, obj, "save"]);
				});
				master.refresh();
			};
		},
		render:function(master, config){ 
			return "<input type='checkbox' "+(config.checked?"checked='1'":"")+">"; 
		}
	},
	"textFilter":{
		getInputNode:function(node){ return node.firstChild?node.firstChild.firstChild:{ value: null }; },
		getValue:function(node){ return this.getInputNode(node).value;  },
		setValue:function(node, value){ this.getInputNode(node).value = value;  },
		refresh:function(master, node, value){
			node.component = master._settings.id;
			master.registerFilter(node, value, this);
			node._comp_id = master._settings.id;
			if (value.value && this.getValue(node) != value.value) this.setValue(node, value.value);
			node.onclick = preventEvent;
			_event(node, "keydown", this._on_key_down);
		},
		render:function(master, config){
			if (this.init) this.init(config);
			config.css = "webix_ss_filter"; 
			return "<input "+(config.placeholder?("placeholder=\""+config.placeholder+"\" "):"")+"type='text'>"; 
		},
		_on_key_down:function(e){
			var id = this._comp_id;

			//tabbing through filters must not trigger filtering
			//we can improve this functionality by preserving initial filter value
			//and comparing new one with it
			if ((e.which || e.keyCode) == 9) return;

			if (this._filter_timer) window.clearTimeout(this._filter_timer);
			this._filter_timer=window.setTimeout(function(){
				var ui = $$(id);
				//ensure that ui is not destroyed yet
				if (ui) ui.filterByAll();
			},datafilter.textWaitDelay);
		}
	},
	"selectFilter":{
		getInputNode:function(node){ return node.firstChild?node.firstChild.firstChild:{ value: null}; },
		getValue:function(node){ return this.getInputNode(node).value;  },
		setValue:function(node, value){ this.getInputNode(node).value = value;  },
		refresh:function(master, node, value){
			//value - config from header { contet: }
			value.compare = value.compare || function(a,b){ return a == b; };

			node.component = master._settings.id;
			master.registerFilter(node, value, this);

			var data;
			var options = value.options;
			if (options){
				if(typeof options =="string"){
					data = value.options = [];
					ajax(options).then(bind(function(data){
						value.options = data.json();
						this.refresh(master, node, value);
					}, this));
				} else
					data = options;
			}
			else{
				data = master.collectValues(value.columnId, value.collect);
				data.unshift({ id:"", value:"" });
			}

			var optview = $$(options);
			if(optview && optview.data && optview.data.getRange){
				data = optview.data.getRange();
			}
			//slow in IE
			//http://jsperf.com/select-options-vs-innerhtml

			var select = document.createElement("select");
			for (var i = 0; i < data.length; i++){
				var option = document.createElement("option");
				option.value = data[i].id;
				option.text = data[i].value;
				select.add(option);
			}

			node.firstChild.innerHTML = "";
			node.firstChild.appendChild(select);

			if (value.value) this.setValue(node, value.value);
			node.onclick = preventEvent;

			select._comp_id = master._settings.id;
			_event(select, "change", this._on_change);
		},
		render:function(master, config){  
			if (this.init) this.init(config);
			config.css = "webix_ss_filter"; return ""; },
		_on_change:function(){ 
			$$(this._comp_id).filterByAll();
		}
	}
};

datafilter.serverFilter = extend({
	$server: true,
	_on_key_down:function(e){
		var id = this._comp_id,
			code = (e.which || e.keyCode);

		//ignore tab and navigation keys
		if (code == 9 || ( code >= 33 &&  code <= 40)) return;
		if (this._filter_timer) window.clearTimeout(this._filter_timer);
		this._filter_timer=window.setTimeout(function(){
			$$(id).filterByAll();
		},datafilter.textWaitDelay);
	}
}, datafilter.textFilter);

datafilter.serverSelectFilter = extend({
	$server: true,
	_on_change:function(){
		var id = this._comp_id;
		$$(id).filterByAll();
	}
}, datafilter.selectFilter);

datafilter.numberFilter = extend({
	init:function(config){
		config.prepare = function(value){
			var equality = (value.indexOf("=") != -1)?1:0;
			var intvalue = this.format(value);
			if (intvalue === "") return "";

			if (value.indexOf(">") != -1) 
				config.compare = this._greater;
			else if (value.indexOf("<") != -1){
				config.compare = this._lesser;
				equality *= -1;
			}
			else {
				config.compare = this._equal;
				equality = 0;
			}

			return intvalue - equality;
		};
	},
	format:function(value){
		return value.replace(/[^\-.0-9]/g,"");
	},
	_greater:function(a,b){ return a*1>b; },
	_lesser:function(a,b){ return a!=="" && a*1<b; },
	_equal:function(a,b){ return a*1==b; }	
}, datafilter.textFilter);

datafilter.dateFilter = extend({
	format:function(value){
		if (value === "") return "";
		var date = new Date();

		if (value.indexOf("today") != -1){
			date = wDate.dayStart(date);
		} else if (value.indexOf("now") == -1){
			var parts = value.match(/[0-9]+/g);
			if (!parts||!parts.length) return "";
			if (parts.length < 3){
				parts.reverse();
				date = new Date(parts[0], (parts[1]||1)-1, 1);
			} else
				date = i18n.dateFormatDate(value.replace(/^[>< =]+/,""));
		}
		return date.valueOf();
	}
}, datafilter.numberFilter);

export default datafilter;