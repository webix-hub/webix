import {extend, copy} from "../../webix/helpers";

import SVG from "./svg";
import BaseLine from "./line";
import Area from "./area";

const defaults = {
	padding: 6,
	radius: 2,
	eventRadius: 8
};

function Radar(config){
	this.config = extend(copy(defaults),config||{},true);
}

Radar.prototype.draw = function(data, width, height){
	const line = BaseLine.prototype;
	const area = Area.prototype;

	const config = this.config;
	const renderer = SVG;
	const x0 = width/2;
	const y0 = height/2;

	const radius = Math.min(x0,y0) - config.padding;

	let origin = "";
	const points = [];
	const originPoints = [];
	const ratios = this._getRatios(data.length);

	data = data.map(v => isNaN(v) ? 0 : v);
	const max = Math.max(...data);
	let min = Math.min(...data);
	if(min > 0)
		min = 0;

	for (let i = 0; i < data.length; i++) {
		const angle = -Math.PI/2 +ratios[i];

		originPoints.push(this._getPositionByAngle(angle, x0, y0, radius));
		const x1 = originPoints[i].x;
		const y1 = originPoints[i].y;

		origin += renderer.getLine({x:x0, y:y0},{x: x1, y: y1},"webix_sparklines_origin");

		let x, y;
		if(data[i] == min){
			x = x0; y = y0;
		}
		else if(data[i] == max){
			x = x1; y = y1;
		}
		else{
			const ratio = Math.abs(data[i]-min)/Math.abs(max - data[i]);
			x = (x0 + x1 * ratio) / (1 + ratio);
			y = (y0 + y1 * ratio) / (1 + ratio);
		}

		points.push({x, y});
	}

	const styles = config.color ? area._applyColor(renderer, config.color) : null;
	const originPath = renderer.definePath(line._getLinePoints(originPoints), true);
	const path = renderer.definePath(line._getLinePoints(points), true);

	const graph =
		renderer.group(origin + renderer.getPath(originPath, "webix_sparklines_origin")) +
		renderer.group(renderer.getPath(path, "webix_sparklines_area"+(styles?" "+styles.area:""))) +
		renderer.group(renderer.getPath(path, "webix_sparklines_line"+(styles?" "+styles.line:""))) +
		line._drawItems(renderer, points, config.radius, "webix_sparklines_item"+(styles?" "+styles.item:"")) +
		line._drawEventItems(renderer, points, config.eventRadius);

	return  renderer.draw(graph, width, height, "webix_sparklines_radar_chart"+(config.css?" "+config.css:""));
};

Radar.prototype._getPositionByAngle = function(a,x,y,r){
	a *= (-1);
	x = x+Math.cos(a)*r;
	y = y-Math.sin(a)*r;
	return {x,y};
};

Radar.prototype._getRatios = function(count){
	const ratios = [];
	for(let i = 0; i < count; i++){
		ratios[i] = Math.PI*2*(i/count);
	}
	return ratios;
};

export default Radar;