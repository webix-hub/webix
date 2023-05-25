import {offset, pos as getPos, preventEvent, remove, removeCss, create, addCss} from "../../webix/html";
import env from "../../webix/env";
import {extend, delay} from "../../webix/helpers";
import {$$} from "../../ui/core";
import {_event, event, eventRemove} from "../../webix/htmlevents";
import AutoScroll from "../../core/autoscroll";


// #include core/autoscroll.js
const Mixin = {
	blockselect_setter:function(value){
		if (value && this._block_sel_flag){
			_event(this._viewobj, env.mouse.down, e => this._bs_down(e, "mouse"));
			if (env.touch)
				this.attachEvent("onLongTouch", e => this._bs_down(e, "touch"));

			this._block_sel_flag = this._bs_ready = this._bs_progress = false;
			this.attachEvent("onAfterScroll", this._update_block_selection);
			// auto scroll
			extend(this, AutoScroll, true);
			this.attachEvent("onBeforeAutoScroll",function(){
				return this._bs_progress;
			});
		}
		return value;
	},
	_block_sel_flag:true,
	_childOf:function(e, tag){
		let src = e.target;
		while (src){
			if (src.getAttribute && src.getAttribute(/*@attr*/"webixignore")) return false;
			if (src == tag)
				return true;
			src = src.parentNode;
		}
		return false;
	},
	_bs_down:function(e, pointer){
		// do not listen to mousedown of subview on master
		if (this._settings.subview && this != $$(e.target)) return;
		if (this._childOf(e, this._body)){
			//disable block selection when we have an active editor
			if (e.target && e.target.tagName == "INPUT" || this._rs_process) return;

			this._bs_position = offset(this._body);
			const pos = getPos(e);
			this._bs_ready = [pos.x - this._bs_position.x, pos.y - this._bs_position.y];

			this._bs_handler_init(e.target, pointer);
		}
	},
	_bs_handler_init:function(target, pointer){
		if (pointer === "touch") {
			this._bs_mm_handler = event(target, env[pointer].move, e => this._bs_move(e, pointer), { passive:false });
			this._bs_mu_handler = event(target, env[pointer].up, e => this._bs_up(e));
		} else {
			this._bs_mm_handler = event(this._viewobj, env[pointer].move, e => this._bs_move(e, pointer));
			this._bs_mu_handler = event(document, env[pointer].up, e => this._bs_up(e));
		}
	},
	_bs_up:function(e){
		if (this._block_panel){
			this._bs_select("select", true, e);
			this._block_panel = remove(this._block_panel);
		}

		this._bs_mm_handler = eventRemove(this._bs_mm_handler);
		this._bs_mu_handler = eventRemove(this._bs_mu_handler);

		removeCss(document.body,"webix_noselect");
		this._bs_ready = this._bs_progress = false;
		if (this._auto_scroll_delay)
			this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
	},
	_update_block_selection: function(){
		if (this._bs_progress)
			delay(this._bs_select, this, [false, false]);
	},
	_bs_select:function(mode, theend, e){
		if(!this._bs_ready[2])
			this._bs_ready[2] = this._locate_cell_xy(this._bs_ready[0],this._bs_ready[1]);
		const cell = this._bs_ready[2];
		const start = {row: cell.row, column: cell.column},
			end = this._locate_cell_xy(this._bs_progress[0],this._bs_progress[1],true);

		if (!this._bs_do_select && !this.callEvent("onBeforeBlockSelect", [start, end, theend, e]))
			return;

		if ((!this._bs_do_select || this._bs_do_select(start, end, theend, e) !== false) && (start.row && end.row)){
			if (mode === "select"){
				this._clear_selection();
				this._selectRange(start, end);
			} else {
				let startx, starty, endx, endy;

				if (mode === "box"){
					startx = Math.min(this._bs_ready[0],this._bs_progress[0]);
					endx = Math.max(this._bs_ready[0],this._bs_progress[0]);

					starty = Math.min(this._bs_ready[1],this._bs_progress[1]);
					endy = Math.max(this._bs_ready[1],this._bs_progress[1]);
				} else {
					const i0 = this.getIndexById(start.row),
						i1 = this.getIndexById(end.row),
						j0 = this.getColumnIndex(start.column),
						j1 = this.getColumnIndex(end.column);
					const sri = Math.min(i0, i1),
						eri = Math.max(i0, i1),
						sci = Math.min(j0, j1),
						eci = Math.max(j0, j1);
					const startPos = this._bs_cell_position(sri, sci, false);
					const endPos = this._bs_cell_position(eri, eci, true);

					if(this._settings.prerender){
						startPos.top -= this._scrollTop;
						endPos.top -= this._scrollTop;
					}
					if (this._settings.topSplit)
						startPos.top += this._getTopSplitOffset(start);

					startx = startPos.left;
					endx = endPos.left;
					starty = startPos.top;
					endy = endPos.top;

					if(e){
						if (this._auto_scroll_delay)
							this._auto_scroll_delay = window.clearTimeout(this._auto_scroll_delay);
						if (!this._touch_scroll || this._settings.prerender)
							this._auto_scroll_delay = delay(this._auto_scroll, this, [getPos(e)], 250);
					}

				}

				const style = this._block_panel.style;
				style.left = startx+"px";
				style.top = starty+"px";
				style.width = (endx-startx)+"px";
				style.height = (endy-starty)+"px";
			}
		}

		if (theend)
			this.callEvent("onAfterBlockSelect", [start, end]);
	},
	_bs_cell_position: function(iRow, iCol, isEnd){
		const pos = this._cellPosition(this.getIdByIndex(iRow), this.columnId(iCol));
		const scroll = this.getScrollState();
		let left = pos.left;
		if (this.config.rightSplit && iCol > (this._columns.length - 1 - this.config.rightSplit)){
			left += this._left_width + this._center_width;
		} else if (this.config.leftSplit){
			if (iCol + 1 > this.config.leftSplit){
				if(left < scroll.x){
					pos.width -= scroll.x - left;
					left = this._left_width;
				}
				else
					left += this._left_width - scroll.x;
			}
		} else left -= scroll.x;

		if(isEnd){
			left += pos.width;
			pos.top += pos.height;
			if(this.config.rightSplit && iCol < this._columns.length - this.config.rightSplit)
				left = Math.min(left, this._left_width + this._center_width);
		}
		return {left, top: pos.top};
	},
	_bs_start:function(handleStart){
		this._block_panel = create("div", {"class":"webix_block_selection"},"");
		this._body.appendChild(this._block_panel);
		this.$handleStart = !!handleStart;
	},
	_bs_move:function(e, pointer){
		if (this._rs_progress) return;
		if (this._bs_ready !== false){
			if(!this._bs_progress) addCss(document.body,"webix_noselect");

			const pos = getPos(e);
			const progress = [pos.x - this._bs_position.x, pos.y - this._bs_position.y];

			//prevent unnecessary block selection while dbl-clicking
			if (Math.abs(this._bs_ready[0] - progress[0]) < 5 && Math.abs(this._bs_ready[1] - progress[1]) < 5)
				return;

			if (this._bs_progress === false)
				this._bs_start();

			this._bs_progress = progress;
			this._bs_select(this.config.blockselect, false, e);

			if (pointer === "touch") preventEvent(e);
		}
	},
	_locate_cell_xy:function(x,y, isEndPoint){
		let inTopSplit = false,
			row = null,
			column = null;


		if (this._right_width && x>this._left_width + this._center_width)
			x+= this._x_scroll.getSize()-this._center_width-this._left_width-this._right_width; 
		else if (!this._left_width || x>this._left_width)
			x+= this._x_scroll.getScroll();

		if(this._settings.topSplit && this._render_scroll_top > this._settings.topSplit) {
			const splitPos = this._cellPosition(this.getIdByIndex(this._settings.topSplit-1), this.columnId(0));
			if(splitPos.top + splitPos.height > y){
				inTopSplit = true;
			}
		}
		if(!inTopSplit)
			y += this.getScrollState().y;

		if (x<0) x=0;
		if (y<0) y=0;

		const cols = this._settings.columns;
		const rows = this.data.order;

		const handle = isEndPoint && this.$handleStart;
		const dir = handle?this._getHandleMoveDirection(x,y):null;

		let summ = 0;
		if(!handle || dir =="x")
			for (let i=0; i<cols.length; i++){
				summ+=cols[i].width;
				if (summ>=x){
					column = cols[i].id;
					break;
				}
			}
		
		if (!column)
			column = handle?this._bs_ready[5].column:cols[cols.length-1].id;

		summ = 0;
		if(!handle || dir=="y"){
			const start = this.data.$min || 0;
			if (this._settings.fixedRowHeight) {
				row = rows[start + Math.floor(y / this._settings.rowHeight)];
			} else for (let i = start; i < rows.length; i++) {
				summ += this._getHeightByIndex(i);
				if (summ >= y) {
					row = rows[i];
					break;
				}
			}
		}
		if (!row)
			row = handle?this._bs_ready[5].row:rows[rows.length-1];
		return {row, column};
	},
	_getTopSplitOffset: function(cell, area){
		let y = 0,
			startIndex = this.getIndexById(cell.row);

		if(startIndex >= this._settings.topSplit){
			const startPos = this._cellPosition(this.getIdByIndex(startIndex), cell.column);
			const splitPos = this._cellPosition(this.getIdByIndex(this._settings.topSplit-1), cell.column);
			if(splitPos.top + splitPos.height > startPos.top)
				y = splitPos.top + splitPos.height - ((startPos.top > 0 || !area) ? startPos.top : 0);
		}

		return y;
	},
	_getHandleMoveDirection(x, y){
		let dir;
		const p0 = [this._bs_ready[0], this._bs_ready[1]];
		const p1 = [this._bs_ready[3], this._bs_ready[4]];
		const xMax = p1[0]+ this._columns_pull[this._bs_ready[5].column].width;
		const yMax = p1[1]+ this._getRowHeight(this._bs_ready[5].row);
		if(x <= xMax && x >= p0[0]){
			if(y <= yMax && y >= p0[1])
				dir = x < p1[0]?"x":"y";
			else
				dir = "y";
		}
		else{
			const x0 = x > p1[0]?xMax:p0[0];
			const y0 = y > p1[1]?yMax:p0[1];
			dir = Math.abs(x - x0) > Math.abs(y - y0)?"x":"y";
			if(dir == "y" && x < p0[0] && y <= yMax && y >= p0[1])
				dir = null;
		}
		return dir;
	}
};

export default Mixin;