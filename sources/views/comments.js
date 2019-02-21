import {protoUI} from "../ui/core";
import layout from "../views/layout";
import list from "../views/list";

import {ui, $$} from "../ui/core";
import {extend, bind, delay, toArray} from "../webix/helpers";
import env from "../webix/env";
import {setSelectionRange, preventEvent} from "../webix/html";
import {attachEvent, detachEvent} from "../webix/customevents";
import {confirm} from "../webix/message";
import template from "../webix/template";
import {$active} from "../webix/skin";

import i18n from "../webix/i18n";

import UIManager from "../core/uimanager";
import DateHelper from "../core/date";
import AtomDataLoader from "../core/atomdataloader";
import proxy from "../load/proxy";
import {dp} from "../load/dataprocessor";
import DataCollection from "../core/datacollection";


const api = {
	name:"comments",
	defaults:{
		sendAction:"click",
		mode:"comments",
		moreButton:template(i18n.comments.moreComments)
	},
	$init: function(config){
		this.$view.className +=" webix_comments";

		config.rows = [this._configList(config)];
		if(!config.readonly)
			config.rows.push(this._configForm());

		this._destroy_with_me = [];

		this._initUsers(config.users);
		this._initMenu();
		this.$ready.push(this._afterInit);
	},
	$exportView:function(){
		return this._list;
	},
	_afterInit: function(){
		// store UI blocks
		this._list = this.queryView({view:"list"});
		this._form = this.queryView({view:"form"});
		this._sendButton = this.queryView({view:"button"});
		this._input = this.queryView({view:"textarea"});

		//provide data-like API
		this._list.data.provideApi(this, true);
		this.serialize = () => {
			var data = this._list.serialize();
			var index = this.getIndexById("$more");

			if(index >= 0)
				data.splice(index, 1);
			return data;
		};

		//tune input zone
		this._clickHandler = attachEvent("onClick", (e) => {
			var view = $$(e);
			if(view == this._input){
				this._changeTextarea(true);
				delay(() => { this._input.focus(); });
			}
			else if(view !==this._sendButton && view !==this._listMenu && 
				(!e || (e.target.className||"").toString().indexOf("webix_comments_menu") ===-1)
			){
				this._changeTextarea();
			}
		});

		this.attachEvent("onDestruct", function(){
			detachEvent(this._clickHandler);
		});
	},
	$onLoad: function(data, driver){
		this._fillList(data, driver);
	},
	_fillList: function(data, driver){
		var list = this._list || this.queryView({view:"list"});
		list.data.driver = driver;
		
		var more = data.more;
		data = driver.getRecords(data);

		//parse more comments
		if(this._moreCall){
			this._moreCall = false;
			if(data.length){
				//add spaces after 'more' button to accommodate new data
				var order = list.data.order, pos = 1;
				
				if(this._settings.mode == "chat")
					list.data.order = toArray([order[0]].concat(new Array(data.length), order.slice(1)));
				else{
					var start = list.getIndexById("$more");
					list.data.order = toArray(order.slice(0, start).concat(new Array(data.length), order.slice(start)));
					pos = start;
				}

				//parse into defined position
				list.parse({data:data, pos:pos});
				if(more)
					dp(this._list).ignore(() => {
						this._list.updateItem("$more", {value:more});
					});

				if(this._settings.mode == "chat")
					list.showItem(list.getIdByIndex(data.length));
			}
			if(!data.length || !more)
				dp(this._list).ignore(() => {
					this._list.remove("$more");
				});
		}
		//normal parse
		else{
			if(more && !list.exists("$more")){
				more = { id:"$more", value:more };
				if(this._settings.mode == "chat")
					data.unshift(more);
				else
					data.push(more);
			}
			list.parse(data);
			if(this._settings.mode == "chat")
				list.showItem(list.getLastId());
		}
	},
	$skin:function(){
		this._inputHeight = $active.inputHeight+6;
	},
	getUsers: function(){
		return this._users;
	},
	getMenu: function(){
		return this._listMenu;
	},
	setCurrentUser: function(id){
		this.config.currentUser = id;
		this._form.clear();
		this._list.refresh();
	},
	edit: function(id){
		if(this.callEvent("onBeforeEditStart", [id])){
			this._changeTextarea(true);
			
			var values = this._list.getItem(id);
			this._form.setValues(values);
			this._form.focus();

			//set cursor to the last character and scroll to bottom
			var node = this._form.elements.text.getInputNode();
			node.scrollTop = node.scrollHeight;
			setSelectionRange(node, values.text.length);
			this.callEvent("onAfterEditStart", [id]);
		}
	},
	_saveComment: function(clear){
		var values = this._form.getValues();
		
		if(values.text){
			if(values.id)
				this.updateItem(values.id, values);
			else{
				if(this.config.currentUser)
					values.user_id = this.config.currentUser;
				values.date = new Date();

				this.add(values);
				this._list.scrollTo(0, this._list.getLastId());
			}
			this._form.clear();
			if(clear)
				this._input.getInputNode().value = "";
		}
	},
	_removeComment:function(id){
		if(this._form.getValues().id == id){
			this._form.clear();
		}
		this.remove(id);
	},
	_changeTextarea: function(increase){
		//this behaviour is only for desktop, otherwise we will never see the button on mobile
		if(env.touch) return;
		
		var text = this._input;
		if(increase){
			this._sendButton.getParentView().show();
			text.define({height:84});
		}
		else{
			if(UIManager.hasFocus(this._sendButton))
				UIManager.setFocus(this._list);
			this._sendButton.getParentView().hide();
			text.define({height:this._inputHeight});
		}
		text.resize();
	},
	_toggleButton(value){
		if(!value) value = this._input.getValue();

		if(value && !this._sendButton.isEnabled()) this._sendButton.enable();
		else if(!value && this._sendButton.isEnabled()) this._sendButton.disable();
	},
	_initMenu: function(){
		this._listMenu = ui({
			view:"contextmenu",
			autowidth:true,
			point:false,
			data:[
				{ id:"edit", icon:"wxi-pencil", value: i18n.comments["edit"]},
				{ id:"remove", icon:"wxi-trash", value: i18n.comments["remove"]}
			],
			on:{
				onShow:() => {
					var ctx = this._listMenu.getContext();
					this._list.addCss(ctx.id, "active_menu");
				},
				onHide:() => {
					var ctx = this._listMenu.getContext();
					this._list.removeCss(ctx.id, "active_menu");
				},
				onItemClick:(id) => {
					var ctx = this._listMenu.getContext();
					if(this.callEvent("onBeforeMenuAction", [id, ctx.id])){
						if(id=="edit")
							this.edit(ctx.id);
						else if(id =="remove"){
							if(i18n.comments.confirmMessage)
								confirm({
									text: i18n.comments.confirmMessage,
									callback: (res) => {
										if (res) this._removeComment(ctx.id);
									}
								});
							else
								this._removeComment(ctx.id);
						}
					}	
				}
			}
		});

		this._destroy_with_me.push(this._listMenu);
	},
	_configForm: function(){
		var locale = i18n.comments;
		return {
			view:"form",
			minHeight: 50,
			paddingX:10,
			elements:[
				{
					view:"textarea",
					css:"webix_comments_textarea",
					height:this._inputHeight,
					name: "text",
					placeholder: locale["placeholder"],
					keyPressTimeout:100,
					on:{
						onTimedKeyPress:() => {
							this._toggleButton();
						},
						onChange:(newv) => {
							this._toggleButton(newv);
						},
						onKeyPress:(code, ev) => {
							if(code == 13){
								var action = this._settings.sendAction, shift = ev.shiftKey;
								if( (action == "enter" && !shift) || (action !== "enter" && shift) ){
									preventEvent(ev);
									this._saveComment(true);
								}
							}
						}
					}
				},
				{
					hidden: !env.touch,
					cols:[
						{},
						{
							view:"button",
							disabled:true,
							css: "webix_comments_send",
							type:"form",
							value: locale["send"],
							autowidth:true,
							click: () => { this._saveComment(); }
						}
					]
				}
			]
		};
	},
	_configList: function(config){
		var css = "webix_comments_";

		var type = {
			height: "auto",
			templateStatus: (obj) => {
				return "<span class = '"+css+"status "+obj.status+"'></span>";
			},
			templateUser: (obj) => {
				var users = this.getUsers();
				var user = (users && users.exists(obj.user_id)) ? users.getItem(obj.user_id) : {};

				var name = "<span class = '"+css+"name'>"+(user.value || "")+"</span>";
				return name;
			},
			templateMenu: () => {
				return "<span class='webix_icon wxi-dots "+css+"menu'></span>";
			},
			templateDate: (obj) => {
				var format = DateHelper.dateToStr("%d %M, %H:%i");
				return obj.date?("<span class='"+css+"date'>"+format(obj.date)+"</span>"):"";
			},
			templateLinks: (obj) => {
				var text = obj.text.replace(/(https?:\/\/[^\s]+)/g, function(match){
					match = template.escape(match);
					var html = "<a target='_blank' href='"+match+"'>";
					if(match.match(/.(jpg|jpeg|png|gif)$/))
						html += "<img class='webix_comments_image' src='"+match+"'/>";
					else
						html += match;
					return html+"</a>";
				});
				return text;
			},
			templateText: (obj, common) => {
				return "<div class = '"+css+"message'>"+common.templateLinks(obj)+"</div>";
			},
			templateAvatar: (obj, common) => {
				var avatar = "<div class='"+css+"avatar'>";
			
				var users = this.getUsers();
				var user = (users && users.exists(obj.user_id)) ? users.getItem(obj.user_id) : {};
				if(user.status)
					avatar += common.templateStatus(user);

				avatar += "<div class='"+css+"avatar_image ";
				if (user.image)
					avatar += "'><img src = '"+user.image+"' class='"+css+"photo'>";
				else{
					var icon = user.value ? user.value[0].toUpperCase() : "<span class='webix_icon wxi-user'></span>";
					avatar += css+"avatar_text'>"+icon;
				}

				avatar += "</div></div>";
				return avatar;
			},
			template: (obj, common) => {
				var message;
				if(obj.id == "$more"){
					message = "<div class='webix_comments_more'>"+this._settings.moreButton(obj)+"</div>";
				}
				else{
					var avatar = common.templateAvatar(obj, common);
					var user = common.templateUser(obj, common);
					var date = common.templateDate(obj, common);
					var menu = common.templateMenu(obj, common);
					var text = common.templateText(obj, common);

					message = avatar+user+menu+date+text;
				}
				return message;
			},
			classname: (obj, common, marks) => {
				var css = list.api.type.classname(obj, common, marks);
				if((obj.user_id && obj.user_id == this._settings.currentUser) || !this._users.count())
					css += " webix_comments_current";
				return css;
			}
		};

		type = extend(type, config.listItem || {}, true);

		var scheme = {
			$init:(obj) => {
				if(obj.date)
					obj.date = i18n.parseFormatDate(obj.date);
			}
		};

		scheme = extend(scheme, config.scheme || {}, true);

		var listConfig = {
			view:"list",
			navigation:false,
			type: type,
			scheme:scheme,
			onClick: {
				"webix_comments_menu": (ev, id) => {
					if(this._listMenu.isVisible())
						this._listMenu.hide();
					else{
						this._listMenu.setContext({obj:this, id:id});
						this._listMenu.show(ev.target, type.menuPosition||{pos:"left", y:30, x:10});
					}
				},
				"webix_comments_more": () => {
					if(this.config.url && this.callEvent("onDataRequest", [])){
						this._moreCall = true;

						var more = this._list.getItem("$more").value;
						var pos = this._settings.mode == "chat"?more:this._list.getIndexById("$more");

						var url = proxy.$parse(this.config.url);
						var callback = { error:() => { this._moreCall = false; }};

						if(typeof url =="string")
							url = url+(url.indexOf("?")<0?"?":"&")+"pos="+pos+"&more="+more;

						this.load(url, callback, { pos:pos, more:more });
					}
				}
			},
			on:{
				onAfterScroll: bind(function(){
					//menu moves with scroll
					this._listMenu.hide();
				}, this)
			}
		};
		if(config.save)
			listConfig.save = config.save;
		return listConfig;
	},
	_initUsers:function(value){
		if(value && value.getItem){
			this._users = value;
		} else{
			this._users = new DataCollection();
			this._destroy_with_me.push(this._users);
			if(value && typeof value === "string")
				this._users.load(value);
			else
				this._users.parse(value||[]);
		}
		this._users.data.attachEvent("onStoreUpdated", () => {
			this._list.refresh();
		});
	}
};

const view = protoUI(api,  AtomDataLoader, layout.view);
export default {api, view};