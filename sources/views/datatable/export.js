import color from "../../webix/color";
import {toExcel, toPDF} from "../../webix/export";
import {create, remove} from "../../webix/html";
import {extend, isUndefined, copy} from "../../webix/helpers";

const Mixin = {
	$exportView: function(options){
		if (this.isBranchOpen) //treetable
			extend(options, { filterHTML: true });

		const mode = options.export_mode;

		if ((mode != "pdf" && mode != "excel") || options.dataOnly || !options.styles)
			return this;
		else { //excel export with styles
			options.dataOnly = true;
			options.heights = isUndefined(options.heights) ? "all": options.heights;

			const data = mode == "pdf" ? toPDF(this, options) : toExcel(this, options);
			data[0].styles = this._getExportStyles(options);

			delete options.dataOnly;
			return data;
		}
	},
	_getExportStyles: function(options){
		const type = options.export_mode;
		const columns = this.config.columns;
		let styles = [];
		
		if (!this._style_hash)
			this._style_hash = {};

		if (!this._style_hash[type])
			this._style_hash[type] = {};

		if (options.docHeader && type == "excel")
			styles = [{ 0:this._getExportDocStyle(options.docHeader.css, type)}, { 0:{}}];
		if (options.header!==false)
			styles = this._getExportHStyles(options, "header", styles, type);

		this.data.each(function(obj){
			if(options.filter && !options.filter(obj))
				return false;
			const row = {};
			for (let i = 0; i < columns.length; i++){
				const cellCss = this.getCss(obj.id, columns[i].id);
				const columnCss = columns[i].node.className;
				let spanCss = "";
				let span = null;
				let node = null;

				if (this._spans_pull && (span = this.getSpan(obj.id, columns[i].id))){
					node  = this.getSpanNode({row:span[0], column:span[1]});
					spanCss = "webix_dtable_span "+(span[5] || "");
				}
				else
					node = this.getItemNode({row:obj.id, column:columns[i].id});

				if (!node){
					node = create("div", {
						"class":cellCss, style:"visibility:hidden"
					});
					let cnode = columns[i].node;
					if (!columns[i].attached){
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

		if (options.footer !== false && this.config.footer)
			styles = this._getExportHStyles(options, "footer", styles, type);
		if (options.docFooter && type == "excel")
			styles = styles.concat([{0:{}}, { 0:this._getExportDocStyle(options.docFooter.css, type)}]);

		return styles;
	},
	_getExportHStyles: function(options, group, styles, type){
		const columns = this.config.columns;
		const hs = [];//spans

		for (let h = 0; h < columns[0][group].length; h++){
			const hrow = {};
			for (let i = 0; i < columns.length; i++){
				const header = columns[i][group][h];
				//ToDo:make sure it is rendered and attached
				if (header){ //can be null
					const cid = header.colspan ? columns[i+header.colspan-1].id : columns[i].id;
					const node = (group == "header" ? this.getHeaderNode(cid, h) : this.getFooterNode(cid, h));
					if (node){
						const name = [node.className, (header.css||""), group];
						hrow[i] = this._getExportCellStyle(node, name.join(":"), type);

						if (header.colspan || header.rowspan){
							//add border only to the last cell of the rowspan/colspan
							const styles = copy(hrow[i]);

							if(header.rowspan > 1)
								this._clearBorder(type, "bottom", hrow[i]);
							if(header.colspan > 1)
								this._clearBorder(type, "right", hrow[i]);

							hs.push([h, i, {colspan:header.colspan-1 || 0, rowspan:header.rowspan-1||0}, styles]);
						}
					}
				}
				else {
					for (let s = 0; s < hs.length; s++){
						const st = hs[s][2], hsc = hs[s][1], hsr = hs[s][0];
						if (hsc + st.colspan >= i && hsr + st.rowspan >= h){
							//add border only to the last cell of the rowspan/colspan
							const styles = copy(hs[s][3]);
							if(hsr + st.rowspan != h)
								this._clearBorder(type, "bottom", styles);
							if(hsc + st.colspan != i)
								this._clearBorder(type, "right", styles);
							hrow[i] = styles;
							break;
						}
					}
				}
			}
			styles[styles.length] = hrow;
		}
		return styles;
	},
	_clearBorder(type, pos, obj){
		if(type == "pdf")
			obj["border" + pos[0].toUpperCase() + pos.substring(1) + "Color"] = obj.backgroundColor;
		else
			delete obj.border[pos];
	},
	_getBorderColor: function(styles, defaultColor, type){
		return styles[`border-${type}-width`] == "0px" ? null : color.rgbToHex(styles[`border-${type}-color`]) || defaultColor;
	},
	_getExportCellStyle: function(node, name, type){
		if (this._style_hash[type][name]) 
			return this._style_hash[type][name];
		else {
			const cellStyle = this._getRules(node);

			const bg = color.rgbToHex(cellStyle["background-color"]) || "FFFFFF";
			const common = {
				backgroundColor: bg,
				fontSize: cellStyle["font-size"].replace("px", "")*0.75, //px to pt conversion
				bold: cellStyle["font-weight"] != "normal" && cellStyle["font-weight"] != 400,
				italic: cellStyle["font-style"] == "italic",
				underline: cellStyle["text-decoration-line"] == "line-through",
				strikethrough: cellStyle["text-decoration-line"] == "underline",
				color: color.rgbToHex(cellStyle["color"]),
				textAlign: cellStyle["text-align"],
				whiteSpace: cellStyle["white-space"] == "normal",
				borderRightColor: this._getBorderColor(cellStyle, bg, "right"),
				borderLeftColor: this._getBorderColor(cellStyle, bg, "left"),
				borderBottomColor: this._getBorderColor(cellStyle, bg, "bottom"),
				borderTopColor: this._getBorderColor(cellStyle, bg, "top"),
			};

			const rules = type == "pdf" ? common : this._getExcelCellRules(cellStyle, node, common);

			this._style_hash[type][name] = rules;
			return rules;
		}
	},
	_getExportDocStyle: function(css, type){
		css = extend(css||{}, {visibility:"hidden", "white-space":"nowrap", "text-align":"left"});
		let cssStr = "";
		for (let i in css) cssStr += (i+":"+css[i]+";");

		const node = create("div", {style:cssStr});
		this._body.appendChild(node);
		const style = this._getExportCellStyle(node, cssStr, type);
		remove(node);

		return style;
	},
	_getExcelCellRules: function(cellStyle, node, common){
		const textRotation = node.firstChild && node.firstChild.className && node.firstChild.className.indexOf("webix_rotate") !== -1;

		return {
			font: {
				name: cellStyle["font-family"].replace(/,.*$/, ""), // cut off fallback font;
				sz: common.fontSize,
				color: {rgb: common.color},
				bold: common.bold,
				underline: common.underline,
				italic: common.italic,
				strike: common.strikethrough
			},
			alignment: {
				horizontal: common.textAlign,
				vertical: cellStyle["height"] == cellStyle["line-height"] ? "center" : "top",
				wrapText: common.wrapText,
				textRotation: textRotation ? 90 : null
			},
			fill: {
				fgColor:{rgb:common.backgroundColor}
			},
			border: {
				right: common.borderRightColor ? {style:"thin", color:{rgb:common.borderRightColor}} : null,
				bottom: common.borderBottomColor ? {style:"thin", color:{rgb:common.borderBottomColor}} : null,
				left: common.borderLeftColor ? {style:"thin", color:{rgb:common.borderLeftColor}} : null,
				top: common.borderTopColor ? {style:"thin", color:{rgb:common.borderTopColor}} : null
			}
		};
	},
	_getRules: function(node){
		let style = {};
		if (window.getComputedStyle)
			style = window.getComputedStyle(node);
		else
			style = node.currentStyle;
		return style;
	}
};

export default Mixin;