/**
 * Plugin Name: Combo Select
 * Author : Vinay@Pebbleroad
 * Date: 23/11/2014
 * Description: 
 * Converts a select box into a searchable and keyboard friendly interface. Fallbacks to native select on mobile and tablets
 */

// Expose plugin as an AMD module if AMD loader is present:
(function (factory) {
		'use strict';
		if (typeof define === 'function' && define.amd) {
				// AMD. Register as an anonymous module.
				define(['jquery'], factory);
		} else if (typeof exports === 'object' && typeof require === 'function') {
				// Browserify
				factory(require('jquery'));
		} else {
				// Browser globals
				factory(jQuery);
		}
}(function ( $, undefined ) {

		var pluginName = "comboSelect";
		var defaults = {			
			comboClass         : 'combo-select',
			comboArrowClass    : 'combo-arrow',
			comboDropDownClass : 'combo-dropdown',
			inputClass         : 'combo-input text-input',
			disabledClass      : 'option-disabled',
			hoverClass         : 'option-hover',
			selectedClass      : 'option-selected',
			markerClass        : 'combo-marker',
			themeClass         : '',
			maxHeight          : 200,
			extendStyle        : true
		};

		/**
		 * Utility functions
		 */

		var utils = (function(){

			return {
				sanitize: function(text){

					return $.trim(text).toLowerCase()

				},
				escapeRegex: function(value){

					return value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
				}
			}
		})(),

		keys = {
			ESC: 27,
			TAB: 9,
			RETURN: 13,
			LEFT: 37,
			UP: 38,
			RIGHT: 39,
			DOWN: 40,
			ENTER: 13,
			SHIFT: 16
		};

		/**
		 * Constructor
		 * @param {[Node]} element [Select element]
		 * @param {[Object]} options [Option object]
		 */
		function Plugin ( element, options ) {
				
				/* Name of the plugin */

				this._name = pluginName;

				/* Reverse lookup */

				this.el = element

				/* Element */

				this.$el = $(element)

				/* Settings */

				this.settings = $.extend( {}, defaults, options, this.$el.data() );

				/* Defaults */

				this._defaults = defaults;

				/* Options */

				this.$options = this.$el.find('option, optgroup')

				/* Initialize */

				this.init();

				/* Instances */

				$.fn[ pluginName ]['instances'].push(this);

		}

		$.extend(Plugin.prototype, {
				init: function () {

					/* Construct the comboselect */

					this._construct();


								/* Add event bindings */          

					this._events();


				},
				_construct: function(){

					var self = this

					/**
					 * Add negative TabIndex to `select`
					 */

					this.$el.attr("tabIndex", -1)

					/**
					 * Wrap the Select
					 */

					this.$container = this.$el.wrapAll('<div class="' + this.settings.comboClass + ' '+ this.settings.themeClass + '" />').parent();
					
					/**
					 * Check if select has a width attribute
					 */
					if(this.settings.extendStyle && this.$el.attr('style')){

						this.$container.attr('style', this.$el.attr("style"))
						
					}
					

					/**
					 * Append dropdown arrow
					 */

					this.$arrow = $('<div class="'+ this.settings.comboArrowClass+ '" />').appendTo(this.$container)


					/**
					 * Append dropdown
					 */

					this.$dropdown = $('<ul class="'+this.settings.comboDropDownClass+'" />').appendTo(this.$container)


					/**
					 * Create dropdown options
					 */

					var o = '', k = 0, p = '';

					this.selectedIndex = this.$el.prop('selectedIndex')

					this.$options.each(function(i, e){

						if(e.nodeName.toLowerCase() == 'optgroup'){

							return o+='<li class="option-group '+ self.settings.disabledClass+'">'+this.label+'</li>'
						}

						if(!e.value) p = e.innerHTML

						o+='<li class="'+(this.disabled? self.settings.disabledClass : "option-item") + ' ' +(k == self.selectedIndex? self.settings.selectedClass : '')+ '" data-index="'+(k)+'" data-value="'+this.value+'">'+ (this.innerHTML) + '</li>'

						++k;
					})

					this.$dropdown.html(o)

					/**
					 * Items
					 */

					this.$items = this.$dropdown.children();


					/**
					 * Append Input
					 */

					this.$input = $('<input type="text" placeholder="'+p+'" class="'+ this.settings.inputClass + '">').appendTo(this.$container)

					/* Update input text */

					this._updateInput()

				},

				_events: function(){

					/* Input: focus */

					this.$container.on('focus.input', 'input', $.proxy(this._focus, this))

					/* Input: blur */

					this.$container.on('blur.input', 'input', $.proxy(this._blur, this))

					/* Select: change */

					this.$el.on('change.select', $.proxy(this._change, this))

					/* Dropdown Arrow: click */

					this.$container.on('click.arrow', '.'+this.settings.comboArrowClass , $.proxy(this._toggle, this))

					/* Dropdown: close */

					this.$container.on('comboselect:close', $.proxy(this._close, this))

					/* Dropdown: open */

					this.$container.on('comboselect:open', $.proxy(this._open, this))


					/* HTML Click */

					$('html').off('click.comboselect').on('click.comboselect', function(){
						
						$.each($.fn[ pluginName ].instances, function(i, plugin){

							plugin.$container.trigger('comboselect:close')

						})
								});

					/* Stop `event:click` bubbling */

								this.$container.on('click.comboselect', function(e){
									e.stopPropagation();
								})


								/* Input: keydown */

								this.$container.on('keydown', 'input', $.proxy(this._keydown, this))

								/* Input: keyup */
								
								this.$container.on('keyup', 'input', $.proxy(this._keyup, this))

								/* Dropdown item: click */

								this.$container.on('click.item', 'li', $.proxy(this._select, this))

				},

				_keydown: function(event){

					

					switch(event.which){

						case keys.UP:
							this._move('up', event)
							break;

						case keys.DOWN:
							this._move('down', event)
							break;
						
						case keys.TAB:
							this._enter(event)
							break;

						case keys.RIGHT:
							this._autofill(event);
							break;

						case keys.ENTER:
							this._enter(event);
							break;

						default:							
							break;


					}

				},
				

				_keyup: function(event){
					
					switch(event.which){
						case keys.ESC:													
							this.$container.trigger('comboselect:close')
							break;

						case keys.ENTER:
						case keys.UP:
						case keys.DOWN:
						case keys.LEFT:
						case keys.RIGHT:
						case keys.TAB:
						case keys.SHIFT:							
							break;
						
						default:							
							this._filter(event.target.value)
							break;
					}
				},
				
				_enter: function(event){

					var item = this._getHovered()

					item.length && this._select(item);

					/* Check if it enter key */
					if(event && event.which == keys.ENTER){

						if(!item.length) {
							
							/* Check if its illegal value */

							this._blur();

							return true;
						}

						event.preventDefault();
					}
					

				},
				_move: function(dir, event){

					var items = this._getVisible(),
						current = this._getHovered(),
						index = current.prevAll().filter(':visible').length,
						total = items.length

					
					switch(dir){
						case 'up':
							index--;
							(index < 0) && (index = (total - 1));
							break;

						case 'down':							
							index++;
							(index >= total) && (index = 0);							
							break;
					}

					
					items
						.removeClass(this.settings.hoverClass)
						.eq(index)
						.addClass(this.settings.hoverClass)


					if(!this.opened) this.$container.trigger('comboselect:open');

					this._fixScroll()
				},

				_select: function(event){

					var item = event.currentTarget? $(event.currentTarget) : $(event);

					if(!item) return;

					/**
					 * 1. get Index
					 */
					
					var index = item.data('index');

					this._selectByIndex(index);

					this.$container.trigger('comboselect:close')					

				},

				_selectByIndex: function(index){

					/**
					 * Set selected index and trigger change
					 * @type {[type]}
					 */
					if(typeof index == 'undefined'){
						
						index = null

					}

					this.$el.prop('selectedIndex', index).trigger('change');

				},

				_autofill: function(event){

					var item = this._getHovered();

					if(item.length){

						var index = item.data('index')

						this._selectByIndex(index)

					}

				},
				

				_filter: function(search){					

					var self = this,
						items = this._getAll();						
						needle = $.trim(search).toLowerCase(),
						reEscape = new RegExp('(\\' + ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'].join('|\\') + ')', 'g'),
												pattern = '(' + search.replace(reEscape, '\\$1') + ')';

										/**
					 * Unwrap all markers
					 */
					
					$('.'+self.settings.markerClass, items).contents().unwrap();
					
					if(needle){						
						
						items							
							.hide()
							.filter(function(){

								var $this = $(this),
									text = $.trim($this.text()).toLowerCase();
								
								/* Found */
								if(text.toString().indexOf(needle) != -1){
																		
									/**
									 * Wrap the selection
									 */									
									
									$this
										.html(function(index, oldhtml){
										return oldhtml.replace(new RegExp(pattern, 'gi'), '<span class="'+self.settings.markerClass+'">$1</span>')
									})									

									return true
								}

							})
							.show()
					}else{

						items.show();
					}

					/* Open the comboselect */

					this.$container.trigger('comboselect:open')
					

				},

				_highlight: function(){

					/* 
					1. Check if there is a selected item 
					2. Add hover class to it
					3. If not add hover class to first item
					*/
				
					var visible = this._getVisible().removeClass(this.settings.hoverClass),
						$selected = visible.filter('.'+this.settings.selectedClass)

					if($selected.length){
						
						$selected.addClass(this.settings.hoverClass);

					}else{

						visible
							.removeClass(this.settings.hoverClass)
							.first()
							.addClass(this.settings.hoverClass)
					}

				},

				_updateInput: function(){

					var selected = this.$el.prop('selectedIndex')
					
					if(this.$el.val()){
						
						text = this.$el.find('option').eq(selected).text()

						this.$input.val(text)

					}else{
						
						this.$input.val('')

					}

					return this._getAll()
					.removeClass(this.settings.selectedClass)
					.filter(function(){

						return $(this).data('index') == selected
					})
					.addClass(this.settings.selectedClass)
				
				},

				_focus: function(event){

					/* Open combo */

					if(!this.opened) this.$container.trigger('comboselect:open');
					

				},

				_blur: function(event){

					/**
					 * 1. Get hovered item
					 * 2. If not check if input value == select option
					 * 3. If none
					 */
					
					var self = this,
						val = $.trim(this.$input.val().toLowerCase()),
						isNumber = !isNaN(val);
					

					var index = this.$options.filter(function(){
						
						if(isNumber){
							return parseInt($.trim(this.innerHTML).toLowerCase()) == val
						}

						return $.trim(this.innerHTML).toLowerCase() == val

					}).prop('index')
				
					/* Select by Index */

					this._selectByIndex(index)
					
				},

				_change: function(event){


					this._updateInput();

				},

				_getAll: function(){

					return this.$items.filter('.option-item')

				},
				_getVisible: function(){

					return this.$items.filter('.option-item').filter(':visible')

				},

				_getHovered: function(){

					return this._getVisible().filter('.' + this.settings.hoverClass);

				},

				_open: function(){

					var self = this

					this.$container.addClass('combo-open')

					this.$container.trigger('comboselect:opened')						

					this.opened = true

					
					/* Focus input field */

					this.$input.focus();

					/* Highligh the items */

					this._highlight()

					/* Fix scroll */

					this._fixScroll()

					/* Close all others */


					$.each($.fn[ pluginName ].instances, function(i, plugin){

						if(plugin != self && plugin.opened) plugin.$container.trigger('comboselect:close')
					})

				},

				_toggle: function(){

					this.opened? this._close.call(this) : this._open.call(this)
				},

				_close: function(){				

					this.$container.removeClass('combo-open')

					this.$container.trigger('comboselect:closed')

					this.opened = false

					/* Show all items */

					this.$items.show();

				},
				_fixScroll: function(item){
			
					/**
					 * If dropdown is hidden
					 */
					if(this.$dropdown.is(':hidden')) return;

					
					/**
					 * Else					 
					 */
					var item = this._getHovered();

					if(!item.length) return;					

					/**
					 * Scroll
					 */
					
					var offsetTop,
						upperBound,
						lowerBound,
						heightDelta = item.outerHeight()
		
					offsetTop = item[0].offsetTop;
					
					upperBound = this.$dropdown.scrollTop();

					lowerBound = upperBound + this.settings.maxHeight - heightDelta;
					
					if (offsetTop < upperBound) {
							
							this.$dropdown.scrollTop(offsetTop);

					} else if (offsetTop > lowerBound) {
							
							this.$dropdown.scrollTop(offsetTop - this.settings.maxHeight + heightDelta);
					}

				},
		});


		// A really lightweight plugin wrapper around the constructor,
		// preventing against multiple instantiations
		$.fn[ pluginName ] = function ( options ) {

				var dataKey = 'comboselect';

				this.each(function() {

					var $e = $(this),
						instance = $e.data(dataKey)

					if (typeof options === 'string') {
						
						if (instance && typeof instance[options] === 'function') {
								instance[options](args);
						}

					}else{

						if (instance && instance.dispose) {
								instance.dispose();
						}

						$.data( this, "plugin_" + pluginName, new Plugin( this, options ) );

					}

				});

				// chain jQuery functions
				return this;
		};

		$.fn[ pluginName ].instances = [];

}));
