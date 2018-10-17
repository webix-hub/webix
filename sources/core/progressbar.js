import {create, insertBefore, remove} from "../webix/html";
import Touch from "../core/touch";
import env from "../webix/env";
import {isUndefined, extend, delay} from "../webix/helpers";


const ProgressBar = {
	$init:function(){
		if (isUndefined(this._progress) && this.attachEvent){
			this.attachEvent("onBeforeLoad", this.showProgress);
			this.attachEvent("onAfterLoad", this.hideProgress);
			this._progress = null;
		}
	},
	showProgress:function(config){
		// { position: 0 - 1, delay: 2000ms by default, css : name of css class to use }
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

			if(!Touch.$active){
				if(this.getScrollState){
					var scroll = this.getScrollState();
					if(this._viewobj.scrollWidth != this.$width){
						this._progress.style.left = scroll.x +"px";
					}
					if(this._viewobj.scrollHeight != this.$height){
						if(config.type != "bottom"){
							this._progress.style.top = scroll.y +"px";
						} else {
							this._progress.style.top =  scroll.y + this.$height - this._progress.offsetHeight +"px";
						}

					}
				}
			}


			this._progress_delay = 1;
		}

		if (config && config.type != "icon")
			delay(function(){
				if (this._progress){
					var position = config.position || 1;
					//check for css-transition support
					if(this._progress.style[env.transitionDuration] !== undefined || !config.delay){
						this._progress.firstChild.style.width = position*100+"%";
						if (config.delay)
							this._progress.firstChild.style[env.transitionDuration] = config.delay+"ms";
					} else{
					//if animation is not supported fallback to timeouts [IE9]
						var count = 0,
							start = 0,
							step = position/config.delay*30,
							view = this;

						if(this._progressTimer){
							//reset the existing progress
							window.clearInterval(this._progressTimer);
							start = this._progress.firstChild.offsetWidth/this._progress.offsetWidth*100;
						}
						this._progressTimer = window.setInterval(function(){
							if(count*30 == config.delay){
								window.clearInterval(view._progressTimer);
							}
							else{
								if(view._progress && view._progress.firstChild)
									view._progress.firstChild.style.width = start+count*step*position*100+"%";
								count++;
							}
						},30);
					}

					if (config.hide)
						delay(this.hideProgress, this, [1], config.delay);

				}
				this._progress_delay = 0;
			}, this);
		else if(config && config.type == "icon" && config.hide)
			delay(this.hideProgress, this, [1], config.delay);
	},
	hideProgress:function(now){
		if (this._progress_delay)
			now = true;

		if (this._progress){
			if (now){
				if(this._progressTimer)
					window.clearInterval(this._progressTimer);
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