import {createCss} from "../../webix/html";
import {extend, copy} from "../../webix/helpers";

import SVG from "./svg";

const defaults = {
	paddingX: 3,
	paddingY: 4,
	width: 20,
	margin: 4,
	minHeight: 4,
	eventRadius: 8,
	origin:0,
	itemCss: function(value){return value < (this.config.origin||0)?" webix_sparklines_bar_negative":"";}
};

function Bar(config){
	this.config = extend(copy(defaults),config||{},true);
}

Bar.prototype.draw = function(data, width, height){
	let graph = "";
	const config = this.config;
	const renderer = SVG;
	const horizontal = config.horizontal;
	const items = [];
	const origin = parseInt(this._getOrigin(data, width, height),10)+0.5;
	const points = this.getPoints(data, width, height, origin);

	// draw bars
	for(let i = 0; i< points.length; i++){
		let css;
		css = (typeof config.itemCss == "function"?config.itemCss.call(this,data[i]):(config.itemCss||""));
		if (config.negativeColor && data[i] < config.origin)
			css += " "+this._applyColor(renderer,config.negativeColor);
		else if(config.color)
			css += " "+this._applyColor(renderer,config.color);
		const p = points[i];
		items.push(renderer.getRect(p.x, p.y, p.width, p.height,"webix_sparklines_bar "+css));
	}
	graph += renderer.group(items.join(""));

	// origin
	const padding = horizontal ? config.paddingY : config.paddingX;

	if(horizontal)
		graph += renderer.group(renderer.getLine({x: origin, y: padding},{x: origin, y: height-padding},"webix_sparklines_origin"));
	else
		graph += renderer.group(renderer.getLine({x: padding, y: origin},{x: width-padding, y: origin},"webix_sparklines_origin"));

	// event areas
	const evPoints = this._getEventPoints(data, width, height, origin);
	const evItems = [];
	for(let i = 0; i< evPoints.length; i++){
		const p = evPoints[i];
		evItems.push(renderer.getRect(p.x, p.y, p.width, p.height,"webix_sparklines_event_area ",{"webix_area":i}));
	}
	graph += renderer.group(evItems.join(""));
	return  renderer.draw(graph, width, height, "webix_sparklines_bar_chart"+(config.css?" "+config.css:""));
};
Bar.prototype._applyColor = function(renderer,color){
	const config = {},
		map = renderer.styleMap;
	if(color)
		config[map.color] = color;
	return createCss(config);
};
Bar.prototype._getOrigin = function(data, width, height){
	const config = this.config;
	const horizontal = config.horizontal;
	const padding = horizontal ? config.paddingX : config.paddingY;
	const size = ((horizontal ? width : height)||100)-padding*2;
	let pos;

	if(horizontal)
		pos = padding;
	else{
		pos = padding+size;
	}

	if(config.origin !== false){
		const minValue = Math.min(...data);
		const maxValue = Math.max(...data);
		const origin = config.origin||-0.000001;
		if(origin >= maxValue){
			pos = padding;
		}
		else if(origin > minValue){
			const unit = size/(maxValue - minValue);
			pos += (horizontal ? 1 : -1)*unit*(origin-minValue);
		}
	}
	return pos;
};
Bar.prototype._getEventPoints = function(data, width, height){
	const result = [];
	const horizontal = this.config.horizontal;
	const x = this.config.paddingX;
	const y = this.config.paddingY;
	width = (width||100)-x*2;
	height = (height||100)-y*2;
	if(data.length){
		const unit = (horizontal ? height : width)/data.length;
		for(let i = 0; i < data.length; i++){
			if(horizontal)
				result.push({x, y: Math.ceil(unit*i)+y, height: unit, width});
			else
				result.push({x: Math.ceil(unit*i)+x, y, height, width: unit});
		}
	}
	return result;
};
Bar.prototype.getPoints = function(data, width, height, originPos){
	const config = this.config;
	const horizontal = config.horizontal;
	let minValue = Math.min(...data);
	if (config.origin < minValue) 
		minValue = config.origin;

	const maxValue = Math.max(...data);
	const result = [];
	const x = config.paddingX;
	const y = config.paddingY;
	let margin = config.margin;
	let barWidth = config.width||20;

	width = (width||100)-x*2;
	height = (height||100)-y*2;
	if(data.length){
		const unit = (horizontal ? height : width)/data.length;
		const scale = config.scale || (maxValue - minValue);
		barWidth = Math.min(unit-margin,barWidth);
		margin = unit-barWidth;
		let origin = minValue;

		if(config.origin !== false && config.origin > minValue)
			origin = config.origin||0;

		const itemHeight = (horizontal ? width : height)/(scale||1);

		for(let i=0; i < data.length; i++){
			let h = Math.abs(Math.ceil(itemHeight*(data[i]-origin)));
			if(data[i] && h < config.minHeight)
				h += config.minHeight;

			if(horizontal)
				result.push({x: originPos-(data[i]>=origin?0:h), y: Math.ceil(unit*i)+y+margin/2, height: barWidth, width: h});
			else
				result.push({x: Math.ceil(unit*i)+x+margin/2, y: originPos-(data[i]>=origin?h:0), height: h, width: barWidth});
		}
	}
	return result;
};

export default Bar;