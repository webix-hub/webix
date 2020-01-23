import layout from "../views/layout";
import {protoUI} from "../ui/core";
import {_event} from "../webix/htmlevents";
import AtomDataLoader from "../core/atomdataloader";
import i18n from "../webix/i18n";
import {copy} from "../webix/helpers";

const api = {
	name: "filter",
	$init: function(config){
		if(!config.type)
			config.type = "number";

		this._conditions = config.conditions || this._getConditions(config.type);
		config.rows = this._configFilter(config);

		this.$ready.push(this._afterInit);
	},
	$onLoad(data, driver){
		this._fillList(data, driver);
	},
	_fillList(data, driver){
		const list = this._list || this.queryView("list");
		list.data.driver = driver;

		let listData = [];
		let unique = {};

		//check if datacollection
		if(data.data)
			data.data.each(item => this._checkItem(item, listData, unique));
		else
			driver.getRecords(data).forEach(item => this._checkItem(item, listData, unique));

		list.clearAll();
		list.parse(listData);

		//on first init widget is not ready, parsing is enough
		if(this._list){
			const includes = this._settings.value.includes;

			this._filterList();
			this._checkListData(includes);
		}
	},
	_checkItem(item, listData, unique){
		const value = item[this._settings.field];
		if(!unique[value]){
			unique[value] = true;
			listData.push(copy(item));
		}
	},
	_afterInit(){
		this._list = this.queryView("list");
		this._toggle = this.queryView("toggle");
		this._input = this.queryView({localId: "input"});

		if(this._settings.type != "date"){
			_event(this._input.$view, "input", ()=> this._updateFilter());
			this._select = this.queryView("richselect");
		}

		//provide data-like API
		this._list.data.provideApi(this, true);
		this._list.data.attachEvent("onSyncApply", ()=> this._fillList(this._list));

		this.setValue(this._settings.value, true);
	},
	_configFilter(config){
		const master = this;
		let filter;

		if(config.type == "date")
			filter = {
				view:"daterangepicker",
				localId:"input",
				on:{
					onChange:()=>{ master._updateFilter(); }
				}
			};
		else{
			const data = this._conditions;

			filter = {
				cols:[
					{
						view: "richselect",
						value: data[0].id,
						width: 160,
						options: data,
						on:{
							onChange:()=>{ master._updateFilter(); }
						}
					},
					{view: "text", localId:"input"}
				]
			};
		}

		const selectAll = {
			view:"toggle",
			batch:"includes",
			onLabel:i18n.combo.unselectAll,
			offLabel:i18n.combo.selectAll,
			value:true,
			on:{
				onItemClick: function(){
					master._selectAll(this.getValue());
					master.callEvent("onChange", []);
				}
			}
		};

		const list = {
			view:"list",
			batch:"includes",
			css:"webix_multilist",
			autoheight:true,
			borderless:true,
			yCount:5,
			type:"checklist",
			template: config.template || `#${config.field}#`,
			on:{
				onItemClick: function(id){
					const item = this.getItem(id);
					item.$checked = !item.$checked;
					this.refresh(id);
					master.callEvent("onChange", []);
					master._settings.value.includes = master._getIncludes();

					master._setSubviewValue(master._toggle, master._is_all_selected());
				}
			}
		};

		return [
			filter,
			selectAll,
			list
		];
	},
	_getConditions(type){
		const locale = i18n.filter;
		if(type == "number"){
			return [
				{id: ">", value: locale["greater"], handler: (a, b) => a > b },
				{id: "<", value: locale["less"], handler: (a, b) => a < b },
				{id: ">=", value: locale["greaterOrEqual"], handler: (a, b) => a >= b },
				{id: "<=", value: locale["lessOrEqual"], handler: (a, b) => a <= b },
				{id: "=", value: locale["equal"], handler: (a, b) => a == b },
				{id: "<>", value: locale["notEqual"], handler: (a, b) => a != b }
			];
		}
		else{
			return [
				{id: "equal", value: locale["equal"], handler: (a, b) => a.toLowerCase() == b.toLowerCase() },
				{id: "not equal", value: locale["notEqual"], handler: (a, b) => a.toLowerCase() != b.toLowerCase() },
				{id: "contains", value: locale["contains"], handler: (a, b) => a.toLowerCase().indexOf(b.toLowerCase()) != -1 },
				{id: "not contains", value: locale["notContains"], handler: (a, b) => a.toLowerCase().indexOf(b.toLowerCase()) == -1 }
			];
		}
	},
	_getFilterHandler(type){
		const filterType = this._settings.type;

		if(filterType == "date")
			return (a, b) => (!b.start || a >= Date.parse(b.start)) && (!b.end || a <= Date.parse(b.end) + 1000*60*60*24);
		else
			return this._conditions.find(obj => obj.id == type).handler;
	},
	_getIncludes(){
		const includes = [];

		this._list.data.each(obj => {
			if(obj.$checked)
				includes.push(obj[this._settings.field]);
		});

		return includes.length == this._list.count() ? null : includes;
	},
	getValue(){
		const value = {
			condition:{
				filter: this._input.getValue()
			}
		};

		const includes = this._getIncludes();
		if(includes)
			value.includes = includes;

		if(this._settings.type != "date")
			value.condition.type = this._select.getValue();

		return value;
	},
	_is_all_selected(){
		//find method searchs through all data
		const order = this._list.data.order;
		for(let i = 0; i < order.length; i++)
			if(!this.getItem(order[i]).$checked)
				return false;
		return true;
	},
	setValue(value, silent){
		value = this.$prepareValue(value);
		const type = this._settings.type;
		const condition = value.condition;
		const includes = value.includes;

		this._setSubviewValue(this._input, condition.filter);

		if(type != "date")
			this._setSubviewValue(this._select, condition.type);

		this._filterList();

		this._checkListData(includes);
		this._setSubviewValue(this._toggle, this._is_all_selected());

		this._settings.value = value;
		if(!silent)
			this.callEvent("onChange");
	},
	_checkListData(includes){
		const field = this._settings.field;

		this._list.data.each(obj => {
			obj.$checked = (!includes || includes.indexOf(obj[field]) != -1);
		});
		this._list.refresh();
	},
	_setSubviewValue(view, val){
		view.blockEvent();
		view.setValue(val);
		view.unblockEvent();
	},
	$prepareValue(value){
		value = value || {};

		if(!value.condition){
			const type = this._settings.type;
			value.condition = {
				filter: ""
			};
			if(type != "date")
				value.condition.type = this._conditions[0].id;
		}

		return value;
	},
	_filterList(){
		const condition = {
			filter: this._input.getValue(),
			type: this._select ? this._select.getValue() : ""
		};

		this._list.filter(item => {
			const field = item[this._settings.field];
			const handler = this._getFilterHandler(condition.type);
			return condition.filter ? handler(field, condition.filter) : true;
		});
	},
	_updateFilter(){
		this._filterList();
		this.showBatch("includes", !!this._list.count());
		this._setSubviewValue(this._toggle, true);
		this._selectAll(true);
		this.callEvent("onChange");
	},
	_selectAll(type){
		this._list.data.each(obj => {
			obj.$checked = type;
		});
		this._list.refresh();
		this._settings.value = this.getValue();
	},
	getFilterFunction(){
		const value = this.getValue();
		const condition = value.condition;
		const field = this._settings.field;

		const code = `
			var includes = ${JSON.stringify(value.includes)};
			var text = value["${field}"];
			if(includes)
				return includes.indexOf(text instanceof Date ? text.toISOString() : text) != -1;
			else{
				var handler = ${this._getFilterHandler(condition.type)};
				var filter = ${JSON.stringify(condition.filter)};
				return !filter || handler(text, filter);
			}`;

		return new Function("value", code);
	}
};

const view = protoUI(api, AtomDataLoader, layout.view);
export default {api, view};