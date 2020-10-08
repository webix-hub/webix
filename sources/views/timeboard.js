import { protoUI } from "../ui/core";
import i18n from "../webix/i18n";
import layout from "../views/layout";
import { isUndefined, copy } from "../webix/helpers";
import wDate from "../core/date";
import { $active } from "../webix/skin";

const api = {
	name:"timeboard",
	defaults: {
		width:270,
		padding: $active.layoutPadding.space,
		margin: $active.layoutMargin.form,
		hours: true,
		seconds: false,
		twelve: /%([a,A])/.test(i18n.timeFormat)
	},

	$init: function(config) {
		this.$view.className += " webix_timeboard";

		let rows = [];
		const twelve = !isUndefined(config.twelve) ? config.twelve: this.defaults.twelve;
		const hours = !isUndefined(config.hours) ? config.hours : this.defaults.hours;
		const seconds = config.seconds || this.defaults.seconds;

		if (isUndefined(config.height)){
			const nrows = (1 + hours*1 + 1 + seconds*1 + (!!config.button)*1);
			config.height = $active.inputHeight * nrows + (config.margin||this.defaults.margin) * (nrows - 1) + (config.padding||this.defaults.padding) * 2;
		}

		rows.push(this._getClock(hours, seconds, twelve));
		rows.push(...this._getSliders(hours, seconds, twelve));
		if (config.button)
			rows.push(this._getDoneButton());

		config.rows = [{ 
			view:"form", 
			elements:rows, padding:0, borderless:true,
			on:{
				onChange:() => this._recollectValues()
			}
		}];

		this.$ready.push(function(){
			this._form = this.queryView("form");
			const value = this._settings.value;
			if(value) this.setValue(value);
		});
	},

	// accepts strings and Dates
	setValue: function(value) {
		const old = this._settings.value;
		value = this.$prepareValue(value);
		if(!wDate.equal(value, old)) {
			this._settings.value = value;
			this.callEvent("onChange", [value, old]);
		}
		if(value)
			this.$setValue(value);
	},

	$prepareValue:function(value){
		if (typeof value === "string")
			value = i18n.parseTimeFormatDate(value);
		return value;
	},

	$setValue:function(value){
		const obj = {};

		obj.minutes = obj.sminutes = value.getMinutes();
		if (this._settings.hours)
			obj.shours = obj.hours = value.getHours();
		if (this._settings.seconds)
			obj.sseconds = obj.seconds = value.getSeconds();

		if (this._settings.twelve){
			if (!isUndefined(obj.hours)) {
				obj.day_part = obj.hours > 11 ? i18n.pm[1] : i18n.am[1];
				obj.hours = !obj.hours || obj.hours == 12 ? 12 : obj.hours % 12;
				obj.shours =  obj.hours == 12 ? 0 : obj.hours;
			}
		}
		
		this._form.setValues(obj);
	},

	_recollectValues(){
		const values = this.$getValue();
		
		const date = this._settings.value ? wDate.copy(this._settings.value) : new Date();
		date.setHours(values.hours || 0);
		date.setMinutes(values.minutes);
		if(this._settings.seconds)
			date.setSeconds(values.seconds);

		this.setValue(date);
	},

	$getValue:function(){
		const values = this._form.getValues();
		if (this._settings.twelve && this._settings.hours){
			if(values.day_part == i18n.pm[1] && values.hours < 12)
				values.hours = (values.hours * 1 + 12).toString();
			else if(values.day_part == i18n.am[1] && values.hours == 12)
				values.hours = 0;
		}
		return values;
	},

	getValue: function() {
		if(this._settings.stringResult){
			const values = this.$getValue();
			const res = [];
			if(values.hours) res.push(values.hours);
			if(values.minutes) res.push(values.minutes);
			if(values.seconds) res.push(values.seconds);
			return res.join(":");
		}
		else
			return this._settings.value;
	},

	_getClock: function(hours, seconds, twelve) {
		const inputs = [
			{}, this._getText("minutes"),{}
		];

		const separator = {
			css: "colon_template", template: "<span class=\"colon\">:</span>",
			borderless: true, width: 18
		};

		if (hours)
			inputs.splice(1, 0, this._getText("hours", twelve), copy(separator));
		if (seconds)
			inputs.splice(-1, 0, copy(separator), this._getText("seconds"));
		
		if (twelve && hours){
			const am = i18n.am[1];
			const pm = i18n.pm[1];

			const control = {
				view: "label",
				name: "day_part",
				css: "day_part",
				template:"<div tabindex='0' role='button' class='webix_el_box' style='width:#awidth#px;height:#aheight#px;line-height:#cheight#px'>#label#</div>",
				inputWidth:25,
				on: {
					onItemClick:function(){
						this.setValue(this.getValue() == am ? pm : am);
					},
					onKeyPress:function(code, e){
						this._onKeyPress(code, e);
					}
				}
			};

			inputs.splice(-1, 1, control);
		}

		return {
			type: "clean",
			cols: inputs
		};
	},

	_getText: function(name, twelve) {
		const max = name === "hours" ? (twelve ? 11 : 23) : 59;

		return {
			view: "text",
			width: 46, 
			name: name,
			format: {
				parse: a => {
					if (a == 12 && name === "hours") a = "00";
					return (a.length > 1) ? a.replace(/^0/, "") : a || 0;
				},
				edit: a => {
					if (a <= 0 && name === "hours" && twelve) a = 12;
					else if (a < 0) a = 0;
					else if (a > max) a = max;
					return (a + "").length === 1 ? "0" + a : a + "" || "00";
				}
			},
			on: {
				onChange:(nv) => {
					this._form.elements["s"+name].setValue((twelve && name === "hours" && (!nv || nv == 12) ? 0 : nv) * 1);
				},
			},
		};
	},

	_getSliders: function(hours, seconds, twelve) {
		const sliders = [
			this._getSlider("minutes", i18n.calendar.minutes, 59)
		];

		if (hours) {
			sliders.unshift(this._getSlider(
				"hours", 
				i18n.calendar.hours, twelve ? 11 : 23
			));
		}
		
		if (seconds)
			sliders.push(this._getSlider("seconds", i18n.timeboard.seconds, 59, twelve));

		return sliders;
	},

	_getSlider: function(name, title, max, twelve) {
		const enLocale = name === "hours" && twelve;
		
		const config = {
			view: "slider",
			name: "s" + name,
			title: title,
			moveTitle: false,
			min: 0, max: max,
			on: {
				onChange:(nv) => {
					this._form.elements[name].setValue((enLocale ? (!nv || nv == 12 ? 12 : nv%12) : nv) + "");
				},
				onSliderDrag:function(){
					const nv = this.getValue();
					const form = this.getFormView();
					form.blockEvent();
					form.elements[name].setValue((enLocale ? (!nv || nv == 12 ? 12 : nv%12) : nv) + "");
					form.unblockEvent();
				}
			}
		};

		return config;
	},

	_getDoneButton: function() {
		return { 
			view: "button",
			value: i18n.calendar.done,
			css: "webix_primary",
			click: () => {
				this.callEvent("onTimeSelect", [ this._settings.value ]);
			} 
		};
	}
};

const view = protoUI(api, layout.view);
export default { api, view };
