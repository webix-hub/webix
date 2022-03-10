import {create, insertBefore, remove} from "../webix/html";
import env from "../webix/env";
import {isUndefined, extend, delay} from "../webix/helpers";


const ProgressBar = {
	$init:function(){
		if (isUndefined(this._progress) && this.attachEvent){
			this.attachEvent("onBeforeLoad", () => this.showProgress());
			this.attachEvent("onAfterLoad", () => this.hideProgress());
			this._progress = null;
		}
	},
	showProgress:function(config){
		// { position: 0 - 1, delay: 2000ms by default, css : name of css class to use }
		var width;
		if (!this._progress){

			config = extend({
				position:0,
				delay: 2000,
				type:"icon",
				icon:"wxi-sync",
				hide:false
			}, (config||{}), true);

			var incss = (config.type == "icon") ? (config.icon+" webix_spin") : "";

			this._progress = create(
				"DIV",
				{
					"class":"webix_progress_"+config.type,
					"role":"progressbar",
					"aria-valuemin":"0",
					"aria-valuemax":"100",
					"tabindex":"0"
				},
				"<div class='webix_progress_state "+incss+"'></div>"
			);

			if(!this.setPosition)
				this._viewobj.style.position = "relative";

			insertBefore(this._progress, this._viewobj.firstChild, this._viewobj);
			this._viewobj.setAttribute("aria-busy", "true");

			if(!this._touch_scroll){
				if (this.getScrollState){
					var scroll = this.getScrollState();
					if (this._viewobj.scrollWidth != this.$width){
						this._progress.style.left = scroll.x +"px";
					}
					if (this._viewobj.scrollHeight != this.$height){
						if(config.type != "bottom"){
							this._progress.style.top = scroll.y + "px";
						} else {
							this._progress.style.top = scroll.y + this.$height - this._progress.offsetHeight +"px";
						}

					}
				}
			}

			this._progress_animate = config.type != "icon";
		}

		if (!config) return;

		if (this._progress_animate){
			var position = config.position || 1;
			if (config.delay){
				// force reflow
				width = this._viewobj.firstChild.offsetWidth;
				this._progress.firstChild.style[env.transitionDuration] = config.delay+"ms";
			}

			// animate to new value
			this._progress.firstChild.style.width = position*100+"%";
		}

		if (this._progress_hide)
			clearTimeout(this._progress_hide);

		if (config.hide)
			this._progress_hide = delay(this.hideProgress, this, [true], config.delay);

		// necessary to prevent code optimization
		return width;
	},
	hideProgress:function(now){
		if (this._progress){
			if (now || !this._progress_animate){
				remove(this._progress);
				this._progress = null;
				this._viewobj.removeAttribute("aria-busy");
			} else {
				this.showProgress({ position:1.1, delay:300 , hide:true });
			}
		}
	}
};

export default ProgressBar;