import color from "../../webix/color";
import {toExcel} from "../../webix/export";
import {create, remove} from "../../webix/html";
import {extend, isUndefined} from "../../webix/helpers";


const Mixin = {
	$exportView:function(options){
		if(this.isBranchOpen) //treetable
			extend(options, { filterHTML: true });

		if(options.export_mode !=="excel" || options.dataOnly || !options.styles)
			return this;
		else{ //excel export with styles
			options.dataOnly = true;
			options.heights = isUndefined(options.heights)?"all":options.heights;

			var data = toExcel(this, options);
			data[0].styles = this._getExportStyles(options);

			delete options.dataOnly;
			return data;
		}
	},
	_getExportStyles:function(options){
		var columns = this.config.columns, styles = [];
		this._style_hash = this._style_hash || {};
		
		if(options.docHeader)
			styles = [{ 0:this._getExportDocStyle(options.docHeader.css)},{ 0:{}}];
		if(options.header!==false)
			styles = this._getExportHStyles(options, "header", styles);
		
		this.data.each(function(obj){
			var row = {};
			for(var i = 0; i<columns.length; i++){
				var cellCss = this.getCss(obj.id, columns[i].id);
				var columnCss = columns[i].node.className;
				var spanCss = "";
				var evenCss = this.getIndexById(obj.id)%2?"even":"odd";//for skins like metro, web, air
				var span = null;
				var node = null;

				if(this._spans_pull && (span = this.getSpan(obj.id, columns[i].id))){
					node  = this.getSpanNode({row:span[0], column:span[1]});
					spanCss = "webix_dtable_span "+(span[5] || "");
				}
				else
					node = this.getItemNode({row:obj.id, column:columns[i].id});

				if(!node){
					node = create("div", {
						"class":cellCss, style:"visibility:hidden"
					});
					var cnode = columns[i].node;
					if(!columns[i].attached){
						cnode = create("div", {
							"class":columnCss, style:"visibility:hidden"
						});
						this._body.appendChild(cnode);
					}
					cnode.appendChild(node);
				}
				row[i] = this._getExportCellStyle(node, [cellCss, columnCss, spanCss, evenCss].join(":"));
			}
			styles[styles.length] = row;
		}, this);

		if(options.footer!==false && this.config.footer)
			styles = this._getExportHStyles(options, "footer", styles);
		if(options.docFooter)
			styles = styles.concat([{ 0:{}},{ 0:this._getExportDocStyle(options.docFooter.css)}]);
		
		return styles;
	},
	_getExportHStyles:function(options, group, styles){
		var columns = this.config.columns, hs = [];//spans

		for(var h = 0; h<columns[0][group].length; h++){
			var hrow = {};
			for(var i = 0; i<columns.length; i++){
				var header = columns[i][group][h];
				//ToDo:make sure it is rendered and attached
				if(header){ //can be null
					var cid = header.colspan ? columns[i+header.colspan-1].id : columns[i].id;
					var node = (group == "header"?this.getHeaderNode(cid, h):this.getFooterNode(cid, h));
					if(node){
						var name = [node.parentNode.className, (header.css||""), "webix_hcell", group];
						hrow[i] = this._getExportCellStyle(node, name.join(":"));

						if(header.colspan || header.rowspan)
							hs.push([h, i, {colspan:header.colspan-1 || 0, rowspan:header.rowspan-1||0}, hrow[i]]);
					}
				}
				else{
					for(var s = 0; s<hs.length; s++){
						var st = hs[s][2], hsc = hs[s][1], hsr = hs[s][0];
						if(hsc+st.colspan >= i && hsr+st.rowspan>=h)
							hrow[i] = hs[s][3];
					}
				}
			}
			styles[styles.length] = hrow;
		} 
		return styles;
	},
	_getExportCellStyle:function(node, name){
		if(this._style_hash[name]) 
			return  this._style_hash[name];
		else{
			var base = this._getRules(node);
			var rules = { font:{},alignment:{},border:{}};

			//font
			rules.font.name = base["font-family"].replace(/,.*$/, ""); // cut off fallback font;
			rules.font.sz = base["font-size"].replace("px", "")*0.75; //px to pt conversion
			rules.font.color = {rgb:color.rgbToHex(base["color"])};
			if(base["font-weight"] !== "normal") rules.font.bold = true;
			if(base["text-decoration-line"] === "underline") rules.font.underline = true;
			if(base["font-style"] === "italic") rules.font.italic = true;
			if(base["text-decoration-line"] === "line-through") rules.font.strike = true;
			
			//alignment
			rules.alignment.horizontal = base["text-align"];
			rules.alignment.vertical = base["height"] == base["line-height"]?"center":"top";
			if(base["white-space"] == "normal") rules.alignment.wrapText = true;
			//rotated header
			if(node.firstChild && node.firstChild.className && node.firstChild.className.indexOf("webix_rotate")!==-1)
				rules.alignment.textRotation = 90;

			//background
			var bg = color.rgbToHex(base["background-color"])||"FFFFFF";
			rules.fill = {fgColor:{rgb:bg}};
			if(base["background-image"].indexOf("gradient")!==-1) //air skins use gradient for header
				rules.fill = {fgColor: {rgb:color.rgbToHex(base["background-image"].substring(base["background-image"].lastIndexOf("(")))}};
			
			//borders
			if(node.parentNode && node.parentNode.nodeName =="TD") //borders for header are set for parent td, so we change base rules here
				base = this._getRules(node.parentNode);
			if(base["border-right-width"]!=="0px")
				rules.border.right = { style:"thin", color:{rgb:color.rgbToHex(base["border-right-color"])||bg}};
			if(base["border-bottom-width"]!=="0px")
				rules.border.bottom = { style:"thin", color:{rgb:color.rgbToHex(base["border-bottom-color"])||bg}};
			if(base["border-left-width"]!=="0px")
				rules.border.left = { style:"thin", color:{rgb:color.rgbToHex(base["border-left-color"])||bg}};
			if(base["border-top-width"]!=="0px")
				rules.border.top = { style:"thin", color:{rgb:color.rgbToHex(base["border-top-color"])||bg}};
			
			this._style_hash[name] = rules;
			return rules;
		}
	},
	_getExportDocStyle:function(css){
		css = extend(css||{}, {visibility:"hidden", "white-space":"nowrap", "text-align":"left"});
		var cssStr = "";
		for(var i in css) cssStr += (i+":"+css[i]+";");
		
		var node = create("div", {style:cssStr});
		this._body.appendChild(node);
		var style = this._getExportCellStyle(node, cssStr);
		remove(node);

		return style;
	},
	_getRules:function(node){
		var style = {};
		if(window.getComputedStyle)
			style = window.getComputedStyle(node);
		else
			style = node.currentStyle;
		return style;
	}
};

export default Mixin;