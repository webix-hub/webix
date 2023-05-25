const DataMarks = {
	addCss:function(id, css, silent){
		if (!this.addRowCss && !silent){
			if (!this.hasCss(id, css)){
				const node = this.getItemNode(id);
				if (node){
					node.className += " "+css;
					silent = true;
				}
			}
		}
		return this.data.addMark(id, css, 1, 1, silent);
	},
	removeCss:function(id, css, silent){
		if (!this.addRowCss && !silent){
			if (this.hasCss(id, css)){
				const node = this.getItemNode(id);
				if (node){
					const re = new RegExp("(\\s|^)"+css+"(\\s|$)");
					node.className = node.className.replace(re, (v,b,a) => b && a ? " " : "");
					silent = true;
				}
			}
		}
		return this.data.removeMark(id, css, 1, silent);
	},
	hasCss:function(id, mark){
		return this.data.getMark(id, mark);
	},
	clearCss:function(css, silent){
		return this.data.clearMark(css, 1, silent);
	}
};

export default DataMarks;