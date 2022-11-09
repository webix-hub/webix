import {$active} from "../../webix/skin";
import {extend, isUndefined} from "../../webix/helpers";
import TreeStore from "../../core/treestore";
import colorConverter from "../../webix/color";
import {getTextSize} from "../../webix/html";

const Pie = {
	$render_pie:function(ctx,data,point0, point1,sIndex,map){
		this._renderPie(ctx,data,point0, point1,1,map, sIndex);
	},
	multilevel_setter:function(value){
		if(value)
			extend(this.data, TreeStore, true);
		return value;
	},
	/**
	 *   renders a pie chart
	 *   @param: ctx - canvas object
	 *   @param: data - object those need to be displayed
	 *   @param: x - the width of the container
	 *   @param: y - the height of the container
	 *   @param: ky - value from 0 to 1 that defines an angle of inclination (0<ky<1 - 3D chart)
	 */
	_renderPie:function(ctx, data, point0, point1, ky, map, sIndex){
		if(!data.length)
			return;

		let coord = this._getPieParameters(point0, point1);
		/*pie radius*/
		let radius = (this._settings.radius?this._settings.radius:coord.radius);
		if(radius<0)
			return;

		//pie center
		let x = (this._settings.x?this._settings.x:coord.x);
		let y = (this._settings.y?this._settings.y:coord.y);
		this._lineWidth = isUndefined(this._settings.borderWidth)?2:this._settings.borderWidth;


		const angleBounds = [-Math.PI/2,Math.PI*3/2];
		const seriesCount = this._series.length;
		const dr = this._innerRadius || 0;
		const len = ( radius - dr)/seriesCount;

		this._levelCount = this._settings.multilevel?this._getLevelCount(data):1;
		this._linePoints = [];
		this._pieHeight = (this._settings.pieHeight || Math.floor(radius/3)) * (1 - this._settings.cant) * 3;
		this._sectorLen =  this._series.length >1 ? len: Math.round((radius - dr)/this._levelCount);

		//adds shadow to the 2D pie
		if(ky==1 && this._settings.shadow && !sIndex)
			this._addShadow(ctx,x,y,radius);
		//changes vertical position of the center according to 3Dpie cant
		y = y/ky;
		// changes Canvas vertical scale
		ctx.scale(1,ky);
		this._defColorsCursor = 0;
		if(dr && ky != 1 && !sIndex)
			this._createFirstLowerSectors(ctx, data, x, y, dr);
		// adds radial gradient to a pie
		if (this._settings.gradient){
			var x1 = (ky!=1?x+radius/3:x);
			var y1 = (ky!=1?y+radius/3:y);
			this._showRadialGradient(ctx, x, y, radius, x1, y1, dr + this._sectorLen * sIndex);
		}
		this._renderLevel(ctx, data, {x,y }, len*(sIndex+1)+dr, point0, map, ky, angleBounds, dr + len*sIndex, 0, sIndex);

		//renders radius lines
		if(this._lineWidth){
			ctx.globalAlpha = 0.8;
			for(let i=0;i< this._linePoints.length;i++){
				const points = this._linePoints[i];
				const p0 = points[0], p1 = points[1];
				this._drawLine(ctx, p0.x, p0.y, p1.x, p1.y, this._settings.lineColor.call(this, data[i]), this._lineWidth);
			}
			ctx.globalAlpha = 1;
		}
		ctx.scale(1,1/ky);

		if(ky !=1 && this._settings.legend)
			this._settings.legend.toggle = false;
	},
	_getLevelCount(data, count){
		count = count||1;
		let result = [];
		data.forEach(item=>
			result.push(item.data?this._getLevelCount(item.data, count+1):count)
		);
		return Math.max.apply(null, result);
	},
	_renderLevel(ctx, data, center, radius, point0, map, ky, angleBounds, dr, levelIndex, sIndex, groupColor){
		let alpha0 = angleBounds[0];
		let values = this._getValues(data);
		let totalValue = this._getTotalValue(values);
		const {x,y} = center;
		//weighed values (the ratio of object value to total value)
		const ratios = this._getRatios(values,totalValue, alpha0, angleBounds[1]);
		const innerRadius = this._innerRadius || 0;
		for (let i = 0; i < data.length; i++){
			const r =  data[i].data ? this._sectorLen * (levelIndex + 1) + innerRadius : radius;
			if (!values[i] && totalValue) continue;
			//drawing sector
			ctx.lineWidth = this._lineWidth;
			ctx.strokeStyle = this._settings.lineColor.call(this, data[i]);
			ctx.beginPath();
			//the angle defines the 2nd edge of the sector
			var alpha1 = ratios[i]-0.0001;
			let p0, p1;
			if (!dr){
				ctx.moveTo(x,y);
				ctx.arc(x,y,r,alpha0,alpha1,false);
				ctx.lineTo(x,y);
			}
			else {
				p0 = this._getPositionByAngle(alpha0,x,y,dr);
				p1 = this._getPositionByAngle(alpha1,x,y,dr);
				ctx.moveTo(p0.x, p0.y);
				ctx.arc(x, y, r, alpha0, alpha1,false);
				ctx.lineTo(p1.x, p1.y);
				ctx.arc(x, y, dr, alpha1, alpha0,true);
				ctx.moveTo(p0.x, p0.y);
			}

			const color = this._getColor(data[i], i, groupColor, levelIndex);
			ctx.fillStyle = color;
			ctx.fill();

			/*text that needs being displayed inside the sector*/
			if (this._settings.pieInnerText){
				const label = this._settings.pieInnerText(data[i], totalValue, levelIndex);
				const r0 = this._series.length > 1 || this._levelCount > 1 ? (r - 0.5 * this._sectorLen) : (0.8 * r);
				this._drawSectorLabel(x, y, r0, alpha0, alpha1, ky, label,true, sIndex, color);
			}
			const isLastLevel = !data[i].data && sIndex == this._series.length-1;
			//label outside the sector
			if (this._settings.label && isLastLevel){
				const text = this._settings.label(data[i], totalValue, sIndex);
				this._drawSectorLabel(x, y,r + this._settings.labelOffset, alpha0, alpha1, ky,  text, false, sIndex);
			}
			const isSectorFront = ky != 1 && isLastLevel?this._applyPieHeight(ctx, x, y, alpha0, alpha1, r, false, data[i], i, color):null;
			// creates map area (needed for events)
			const pHeight = isSectorFront?this._pieHeight*ky:0;
			map.addSector(data[i].id, alpha0, alpha1, x - point0.x, y*ky - point0.y, r, ky, sIndex, dr, pHeight);

			// add child sectors
			if(data[i].data)
				this._renderLevel(ctx, data[i].data, center, radius, point0, map, ky, [alpha0,alpha1], r, levelIndex+1, sIndex, color);
			// borders
			const p = this._getPositionByAngle(alpha0, x, y, r);
			this._linePoints.push([{x: p0?p0.x:x, y:p0?p0.y:y}, p]);
			if(this._lineWidth)
				this._drawArcBorder(ctx, x, y, r, alpha0, alpha1, isLastLevel);
			alpha0 = alpha1;
		}
	},
	_getColor: function(item, i, groupColor, levelIndex){
		let color = this._settings.color.call(this, item, i, levelIndex || 0, groupColor || null);
		if(!color && groupColor)
			color = this._getLighterColor(groupColor, 0.15 * (i + 1));
		return color;
	},
	_getLighterColor: function(c, f){
		const rgb = colorConverter.toRgb(c);
		const hsv = colorConverter.rgbToHsv(rgb[0], rgb[1], rgb[2]);
		hsv[1] -= hsv[1] * (f || 0.5);
		return "#"+colorConverter.rgbToHex("rgb("+colorConverter.hsvToRgb(hsv[0], hsv[1], hsv[2])+")");
	},
	_drawArcBorder: function(ctx, x, y, r, startAngle, endAngle, isLastLevel){
		const w = (ctx.lineWidth = this._lineWidth);
		ctx.strokeStyle = this._settings.borderColor ? this._settings.borderColor.call(this) : "#ffffff";
		ctx.beginPath();
		ctx.arc(x, y, r - (isLastLevel?0: w / 2), startAngle, endAngle,false);
		ctx.stroke();
	},
	/**
	 *   returns list of values
	 *   @param: data array
	 */
	_getValues: function(data){
		const v = [];
		for(let i=0; i<data.length; i++){
			const item = data[i];
			let value = parseFloat(this._settings.value(item));
			if(isNaN(value) && item.data)
				value = this._getChildSum(item.id, item.data);
			item.$value = value;
			v.push(Math.abs(value || 0));
		}

		return v;
	},
	/**
	 * Get total value by child branches
	 * @param id {string} a branch id
	 * @param data {array} child branches
	 */
	_getChildSum: function(id, data){
		let sum = 0;
		for(let i=0; i<data.length; i++) {
			let value = parseFloat(this._settings.value(data[i]));
			if(isNaN(value) && data[i].data)
				sum += this._getChildSum(data[i].id, data[i].data);
			else
				sum += Math.abs(value || 0);
		}
		this.getItem(id).$value = sum;
		return sum;
	},
	/**
	 *   returns total value
	 *   @param: the array of values
	 */
	_getTotalValue: function(values){
		var t=0;
		for(var i = 0; i < values.length;i++)
			t += values[i];
		return  t;
	},
	/**
	 *   gets angles for all values
	 *   @param: the array of values
	 *   @param: total value (optional)
	 */
	_getRatios:function(values,totalValue, angleStart, angleEnd){
		let i, value, ratios = [], prevSum = 0,
			totalAngleValue =  typeof angleStart!="undefined"?(angleEnd - angleStart):Math.PI*2;
		for(i = 0; i < values.length;i++){
			value = totalValue?values[i]:(1/values.length);
			ratios[i] = (angleStart||0)+totalAngleValue*(value+prevSum)/(totalValue||1);
			prevSum += value;
		}
		return ratios;
	},
	/**
	 *   returns calculated pie parameters: center position and radius
	 *   @param: x - the width of a container
	 *   @param: y - the height of a container
	 */
	_getPieParameters:function(point0,point1){
		var width = point1.x-point0.x;
		var height = point1.y-point0.y;
		var x0 = point0.x+width/2;
		var y0 = point0.y+height/2;
		var radius = Math.min(width/2,height/2);
		return {"x":x0,"y":y0,"radius":radius};
	},
	/**
	 *   creates lower part of sector in 3Dpie
	 *   @param: ctx - canvas object
	 *   @param: x0 - the horizontal position of the pie center
	 *   @param: y0 - the vertical position of the pie center
	 *   @param: a0 - the angle that defines the first edge of a sector
	 *   @param: a1 - the angle that defines the second edge of a sector
	 *   @param: R - pie radius
	 *   @param: line (boolean) - if the sector needs a border
	 */
	_createFirstLowerSectors:function(ctx, data, x, y, r){
		let values = this._getValues(data);
		let totalValue = this._getTotalValue(values);
		let a1 = -Math.PI/2;
		const ratios = this._getRatios(values, totalValue, a1, 3*Math.PI/2);
		for(let i = 0; i < data.length;i++){
			let a2 = ratios[i]-0.0001;
			const color = this._getColor(data[i], i);
			this._applyPieHeight(ctx, x, y, a1, a2, r, true, data[i], i, color);
			a1 = a2;
		}
		this._defColorsCursor = 0;
	},
	_applyPieHeight: function(ctx, x, y, a1, a2, r, all, item, i, color){
		// checks if the lower sector needs being displayed
		if(!all &&!((a1<=0 && a2>=0)||(a1>=0 && a2<=Math.PI)||(Math.abs(a1-Math.PI)>0.003&&a1<=Math.PI && a2>=Math.PI)))
			return false;
		ctx.fillStyle = color;
		ctx.strokeStyle = this._settings.lineColor.call(this, item, i);
		this._createLowerSector(ctx, x, y, a1, a2, r,true, all);
		ctx.fillStyle = "#000000";
		ctx.globalAlpha = 0.2;
		this._createLowerSector(ctx, x, y, a1, a2, r, false, all);
		ctx.globalAlpha = 1;
		return true;
	},
	/**
	 *   creates lower part of sector in 3Dpie
	 *   @param: ctx - canvas object
	 *   @param: x - the horizontal position of the pie center
	 *   @param: y - the vertical position of the pie center
	 *   @param: a0 - the angle that defines the first edge of a sector
	 *   @param: a1 - the angle that defines the second edge of a sector
	 *   @param: r - pie radius
	 *   @param: line (boolean) - if the sector needs a border
	 */
	_createLowerSector: function(ctx, x, y, a1, a2, r, line, all){
		ctx.lineWidth = this._lineWidth;
		if(!all){
			if(a1<=0 && a2>=0){
				a1 = 0;
				line = false;
				this._drawSectorLine(ctx, x, y, r, a1, a2);
			}
			if(a1<=Math.PI && a2>=Math.PI){
				a2 = Math.PI;
				line = false;
				this._drawSectorLine(ctx, x, y, r, a1, a2);
			}
		}

		// the height of 3D pie
		ctx.beginPath();
		ctx.arc(x, y, r, a1, a2,false);
		ctx.lineTo(x + r*Math.cos(a2),y + r*Math.sin(a2) + this._pieHeight);
		ctx.arc(x,y + this._pieHeight, r, a2, a1,true);
		ctx.lineTo(x + r*Math.cos(a1),y + r*Math.sin(a1));
		ctx.fill();
		if(line && this._lineWidth)
			ctx.stroke();
		return true;
	},
	/**
	 *   draws a sector arc
	 */
	_drawSectorLine:function(ctx,x0,y0,R,a1,a2){
		ctx.beginPath();
		ctx.arc(x0,y0,R,a1,a2,false);
		ctx.stroke();
	},
	/**
	 *   adds a shadow to pie
	 *   @param: ctx - canvas object
	 *   @param: x - the horizontal position of the pie center
	 *   @param: y - the vertical position of the pie center
	 *   @param: r - pie radius
	 */
	_addShadow:function(ctx, x, y, r){
		ctx.globalAlpha = 0.5;
		var shadows = ["#c4c4c4","#c6c6c6","#cacaca","#dcdcdc","#dddddd","#e0e0e0","#eeeeee","#f5f5f5","#f8f8f8"];
		for(var i = shadows.length-1;i>-1;i--){
			ctx.beginPath();
			ctx.fillStyle = shadows[i];
			ctx.arc(x+1,y+1,r+i,0,Math.PI*2,true);
			ctx.arc(x+1,y+1, r-2,Math.PI*2,0, false);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	},
	/**
	 *   returns a gray gradient
	 *   @param: gradient - gradient object
	 */
	_getGrayGradient:function(gradient){
		gradient.addColorStop(0.0,"#ffffff");
		gradient.addColorStop(0.7,"#7a7a7a");
		gradient.addColorStop(1.0,"#000000");
		return gradient;
	},
	/**
	 *   adds gray radial gradient
	 *   @param: ctx - canvas object
	 *   @param: x - the horizontal position of the pie center
	 *   @param: y - the vertical position of the pie center
	 *   @param: radius - pie radius
	 *   @param: x0 - the horizontal position of a gradient center
	 *   @param: y0 - the vertical position of a gradient center
	 *   @param: dr - the inner radius (for donut or series)
	 */
	_showRadialGradient:function(ctx, x, y, radius, x0, y0, dr){
		//ctx.globalAlpha = 0.3;
		ctx.beginPath();
		var gradient;
		if(typeof this._settings.gradient!= "function"){
			gradient = ctx.createRadialGradient(x0,y0,radius/4,x,y,radius);
			gradient = this._getGrayGradient(gradient);
		}
		else gradient = this._settings.gradient(gradient);
		ctx.fillStyle = gradient;
		ctx.arc(x,y,radius,0,Math.PI*2,true);
		if(dr)
			ctx.arc(x,y,dr, Math.PI*2, 0, false);
		ctx.fill();
		ctx.globalAlpha = 0.75;
	},
	/**
	 *   returns the calculates pie parameters: center position and radius
	 *   @param: ctx - canvas object
	 *   @param: x0 - the horizontal position of the pie center
	 *   @param: y0 - the vertical position of the pie center
	 *   @param: r - pie radius
	 *   @param: alpha1 - the angle that defines the 1st edge of a sector
	 *   @param: alpha2 - the angle that defines the 2nd edge of a sector
	 *   @param: ky - the value that defines an angle of inclination
	 *   @param: text - label text
	 *   @param: in_width {boolean} - if label needs being displayed inside a pie
	 *   @param: sIndex {number} - series index
	 */
	_drawSectorLabel:function(x0, y0, r, alpha1, alpha2, ky, text, in_width, sIndex, bgColor){
		const css = !in_width || this._getFontCss(bgColor);
		var t = this.canvases[sIndex].renderText(0, 0, text, css, 1);
		if (!t) return;
		let labelWidth = getTextSize(text, css).width;

		t.style.width = labelWidth + "px";	//adjust text label to fit all text
		if (labelWidth>x0) labelWidth = x0;	//the text can't be greater than half of view

		//calculate expected correction based on default font metrics
		var width = (alpha2 - alpha1 < 0.2?4:8);
		if (in_width) width = labelWidth/1.8;
		var alpha = alpha1 + (alpha2 - alpha1)/2;

		//position and its correction
		r = r - (width - 8)/2;
		var corr_x = - width;
		var corr_y = -8;
		var align = "right";

		//for items in left upper and lower sector
		if(alpha >= Math.PI/2 && alpha < Math.PI || alpha <= 3*Math.PI/2 && alpha >= Math.PI){
			corr_x = -labelWidth - corr_x + 1; // correction for label width
			align = "left";
		}

		// calculate position of text basically get point at center of pie sector
		var offset = 0;

		if(!in_width&&ky<1&&(alpha>0&&alpha<Math.PI))
			offset = (this._settings.height||Math.floor(r/4))/ky;

		var y = (y0+Math.floor((r + offset)*Math.sin(alpha)))*ky + corr_y;
		var x = x0+Math.floor((r + width/2)*Math.cos(alpha)) + corr_x;


		// if pie sector starts in left of right part pie,
		// related text	must be placed to the left of to the right of pie as well
		const left_end = (alpha2 < Math.PI/2+0.01);
		const left_start = (alpha1 < Math.PI/2);
		if (left_start && left_end){
			x = Math.max(x,x0+3);	//right part of pie
		}
		else if (!left_start && !left_end)
			x = Math.min(x,x0-labelWidth);	//left part of pie
		else if (!in_width&&(alpha>=Math.PI/2 && alpha<Math.PI || alpha<=3*Math.PI/2 && alpha>=Math.PI)){
			x += labelWidth/3;
		}

		//we need to set position of text manually, based on above calculations
		t.style.top  = y+"px";
		t.style.left = x+"px";
		t.style.width = labelWidth+"px";
		t.style.textAlign = align;
		t.style.whiteSpace = "nowrap";
	},
	_getFontCss: function(bgColor){
		const rgb = colorConverter.toRgb(bgColor);
		const brightness = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
		// webix_inner_text_dark/light adds 4px to the width (padding)
		return "webix_chart_pie_label webix_inner_text_" + (brightness > 180 ? "dark" : "light");
	},
	$render_pie3D:function(ctx,data,point0, point1,sIndex,map){
		this._renderPie(ctx, data, point0, point1, this._settings.cant, map, sIndex);
	},
	$render_donut:function(ctx, data, point0, point1, sIndex, map){
		this._renderDonut(ctx, data, point0, point1, map, sIndex);
	},
	$render_donut3D:function(ctx,data,point0, point1,sIndex,map){
		this._renderDonut(ctx, data, point0, point1, map, sIndex, this._settings.cant);
	},
	_renderDonut: function(ctx, data, point0, point1, map, sIndex, ky){
		if(!data.length)
			return;
		const config = this._settings;
		const coord = this._getPieParameters(point0,point1);
		const pieRadius = (config.radius?config.radius:coord.radius);
		if (pieRadius <= 0)
			return;
		const x0 = (config.x?config.x:coord.x);
		const y0 = (config.y?config.y:coord.y);
		let innerRadius = config.innerRadius;
		if(!innerRadius || innerRadius > pieRadius)
			innerRadius = pieRadius/3;
		this._innerRadius = innerRadius;
		this._renderPie(ctx, data, point0, point1, ky || 1, map, sIndex);

		if(this._settings.donutInnerText){
			const values = this._getValues(data);
			const totalValue = this._getTotalValue(values);

			const padding = $active.dataPadding;
			const width = innerRadius*2 - padding*2;

			const centerText = this.canvases[0].renderText(
				x0-innerRadius+padding,
				y0-innerRadius+padding,
				`<div class="webix_donut_center_text">${this._settings.donutInnerText(data, totalValue)}</div>`,
				"webix_donut_center_text_box",
				width
			);

			centerText.style.height = centerText.style.lineHeight = width+"px";
		}
	}
};

export default Pie;
