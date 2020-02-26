import color from "../../webix/color";
import {toExcel, toPDF} from "../../webix/export";
import {create, remove} from "../../webix/html";
import {extend, isUndefined} from "../../webix/helpers";


const Mixin = {
	$exportView:function(options){
		if(this.isBranchOpen) //treetable
			extend(options, { filterHTML: true });

		const mode = options.export_mode;

		if((mode != "pdf" && mode != "excel") || options.dataOnly || !options.styles)
			return this;
		else{ //excel export with styles
			options.dataOnly = true;
			options.heights = isUndefined(options.heights)?"all":options.heights;

			const data = mode == "pdf" ? toPDF(this, options) : toExcel(this, options);
			data[0].styles = this._getExportStyles(options);

			delete options.dataOnly;
			return data;
		}
	},
	_getExportStyles:function(options){
		const type = options.export_mode;

		var columns = this.config.columns, styles = [];
		this._style_hash = this._style_hash || {};

		if(options.docHeader)
			styles = [{ 0:this._getExportDocStyle(options.docHeader.css)},{ 0:{}}];
		if(options.header!==false)
			styles = this._getExportHStyles(options, "header", styles, type);

		this.data.each(function(obj){
			var row = {};
			for(var i = 0; i<columns.length; i++){
				var cellCss = this.getCss(obj.id, columns[i].id);
				var columnCss = columns[i].node.className;
				var spanCss = "";
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
				row[i] = this._getExportCellStyle(node, [cellCss, columnCss, spanCss].join(":"), type);
			}
			styles[styles.length] = row;
		}, this);

		if(options.footer!==false && this.config.footer)
			styles = this._getExportHStyles(options, "footer", styles, type);
		if(options.docFooter)
			styles = styles.concat([{ 0:{}},{ 0:this._getExportDocStyle(options.docFooter.css)}]);

		return styles;
	},
	_getExportHStyles:function(options, group, styles, type){
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
						hrow[i] = this._getExportCellStyle(node, name.join(":"), type);

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
	_getBorderColor(styles, defaultColor, type){
		return styles[`border-${type}-width`] == "0px" ? null : color.rgbToHex(styles[`border-${type}-color`]) || defaultColor;
	},
	_getExportCellStyle:function(node, name, type){
		if(this._style_hash[name]) 
			return  this._style_hash[name];
		else{
			let parentStyle;
			if(node.parentNode && node.parentNode.nodeName =="TD") //borders for header are set for parent td
				parentStyle = this._getRules(node.parentNode);

			const cellStyle = this._getRules(node);

			const bg = color.rgbToHex(cellStyle["background-color"])||"FFFFFF";
			const common = {
				backgroundColor: bg,
				fontSize: cellStyle["font-size"].replace("px", "")*0.75, //px to pt conversion
				color: color.rgbToHex(cellStyle["color"]),
				textAlign: cellStyle["text-align"],
				borderRightColor: this._getBorderColor(parentStyle||cellStyle, bg, "right"),
				borderLeftColor: this._getBorderColor(parentStyle||cellStyle, bg, "left"),
				borderBottomColor: this._getBorderColor(parentStyle||cellStyle, bg, "bottom"),
				borderTopColor: this._getBorderColor(parentStyle||cellStyle, bg, "top")
			};

			const rules = type == "pdf" ? common : this._getExcelCellRules(cellStyle, node, common);

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
	_getExcelCellRules(cellStyle, node, common){
		const rules = { font:{},alignment:{},border:{}};

		//font
		rules.font.name = cellStyle["font-family"].replace(/,.*$/, ""); // cut off fallback font;
		rules.font.sz = common.fontSize;
		rules.font.color = {rgb: common.color};

		if(cellStyle["font-weight"] !== "normal" && cellStyle["font-weight"] != 400) rules.font.bold = true;
		if(cellStyle["text-decoration-line"] === "underline") rules.font.underline = true;
		if(cellStyle["font-style"] === "italic") rules.font.italic = true;
		if(cellStyle["text-decoration-line"] === "line-through") rules.font.strike = true;

		//alignment
		rules.alignment.horizontal = common.textAlign;
		rules.alignment.vertical = cellStyle["height"] == cellStyle["line-height"]?"center":"top";
		if(cellStyle["white-space"] == "normal") rules.alignment.wrapText = true;
		//rotated header
		if(node.firstChild && node.firstChild.className && node.firstChild.className.indexOf("webix_rotate")!==-1)
			rules.alignment.textRotation = 90;

		//background
		rules.fill = {fgColor:{rgb:common.backgroundColor}};

		//borders
		if(common.borderRightColor)
			rules.border.right = { style:"thin", color:{rgb:common.borderRightColor}};
		if(common.borderBottomColor)
			rules.border.bottom = { style:"thin", color:{rgb:common.borderBottomColor}};
		if(common.borderLeftColor)
			rules.border.left = { style:"thin", color:{rgb:common.borderLeftColor}};
		if(common.borderTopColor)
			rules.border.top = { style:"thin", color:{rgb:common.borderTopColor}};

		return rules;
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