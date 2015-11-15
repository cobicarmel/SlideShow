'use strict';

var SlideShow = function(options){

	var self = this,
		effect;

	var parseStyleRules = function(objRule, context){

		var rules = $.extend({}, objRule);

		for(var r in rules) {

			if(rules.hasOwnProperty(r) && $.isFunction(rules[r]))
				rules[r] = rules[r].call(self, context);
		}

		return rules;
	};

	var initEffect = function(){

		var effectType = SlideShow.effects.library[options.animation];

		if(effectType)
			effect = new effectType(self, {duration: options.duration, easing: options.easing});

		return !!effectType;
	};

	this.activeIndex = 0;

	this.$components = $();

	this.options = options;

	this.addArrows = function(){

		var sides = ['right', 'left'];

		var arrows = {
			prev: sides[+!options.isRTL],
			next: sides[+options.isRTL]
		};

		for(var a in arrows) {

			self['$' + a] =
				$('<div>', {class: 'gs-nav gs-' + a}).html(
					$('<div>', {class: 'gs-arrow auto-center'}).html(
						$('<div>', {class: 'fa fa-chevron-' + (arrows[a])})
					)
				);

			self.$container.append(self['$' + a]);
		}

		self.$arrows = self.$container.children('.gs-nav');

		self.$components = self.$components.add(self.$arrows);
	};

	this.addBullets = function(){

		self.$bulletsBar = $('<div>', {class: 'gs-bullets'});

		self.$items.each(function(){

			var $bullet = $('<div>', {class: 'gs-bullet fa fa-circle-o'});

			$bullet.appendTo(self.$bulletsBar);
		});

		self.$bullets = self.$bulletsBar.children();

		self.$bulletsBar.appendTo(self.$container);

		self.$components = self.$components.add(self.$bulletsBar);
	};

	this.addPlayButton = function(){

		self.$playButton = $('<div>', {class: 'gs-play auto-center fa fa-play'});

		self.$playButton.appendTo(self.$container);

		self.$components = self.$components.add(self.$playButton);
	};

	this.attachEvents = function(){

		if(options.showArrows)
			self.$arrows.click(function(){
				self.stop();

				if($(this).hasClass('gs-next'))
					self.next();
				else
					self.prev();
			});

		if(options.showBullets)
			self.$bullets.click(self.goFromAssoc);

		if(!self.playButton)
			return;

		self.$playButton.click(function(){

			if(self.$playButton.is('.fa-pause'))
				self.stop();
			else
				self.play(true);
		});
	};

	this.bindArrow = function(element, dir, callback){

		$(element).on('click', function(e){

			e.preventDefault();

			var action = self[dir]();

			if($.isFunction(callback))
				callback.call(this, action);
		});
	};

	this.changeItem = function(dir){

		var $items = self.changableItems = {};

		$items.new = self.getItem(self.activeIndex);

		if(self.oldIndex != self.activeIndex)
			$items.old = self.getItem(self.oldIndex);

		self.treatZIndex(dir);

		effect.setPrevItem($items.old);

		effect.setNextItem($items.new);

		effect.run(dir);

		if(options.showBullets)
			self.$bullets
				.removeClass('fa-circle active')
				.eq(self.activeIndex)
				.addClass('fa-circle active');
	};

	this.getItem = function(index){
		return self.$items.eq(index);
	};

	this.goFromAssoc = function(stack){

		var index = !isNaN(+stack) ? stack : stack instanceof $ ? stack.index(this) : $(this).index();

		self.setActive(index);
	};

	this.init = function(){

		self.initSettings();

		if($.isPlainObject(options.galleryBuilder)) {

			self.gallery = new SlideShow.galleryBuilder(self);

			self.gallery.init(options.galleryBuilder);

			options.container = self.gallery.$slider;
		}

		self.$container = $(options.container);

		for(var o in options)
			self[o] = options[o];

		self.$items = $(options.items, self.$container);

		if(options.showBullets)
			self.addBullets();

		if(options.showArrows)
			self.addArrows();

		if(self.playButton)
			self.addPlayButton();

		if(!initEffect())
			throw new TypeError('The effect "' + options.animation + '" doesn\'t exist');

		self.initView();

		self.attachEvents();

		if(self.autoPlay)
			self.play();
	};

	this.initSettings = function(){

		var defaultOptions = {
			playButton: false,
			animation: 'verticalSlide',
			autoPlay: false,
			delay: 4000,
			duration: 1500,
			easing: 'swing',
			isRTL: false,
			items: '.gallery-item',
			showBullets: true,
			showArrows: true
		};

		options = $.extend(defaultOptions, options);
	};

	this.initView = function(){

		self.$components.css('z-index', 3);

		self.$items.css('z-index', 0);

		self.goFromAssoc(0);
	};

	this.next = function(animate){

		self.oldIndex = self.activeIndex++;

		if(self.activeIndex >= self.$items.length)
			self.activeIndex = 0;

		self.changeItem('next', animate);
	};

	this.play = function(now){

		self.stop();

		if(options.playButton)
			self.$playButton.addClass('fa-pause').removeClass('fa-play');

		if(now)
			self.next(true);

		self.interval = setInterval(function(){
			self.next(true);
		}, self.delay || 4000);
	};

	this.prev = function(){

		self.oldIndex = self.activeIndex--;

		if(self.activeIndex < 0)
			self.activeIndex = self.$items.length - 1;

		self.changeItem('prev');
	};

	this.setActive = function(index){

		self.stop();

		self.oldIndex = self.activeIndex;

		self.activeIndex = index;

		var dir = self.oldIndex > self.activeIndex ? 'prev' : 'next';

		self.changeItem(dir);
	};

	this.stop = function(){

		if(options.playButton)
			self.$playButton.addClass('fa-play').removeClass('fa-pause');

		clearInterval(self.interval);
	};

	this.treatZIndex = function(dir){

		var $bottomNeedle = self.changableItems[dir == 'next' ? 'old' : 'new'],
			$topNeedle = self.changableItems[dir == 'next' ? 'new' : 'old'];

		self.$items.css('z-index', 0);

		if($bottomNeedle)
			$bottomNeedle.css('z-index', 1);

		if($topNeedle)
			$topNeedle.css('z-index', 2);
	}
};

/* Gallery Builder Module */

SlideShow.galleryBuilder = function(caller){

	var self = this,
		items = [];

	var defaultOptions = {
		duration: 400,
		sliderId: 'gallery-slideshow',
		sliderContainerId: 'gs-content',
		loadSources: true
	};

	var attachEvents = function(){

		self.$images.click(self.show);

		self.$slider.click(self.hide);

		$(document).on({

			keydown: function(e){

				var code = e.which,
					isRTL = caller.options.isRTL,
					prevCode = isRTL ? 39 : 37,
					nextCode = isRTL ? 37 : 39;

				if(self.$slider.is(':hidden'))
					return;

				switch(code) {
					case nextCode:
						caller.next();
						break;
					case prevCode:
						caller.prev();
						break;
					case 27:
						self.hide();
						break;
					default:
						return;
				}

				return false; // FF problem
			},

			mousewheel: function(e){

				if(self.$slider.is(':hidden'))
					return;

				var originalE = e.originalEvent;

				var delta = originalE.detail * -1 || originalE.wheelDelta; // detail for FF, wheelDelta otherwise

				var isPrev = caller.options.isRTL ? delta > 0 : delta <= 0;

				if(isPrev)
					caller.prev();
				else
					caller.next();

				return false;
			}
		});
	};

	var build = function(){

		self.$slider.html(self.$sliderContent);

		self.$slider.appendTo('body');

		self.$images.each(self.addImage);
	};

	var compareSize = function(){

		var $this = $(this),
			$parent = $this.parents('.gallery-item'),
			height = this.height,
			width = this.width,
			imgRatio = height / width,
			winHeight = window.innerHeight,
			winWidth = window.innerWidth;

		if(winHeight - 150 <= height) {
			height = winHeight - 150;
			width = height / imgRatio;
		}

		if(winWidth <= width) {
			width = winWidth - 50;
			height = width * imgRatio;
		}

		$parent.add($this).height(height).width(width);
	};

	var initComponents = function(){

		self.$container = $(self.options.container);

		var imageSelector = self.options.images;

		if(typeof imageSelector == 'function')
			self.$images = imageSelector.apply(self.$container);
		else
			self.$images = $(self.options.images);

		self.$slider = $('<div>', {id: self.options.sliderId});

		self.$sliderContent = $('<div>', {id: self.options.sliderContainerId});
	};

	var initSettings = function(options){

		self.options = $.isPlainObject(options) ? $.extend(true, {}, defaultOptions, options) : defaultOptions;
	};

	var loadSources = function(){

		var src;

		if($.isFunction(self.options.fullUrl))
			src = self.options.fullUrl.apply(this);
		else
			src = $(this).prop('src');

		return $('<img>', {src: src});
	};

	this.init = function(options){

		initSettings(options);

		initComponents();

		build();

		attachEvents();
	};

	this.addImage = function(){

		var $item,
			$wrapper = $('<div>', {class: 'gallery-item auto-center'}),
			$close = $('<div>', {class: 'gs-close fa fa-times', title: 'סגירה'});

		if(self.options.loadSources)
			$item = loadSources.apply(this);
		else
			$item = $(this).clone();

		$wrapper.append($close, $item);

		if($.isFunction(self.options.wrap))
			$item.wrap(self.options.wrap.apply(this));

		items.push($item);

		self.$sliderContent.append($wrapper);
	};

	this.hide = function(e){

		if(e && $(e.target).is(':not(#gallery-slideshow):not(.gs-close)'))
			return;

		self.$slider.fadeOut(self.options.duration);

		caller.stop();

		$(window).resize();
	};

	this.show = function(e){

		if(e){

			e.preventDefault();

			caller.goFromAssoc.call(this, self.$images);
		}

		self.$slider.fadeIn(self.options.duration, function(){

			items.forEach(function(item){

				compareSize.apply(item.find('img')[0]);
			});
		});

		if(self.options.onShow)
			self.options.onShow.call(self);
	};

};

/* Effects Module */

SlideShow.effects = {};

SlideShow.effects.helpers = {

	containerSize: function(){

		return this.$container.width();
	}
};

SlideShow.effects.library = {};

SlideShow.effects.Model = function(uSettings){

	var sliderInstance,
		settings = {},
		$prevItem,
		$nextItem;

	var animateElement = function($element, properties, callback){

		$element.animate(parseStyleRules(properties), settings.duration, settings.easing, callback);
	};

	var styleItem = function($element, properties){

		$element.css(parseStyleRules(properties));
	};

	var initSettings = function(){

		var defaultSettings = {
			duration: 1000,
			easing: 'swing',
			rules: {
				next: {
					prevItem: {
						style: {},
						animation: {},
						callback: {}
					},
					nextItem: {
						style: {},
						animation: {},
						callback: {}
					}
				}
			}
		};

		$.extend(settings, defaultSettings, uSettings);
	};

	var parseStyleRules = function(objRule, context){

		var rules = $.extend({}, objRule);

		for(var r in rules) {

			if(rules.hasOwnProperty(r) && $.isFunction(rules[r]))
				rules[r] = rules[r].call(sliderInstance, context);
		}

		return rules;
	};

	var init = function(){

		initSettings();
	};

	var runItem = function($item, rules){

		if(rules.style)
			styleItem($item, rules.style);

		var callback = function(){

			if(rules.callback) {

				if(rules.callback.prevItem)
					runItem($prevItem, rules.callback.prevItem);

				if(rules.callback.nextItem)
					runItem($nextItem, rules.callback.nextItem);
			}
		};

		if(rules.animation)
			animateElement($item, rules.animation, callback);
		else
			callback();
	};

	this.setPrevItem = function(element){

		$prevItem = $(element);
	};

	this.setNextItem = function(element){

		$nextItem = $(element);
	};

	this.getPrevItem = function(){

		return $prevItem;
	};

	this.getNextItem = function(){

		return $nextItem;
	};

	this.setSliderInstance = function(slider){

		sliderInstance = slider;
	};

	this.run = function(direction){

		var rules = $.isEmptyObject(settings.rules.prev) ? settings.rules.next : settings.rules[direction];

		if(rules.prevItem)
			runItem($prevItem, rules.prevItem);

		if(rules.nextItem)
			runItem($nextItem, rules.nextItem);
	};

	init();
};

SlideShow.effects.add = function(name, proerties){

	var effect = function(sliderInstance){

		SlideShow.effects.Model.call(this, proerties);

		this.setSliderInstance(sliderInstance);
	};

	effect.prototype = new SlideShow.effects.Model;

	effect.prototype.constructor = effect;

	SlideShow.effects.library[name] = effect;

	return effect;
};

/* Effects */

SlideShow.effects.add('opacity', {
	rules: {
		next: {
			nextItem: {
				style: {
					opacity: 0,
					display: 'block'
				},
				animation: {
					opacity: 1
				},
				callback: {
					prevItem: {
						style: {
							opacity: 0,
							display: 'none'
						}
					}
				}
			}
		}
	}
});

SlideShow.effects.add('verticalSlide', {
	rules: {
		next: {
			nextItem: {
				style: {
					right: SlideShow.effects.helpers.containerSize
				},
				animation: {
					right: 0
				},
				callback: {
					prevItem: {
						style: {
							right: SlideShow.effects.helpers.containerSize
						}
					}
				}
			}
		},
		prev: {
			prevItem: {
				animation: {
					right: SlideShow.effects.helpers.containerSize
				}
			},
			nextItem: {
				style: {
					right: 0
				}
			}
		}
	}
});

SlideShow.effects.add('cnn', {
	rules: {
		next: {
			nextItem: {
				style: {
					width: 0
				}
			},
			prevItem: {
				animation: {
					width: 0
				},
				callback: {
					nextItem: {
						animation: {
							width: SlideShow.effects.helpers.containerSize
						}
					}
				}
			}
		}
	}
});