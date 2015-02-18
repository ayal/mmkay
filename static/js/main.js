isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

window.console = window.console || (function() {
	var empty = function () {},
        functions = "log info warn error assert dir clear profile profileEnd".split(" "), 
        ff = 0, 
        fun = null, 
        return_obj = {};
	for(ff = 0; fun = functions[ff]; ff += 1) {
	    return_obj[fun] = empty
		}
	return return_obj
    }());

function prettyDate(time){
    var date = new Date(time);
	diff = (((new Date()).getTime() - date.getTime()) / 1000),
	day_diff = Math.floor(diff / 86400);
    
    if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
	return;
    
    return day_diff == 0 && (
			     diff < 60 && "just now" ||
			     diff < 120 && "1 minute ago" ||
			     diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
			     diff < 7200 && "1 hour ago" ||
			     diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
	day_diff == 1 && "Yesterday" ||
	day_diff < 7 && day_diff + " days ago" ||
	day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

data = {};
var app = angular.module('averagely-gallery', [])
    .filter('encode', function () {
	    return function (input) {
		return encodeURIComponent(input);
	    };
	})
    .filter('values_by_date', function () {
	    return function (input) {

		return _.values(input).sort(function(a,b){
			return  b.date.$date - a.date.$date
		    });
	    };
	})
    .filter('values_by_rate', function () {
	    return function (input) {

		var res = 
		_.values(input)
		.filter(function(a){
			if (window.filter && window.filter !== a.artist) {
			    return false;
			}
			return true;
		    }).sort(function(a,b){
			if (b.rating !== a.rating) {
			    return  b.rating - a.rating;
			}
			else {
			    return  b.date.$date - a.date.$date
			}
		    });
		return res;
	    };
	})
    .filter('nice_date', function () {
	    return function (input) {
		return prettyDate(input);
	    }});
	
app.config(['$locationProvider','$routeProvider', '$interpolateProvider', function($locationProvider,$routeProvider, $interpolateProvider) { 
	$interpolateProvider.startSymbol('[['); 
	$interpolateProvider.endSymbol(']]');

	var loadMoreControl = ['$scope', '$routeParams', function($scope, $routeParams){
		window.filter = $scope.filter = null;
		window.images_in_page = location.href.indexOf('scrollery') === -1 ? 16 : 3;
		window.loadmore && loadmore();
	    }];

	$locationProvider.html5Mode(true);
	$routeProvider.when("/",{templateUrl: 'gallery'})
	    .when("/gallery",{templateUrl: 'gallery', controller: loadMoreControl})
	    .when("/scrollery",{templateUrl: 'scrollery', controller: loadMoreControl})
	    .when("/about", {templateUrl: 'about'})
	    .when("/feedback",{templateUrl: 'feedback'})
	    .when("/:mode/img/:id", {templateUrl: 'switchery', 
			"controller": 
		    ['$scope', '$routeParams',
		     function($scope,$routeParams){			    
			    $scope.mode = $scope.templateName = $routeParams.mode;
		    }]
		})
	    .when("/:mode/filter/:filter", {templateUrl: 'switchery', 
			"controller": 
		    ['$scope', '$routeParams',
		     function($scope,$routeParams){			    
			    $scope.templateName = $routeParams.mode;
			    window.filter = $scope.filter = $routeParams.filter;
		    }]
		})

	    }]);

window.locationhref = function(){
    return 'http://' + location.host + location.pathname;
};

hidemodal = function(){
    $('.modal').modal('hide');
    $('.modal-backdrop').remove();
};

window.images_in_page = location.href.indexOf('scrollery') === -1 ? 16 : 3;
window.page = 1;

onscroll = function(){
    if($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
	$(window).unbind('scroll'); // unbind to wait a little before handling scroll again.. will bing again after load more is finished
	loadmore();
	angular.element($('body')[0]).scope().$digest();
    }
};

current_id = location.href.split('/').slice(-1)[0].split('?')[0];

updateTitle = function() {
    var imgdata = data[current_id];
    document.title = imgdata ? imgdata.name + ' by ' + imgdata.artist + ' | Averagely Gallery' : 'Averagely Gallery';
}

var gotdata = $.Deferred();
app.controller('GalleryCtrl', ['$scope', '$http', '$route', '$routeParams', '$location', function($scope, $http, $route, $routeParams, $location) {
	$http({method: 'GET', url: '/datumjson?_=' + (new Date()).getTime()}).
	    success(function(data, status, headers, config) {
		    window.server_sorted_data = $scope.origdata = window.origdata = data; // all the data (all the pages)

		    window.date_ordered_data = _.sortBy(window.origdata, function(a){
			    return -a.date.$date
			});

		    // all data is already here, we just load <images_in_page> images to view each time
		    window.loadmore = function(){

			// hacky way to decide on the sorting of the origdata from which we build our page
			// we should have scope.mode here bu it was too difficult to get it to work that way
			// so we go by the location.href
			if (location.href.indexOf('scrollery') === -1) {
			    // gallery mode:
			    $scope.origdata = window.origdata = window.server_sorted_data;
			}
			else {
			    $scope.origdata = window.origdata = window.date_ordered_data;
			}

			if (window.data && Object.keys(window.data) >= origdata.length) {
			    // no more images to load!
			    $('#loadmorebtn').hide();
			}

			var datadic = {};
			$.each(origdata, function(i){
				if (window.filter && window.filter !== this.artist) {
				    return;
				}
				if (current_id === this.avgid) {
				    datadic[this.avgid] = this;
				}
				if (Object.keys(datadic).length >= page * images_in_page) {
				    return;
				}
				datadic[this.avgid] = this;
			    });

			$scope.data = window.data = datadic;
			gotdata.resolve();

			if (page !== 1) { // page 1 occurs anyway
			    ga("send", "event", "engagement", "loaded page " + window.page, '' + window.page, window.page);
			}

			window.page++;
			setTimeout(function(){ // (re)bind scroll after loadmore is finished
				$(function (){
					$(window).scroll(onscroll);
				    });
			    },2000);
		    };

		    loadmore();
		    setTimeout(function(){ $('.loading').remove(); }, 500);
		}).
	    error(function(_, status, headers, config) {


		    $scope.data = $scope.data || {};
		    $.extend($scope.data, data);;
		});

	$scope.now_published = (location.hash.indexOf('new') > -1) || false;
	$scope.isChrome = isChrome;
	$scope.nogo = true;
	$scope.$location = $location;
	$scope.$route = $route;

	$scope.filterBy = function(what){
	    $scope.$location.path('/gallery/filter/' + what);
	    setTimeout(function(){
		    loadmore();
		    $scope.$digest();
		},500)
	}
	
	window.waitforall = [];
	window.timeouts = [];

	window.stopavg = function(){
	    $('.overlay').stop(true, true);
	    _.each(window.timeouts, function(tmt){
		    window.clearTimeout(tmt);
		});
	    window.timeouts = [];
	    $('.overlay').remove();

	}
	window.playavg = function(){
	    $('.poply').popover('hide');
	    window.clearTimeout(window.poptimeout);

	    ga("send", "event", "engagement","play", window.location.href);

	    _.each(window.timeouts, function(tmt){
		    window.clearTimeout(tmt);
		});
	    window.timeouts = [];

	    //	    $('.item.active img').animate({opacity: 0})

	    var urls = [];
	    if (data[current_id] && data[current_id].thumb_b64_list) {
		urls = _.map(data[current_id].thumb_b64_list, function(tid){return '/data/' + tid + '.png'})
	    }

	    window.waitforall = [];
	    window.waitforfinish = [];
	    $('.spinner').show();
	    $.each(urls, function(i, url) {
		    var waitone = $.Deferred();
		    waitforall.push(waitone);
		    $('<img class="overlay">')
			.attr('src', url)
			.load(function(){
				waitone.ref = this;
				this.ref = waitone;
				waitone.resolve(this);
			    })
			.error(function(){
				waitone.resolve(null);
			    });
		    setTimeout(function(){ // timeout in case image load fails
			    waitone.resolve(null);
			}, urls.length * 1000);
		});
		
		$.when.apply($, waitforall).done(function(){
			$('.spinner').hide();
			window.waitforfinish = [];
			$.each(_.without(arguments, null),
			       function(i, that){
				   var finished = $.Deferred();
				   waitforfinish.push(finished);
				   
				   window.timeouts.push(setTimeout(function(){
					   var cimg = $('.item.active img');
					   $(that)
					   .css({position: 'fixed',
						       top: cimg.offset().top - $(window).scrollTop(), 
						       left: cimg.offset().left,
						       opacity:  0.5,
						       'webkitFilter': 'contrast(150%)',
						       height: cimg.height(), 
						       width: cimg.width()})
					       .appendTo($('.item.active'))
					       .animate({opacity:  0 / data[current_id].count}, 500, function(){
						   });

					   /* window.timeouts.push(setTimeout(function(){
						        $(that).animate({opacity: 0}, function(){
								$(that).remove();
								finished.resolve();
							    });
							    },  1000));*/
					   finished.resolve();
					   }, i * 700));
			       });

			$.when.apply($, waitforfinish).done(function(){
				setTimeout(function(){
					$('.overlay').remove();
				    }, 1000);
				//				$('.item.active img').animate({opacity: 1});
				//				playavg();
			    });

		    });
	};

	$scope.$on('$routeChangeStart', function() {
		window.scrollCache = $(window).scrollTop();
	    });

	$scope.$on('$routeChangeSuccess', _.debounce(function() {
		    $(window).scrollTop(window.scrollCache)
		    ga("send", "event", "navigation","route", window.location.href);

		    var $routeParams = $route.current.pathParams;
		    setTimeout(function(){
			    parseXFBML();
			},500);

		    window.current_id = null;
		    updateTitle();
		    if ($routeParams.id) {
			stopavg();
			window.current_id = $routeParams.id;
			updateRating();
			ga("send", "event", "engagement", "avg_view", $routeParams.id, 1);
			setTimeout(function(){
				$('.modal').modal('show');
			    }, 0);
			$('.spinner').show();

			setTimeout(function(){ // this is when the dialog is finally shown
				
				if ($('.item.active img').attr('loaded') === 'true') {
				    $('.spinner').show();
				    setimgmaxheight($('.item.active img')[0]);
				    $('.spinner').hide();
				}

				if (!window.shownlike) {
				    window.poptimeout = setTimeout(function(){
					    window.shownlike = true;
					    $('.poply').popover('show');
					    setTimeout(function(){
						    $('.poply').popover('hide');
						}, 8000);
					}, 10000);
				}
			},2500);

			

			var isinscope = $scope.data && $scope.data[$routeParams.id.split('.')[0]];
			if (isinscope) {
			    $scope.imgfordialog = isinscope;
			    updateTitle();
			    $scope.$digest();
			}
			else {
			    gotdata.done(function(){
				    $scope.imgfordialog = $scope.data[$routeParams.id.split('.')[0]];
				    updateTitle();
				});
			}
			$scope.nogo = false;
		    }
		    else {
			hidemodal();
			$scope.nogo = true;
		    }
		
		},100));

	$scope.eq = function(a,b){
	    return a === b;
	};

	$scope.tweeturl = function(nodialog){
	    if (this.imgfordialog && !nodialog) {
		return "//platform.twitter.com/widgets/tweet_button.html?url=" + 
		encodeURIComponent(window.locationhref()) + "&text="
		+ encodeURIComponent(this.imgfordialog.name + ' ' + '#averagely');
	    }
	    else if (this.imgdata){
		return "//platform.twitter.com/widgets/tweet_button.html?url=" + 
		encodeURIComponent(window.locationhref() + '/img/' + this.imgdata.avgid) + "&text="
		+ encodeURIComponent(this.imgdata.name + ' ' + '#averagely');
	    }
	};

	$scope.likeurl = function(nodialog){
	    if (this.imgfordialog && !nodialog) {
		return encodeURIComponent(window.locationhref());
	    }
	    else if (this.imgdata){
		return encodeURIComponent(window.locationhref() + '/img/' + this.imgdata.avgid);
	    }
	    else {
		return "";
	    }
	};

	window.galleryRoot = $scope.galleryRoot = _.debounce(function(){
		window.clearTimeout(window.poptimeout);
		$scope.nogo = this.nogo = true;
		if (window.filter) {
		    $location.path('/' + $scope.$route.current.params.mode + '/filter/' + window.filter);
		}
		else {
		    $location.path('/' + $scope.$route.current.params.mode);
		}
		$scope.$apply();
	    },0);

	$scope.$window = window;
	$(document).on('click', '.modal-backdrop',function(){
		hidemodal();
		window.galleryRoot();
		//		window.history && window.history.pushState && window.history.pushState("", "", '/gallery');
	    });
	}]);

parseXFBML = function(){
    FBReady.done(function(){
	    $.post('https://graph.facebook.com/?id=' + 
		   encodeURIComponent(window.locationhref()) + '&scrape=true', function(){
		       FB && FB.XFBML && FB.XFBML.parse();  
		   })
	});

};

updateRating = function(id){
    id = id || window.current_id;
    $.get('/update/' + id, function(r){});
};

FBReady = $.Deferred();
onfbready = _.once(function(FB){
    // init the FB JS SDK
	

	FB.init({
	    appId      : '155233148006247',                        // App ID from the app dashboard
	    status     : true,                                 // Check Facebook Login status
	    xfbml      : true                                  // Look for social plugins on the page
	});

    FB.Event.subscribe('edge.create',
		       function(response) {
			   ga("send", "event", "social","like", response);
			   setTimeout(function(){
				   updateRating(window.current_id);
			       },1000);
		       });

    FB.Event.subscribe('comment.create',
		       function(response) {
			   ga("send", "event", "social","comment", response.commentID);
			   setTimeout(function(){
				   updateRating(window.current_id);
			       },1000);
		       });
	// Additional initialization code such as adding Event Listeners goes here
	FBReady.resolve();

    });

window.fbAsyncInit = function() {

    window.FB && onfbready(window.FB);
};

window.pollFBObj = setInterval(function(){
	if (window.FB && window.FB.init) {

	    clearInterval(window.pollFBObj);
	    window.FB && onfbready(window.FB);
	}
    },100);


$(function(){

	$("body").on("keydown", function (e) {
		if (e.keyCode === 39) {
		    $('.carousel-control.right').click();
		}
		if (e.keyCode === 37) {
		    $('.carousel-control.left').click();
		}
		if (e.keyCode === 27) {
		    hidemodal();
		    window.galleryRoot();
		}
	    });

	$(document).on('click', '.getit', function(e){
		ga("send", "event", "engagement", "gallery_click_on_tryit", "nothing");
	    });

	$(document).on('click', '.add-to-chrome', function(e){
		ga("send", "event", "engagement", "gallery_click_add_to_chrome", "nothing");
	    });

	$(document).on('click', '.img-link', function(e){
		var scope = angular.element(this).scope();
		if (scope) {
		    var id = scope.imgdata.avgid;
		    if (e.ctrlKey && e.shiftKey) {
			window.open('/viewer?q=' + id, '_blank');
			e.preventDefault();
			return false;
		    }
		}
	    });

	$(document).on('slid', '.carousel',function(){
		stopavg();

		var id = $("#myCarousel .active").attr('id');
		window.current_id = id;
		updateRating();

		id && window.history && window.history.pushState && window.history.pushState("", "", '/gallery/img/' + id);
		// $('.fb-like').attr('data-href', window.location.href);
		$('.fb-comments').attr('data-href', window.locationhref());
		
		parseXFBML();
		id && ga("send", "event", "engagement", "gallery_slid", id, 1);
		var scope = angular.element(this).scope();
		id && (scope.imgfordialog = scope.data[id.split('.')[0]]) && scope.$digest();

		$('.spinner').show();
		setimgmaxheight($('.item.active img')[0]);
		$('.spinner').hide();
		

		isLastInPage = false;
		var last_img_in_page = scope.origdata[(window.page - 1) * window.images_in_page - 1];
		last_img_in_page && (isLastInPage = (id === last_img_in_page.avgid));
		if (isLastInPage) {
		    loadmore();
		    setTimeout(function(){ 
			    // i know.. all these timeouts man.. 
			    // waiting for the loadmore to finish 
			    // to tell angular to digest the changes to the data
			    scope.$digest(); 
			},2000)
			}
		updateTitle();
	    });
    });

setimgmaxheight = function(img){
    var scope = angular.element(img).scope();
    if (scope && current_id !== scope.imgdata.avgid) {
	return;
    }
    var img = $(img);
    if (img.width() === 0) {
	setTimeout(function(){setimgmaxheight(img[0])}, 100);
	return;
    }

    var  maxheight = maxheight || ($('#myCarousel').height() - 20);
    var  maxwidth = maxwidth || ($('#myCarousel').width() - 5);
    var size = {w: img.width(), h: img.height()}
    var destwidth = (maxheight / size.h)  * size.w; // width if we go with max height
    var destheight = (maxwidth / size.w)  * size.h; // height if we go with max width



    if (destwidth > maxwidth) {
	// destwidth is too large so we go with maxwidth
	img.css({'width': maxwidth, height: destheight, "margin-top": (maxheight - destheight) / 2});
	
    }
    else {
	img.css({'height': maxheight, width: destwidth, "margin-top": 10});
    }

    img.css('visibility', 'visible'); 
    $('.spinner').hide();
};

$(window).on('resize', function(){
	setimgmaxheight($('.item.active img')[0]);
    });