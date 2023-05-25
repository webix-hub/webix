const Mixin = {
	clearValidation:function(){
		for(let i in this.data._marks)
			this._clear_invalid_css(i);
		this.data.clearMark("webix_invalid", true);
	},
	_mark_invalid:function(id, details){
		this._clear_invalid_css(id);
		for (let key in details)
			this.addCellCss(id, key, "webix_invalid_cell");

		this.addCss(id, "webix_invalid");
	},
	_clear_invalid:function(id){
		this._clear_invalid_css(id);
		this.removeCss(id, "webix_invalid");
	},
	_clear_invalid_css:function(id){
		const mark = this.data.getMark(id, "$cellCss");
		if (mark){
			for (let key in mark)
				mark[key] = mark[key].replace(/(\s|^)webix_invalid_cell(\s|$)/, (v,b,a) => b && a ? " " : "");
		}
	},

	addRowCss:function(id, css, silent){
		this.addCss(id, css, silent);
	},
	removeRowCss:function(id, css, silent){
		this.removeCss(id, css, silent);
	},
	addCellCss:function(id, name, css, silent){
		let mark = this.data.getMark(id, "$cellCss");
		let newmark = mark || {};

		const re = new RegExp("\\b"+css+"\\b");
		let style = newmark[name]||"",
			refresh;
		if(!style || !re.test(style)){
			newmark[name] = !style ? css : (style.trim() + " " + css);
			if (!mark) this.data.addMark(id, "$cellCss", false, newmark, true);
			refresh = true;
		}

		const span = this._getCellSpan(id, name);
		if(span && (!span[3] || !re.test(span[3]))){
			span[3] = !span[3] ? css : (span[3].trim() + " "+css);
			refresh = true;
		}

		if (!silent && refresh)
			this.refresh(id);
	},
	removeCellCss:function(id, name, css, silent){
		const mark = this.data.getMark(id, "$cellCss");
		if (mark){
			const style = mark[name] || "";
			const re = new RegExp("(\\s|^)"+css+"(\\s|$)");
			if (style)
				mark[name] = style.replace(re, (v,b,a) => b && a ? " " : "");

			const span = this._getCellSpan(id, name);
			if(span && span[3])
				span[3] = span[3].replace(re, (v,b,a) => b && a ? " " : "");

			if (!silent)
				this.refresh(id);
		}
	},
	_getCellSpan: function(id, name){
		return this.config.spans && this._spans_pull[id] && this._spans_pull[id][name];
	}
};

export default Mixin;