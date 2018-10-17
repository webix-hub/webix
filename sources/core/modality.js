import {create, remove} from "../webix/html";
import {zIndex} from "../ui/helpers";
import {bind} from "../webix/helpers";
import {_event} from "../webix/htmlevents";

import state from "./state";

const Modality = {
	_modal_set:function(value){
		if (value){
			if (!this._modal_cover){
				this._modal_cover = create("div",{
					"class":"webix_modal"
				});
				/*	with below code we will have the same zIndex for modal layer as for the previous 
					abs positioned element, but because of attaching order modal layer will be on top anyway
				*/
				var index = this._settings.zIndex||zIndex();

				//set topmost modal layer
				this._previous_modality = state._modality;
				state._modality = index;


				this._modal_cover.style.zIndex = index-1;
				this._viewobj.style.zIndex = index;
				document.body.appendChild(this._modal_cover);
				document.body.style.overflow = "hidden";
				_event( this._modal_cover, "click", bind(this._ignore_clicks, this));
			}
		}
		else {
			if (this._modal_cover){
				remove(this._modal_cover);
				document.body.style.overflow = "";

				//restore topmost modal layer
				//set delay, as current window closing may have not finished click event
				//need to wait while it is not fully processed
				var topmost = this._previous_modality;
				setTimeout(function(){ state._modality = topmost; }, 1);

				this._modal_cover = null;
			}
		}
		return value;
	}
};


export default Modality;