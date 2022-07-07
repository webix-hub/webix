import {create} from "../webix/html";
import {uid} from "../webix/helpers";
import {proto} from "../ui/core";


const HtmlMap = proto({
	$init:function(key){
		this._id = "map_"+uid();
		this._key = key;
		this._map = [];
		this._areas = [];
	},
	addRect: function(id,points,userdata) {
		this._createMapArea(id,"RECT",points,userdata);
	},
	addPoly: function(id,points,userdata) {
		this._createMapArea(id,"POLY",points,userdata);
	},
	_createMapArea:function(id,shape,coords,userdata){
		var extra_data = "";
		if(arguments.length==4) 
			extra_data = "userdata='"+userdata+"'";
		this._map.push("<area "+this._key+"='"+id+"' shape='"+shape+"' coords='"+coords.join()+"' "+extra_data+"></area>");
		this._areas.push({index: userdata, points:coords});

	},
	addSector:function(id, alpha0, alpha1, x, y, r, ky, userdata, dr, height){
		let points = [];

		if(dr)
			points = points.concat(this._getArcPoints(x, y, dr, alpha1, alpha0, ky, -1));
		else{
			points.push(x);
			points.push(Math.floor(y));
		}
		if(!height)
			points = points.concat(this._getArcPoints(x, y, r, alpha0, alpha1, ky));
		else{
			if(alpha0 < 0 && alpha1 >= 0){
				points = points.concat(this._getArcPoints(x, y, r, alpha0, 0, ky));
				points = points.concat(this._getArcPoints(x, y + height, r, 0, alpha1, ky));
				points = points.concat(this._getPointByAngle(x, y, r, alpha1, ky));
			}
			else if(alpha0 < Math.PI && alpha1>=Math.PI){
				points = points.concat(this._getPointByAngle(x, y, r, alpha0, ky));
				points = points.concat(this._getArcPoints(x, y + height, r, alpha0, Math.PI, ky));
				points = points.concat(this._getArcPoints(x, y, r, Math.PI, alpha1, ky));
			}
			else{
				points = points.concat(this._getPointByAngle(x, y, r, alpha0, ky));
				points = points.concat(this._getArcPoints(x, y + height, r, alpha0, alpha1, ky));
				points = points.concat(this._getPointByAngle(x, y, r, alpha1, ky));
			}
		}
		points.push(points[0]);
		points.push(points[1]);
		return this.addPoly(id, points, userdata);
	},
	_getArcPoints: function(x, y, r, a0, a1, ky, dir){
		let points = [];
		dir = dir || 1;

		for(let i = a0; (dir>0 && i < a1) || (dir<0 && i > a1); i += dir*Math.PI/18)
			points = points.concat(this._getPointByAngle(x, y, r, i, ky));
		points = points.concat(this._getPointByAngle(x, y, r, a1, ky));
		return points;
	},
	_getPointByAngle: function(x, y, r, a, ky){
		const point = [];
		point.push(Math.floor(x + r * Math.cos(a)));
		point.push(Math.floor(y + r * Math.sin(a)* ky));
		return point;
	},
	hide:function(obj, data, mode){
		if (obj.querySelectorAll){
			var nodes = obj.querySelectorAll("area[userdata=\""+data+"\"]");
			for (var i = 0; i < nodes.length; i++){
				var nod = nodes[i];
				if (mode){
					if (nod.getAttribute("coords")){
						nod.coordsdis = nod.getAttribute("coords");
						nod.setAttribute("coords", "");
						nod.coords = "";
					}
				} else if (!mode){
					if (nod.coordsdis){
						nod.setAttribute("coords", nod.coordsdis);
						nod.coords = nod.coordsdis;
						nod.coordsdis = "";
					}
				}
				nodes[i].style.display = mode?"none":"";
			}
		}
	},
	render:function(obj){
		const d = create("DIV");
		d.style.cssText="position:absolute; width:100%; height:100%; top:0px; left:0px;";
		obj.appendChild(d);

		d.innerHTML=`
			<map id="${this._id}" name="${this._id}">${this._map.join("\n")}</map>
			<img class="webix_map_img" usemap="#${this._id}">`;

		obj._htmlmap = d; //for clearing routine

		this._map = [];
	}
});

export default HtmlMap;