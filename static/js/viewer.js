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

ROOT_URL = location.protocol + '//' + 'average.ly';

//----------------------------------------------------------------------------------

// Converts image to canvas; returns new canvas element
function image2canvas(image) {
    var canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d").drawImage(image, 0, 0);

    return canvas;
}
copy_canvas = image2canvas;

// Converts canvas to an image
function canvas2image(canvas, onload) {
    var image = new Image();
    if (onload != undefined)
        $(image).bind("load", onload);
    image.src = canvas.toDataURL("image/png");
    return image;
}

function circle_crop(canvas) {
    var w = canvas.width;
    var h = canvas.height;

    var out_canvas = document.createElement("canvas");
    out_canvas.width = w;
    out_canvas.height = h;

    var r = Math.min(w,h)/2;

    // based on http://blog.teamtreehouse.com/create-vector-masks-using-the-html5-canvas
    var ctx = out_canvas.getContext('2d');
    // Save the state, so we can undo the clipping
    ctx.save();
    // fill with transparency
    ctx.fillStyle="#FFFFFFFF";
    ctx.fill();
    // Create a circle
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, r, 0, Math.PI * 2, false);
    // Clip to the current path
    ctx.clip();
    // draw image
    ctx.drawImage(canvas, 0, 0);
    // Undo the clipping
    ctx.restore();

    return out_canvas;
}

/// helper methods for web based viewer/editor
function getParameterByName( name ){
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    var regexS = "[\\?&]"+name+"=([^&#]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( results == null )
	return "";
    else
	return decodeURIComponent(results[1].replace(/\+/g, " "));
};

function load_image(url, onload) {
    var image = new Image();
    if (onload != undefined)
        $(image).bind("load", onload);
    $(image).css({'position': 'absolute', 'left': '-10000px'}).appendTo("body");
    image.src = url;
    return image;
};


window.search = function(theimages) {
    load_image(theimages[iii], function(){
	window.avg.add(this);
	window.scope.refresh();
    });

    if (theimages[iii + 1]) {
	setTimeout(function(){
	    iii++;
	    window.search(theimages);
	},1000);
    }

};

var iii = 0;
/*setTimeout(function(){
  window.search();
  },3000);*/



// end of helper methods

DEFAULT_IMAGE_URL = "/mmkay/static/icons/averagely_icon500_gutter2.png";

GA_page("/web-ext/viewer");
var app = angular.module('averagely', []);

var guid = function (separator) {
    var delim = separator || "-";

    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
};

window.avg = new Average_LAB("LAB");
window.avg.adjustments['contrast'].v = 32;

app.controller('MainControl', ['$scope', function($scope) {



    $scope.avg = window.avg;
    window.scope = $scope;

    $scope.mks = {
	loadparty: function(p){

    window.avg.L = new Int32Array(CACHED_IMAGE_SIZE);
    window.avg.A = new Int32Array(CACHED_IMAGE_SIZE);
    window.avg.B = new Int32Array(CACHED_IMAGE_SIZE);
    window.avg.length = CACHED_IMAGE_SIZE;
    window.avg.count = 0;
    window.avg.width_sum = 0;
    window.avg.height_sum = 0;
    window.avg.images = [];
    // url > image cache
    window.avg.url_to_image = {};

    // rendering cache
    window.avg._render_cache = [null,null,null];


	    window.avg.images = [];
	    iii = 0;
	    window.search(_.map($scope.mks.parties[p], function(x){return x.img.replace(/http...www.knesset.gov.il.mk.images.members./gim,'/mmkay/static/images/mks/').replace(/-s/gim,'')}));
	}};

    $scope.mks.parties = _.union(_.groupBy(allimages,'p'), _.groupBy(allimages, 'g'));
    

    $scope.isChrome = isChrome;
    $scope.recalc = function(){
	$('#spinner').show();
	window.search($scope.idea);
    };

    try {
        $scope.author = localStorage.getItem('averagely_author_name');
        $scope.email = localStorage.getItem('averagely_author_email');
    }
    catch(ex) {
    }
    // help functions

    calcimgheight = function() {
        console.log('resizing image');
        if ($('#post-processing').css('display') === 'none') {
            setimgmaxheight();
        }
        else {
            setTimeout(function(){ // waiting for adjust resize to happen because we rely on the size of the adjust panel
                setimgmaxheight($('#main').height() - $('#post-processing').height() -
				$('#results .row-fluid').height() - $('.download-bar').height()- 20);
            }, 300);
        }
    };

    $(window).on('resize', _.debounce(function(){
        calcimgheight();
    }, 100));

    (setimgmaxheight = function(maxheight, maxwidth){
        var  maxheight = maxheight || ($('#main').height() - 
				       $('#results .row-fluid').height() -  $('.download-bar').height()- 20);

        var  maxwidth = maxwidth || ($('#main').width() - 10);

        var destwidth = (maxheight / $scope.avg.size()[1])  * $scope.avg.size()[0]; // width if we go with max height
        var destheight = (maxwidth / $scope.avg.size()[0])  * $scope.avg.size()[1]; // height if we go with max width
        if (destwidth > maxwidth) {
            // destwidth is too large so we go with maxwidth
            $('#image').animate({'width': maxwidth, height: destheight});

        }
        else {
            $('#image').animate({'height': maxheight, width: destwidth});
        }

    })();

    $scope.log = function(x){
        console.log(x);
    };

    // end help functions

    $scope.histo = {doit: false};

    $scope.focusTitle = function() {
        _.delay(function(){$('#inputTitle').focus()}, 1000);
    };

    $scope.refresh = function(){
        // put loading overlay
        //$('.loading-overlay').show();
        $('#spinner').show();
        $scope.avg.render(function(canvas) {
            if ($scope.histo.doit) {
                canvas = $(canvas).pixastic("histogram", {average:false,paint:true,color:"rgba(255,255,255,0.5)",returnValue:{}, "leaveDOM":true})[0];
            }

            if (canvas) {
                $scope.url = canvas.toDataURL('image/png');
            }
            else {
                $scope.url = DEFAULT_IMAGE_URL;
            }

            $scope.$safe_apply();
            calcimgheight();
            //$('.loading-overlay').hide();
            $('#spinner').hide();
	    document.title = 'Averagely (' + $scope.avg.count + ')';
        });
    };

    $scope.$safe_apply = _.debounce($scope.$apply, 100);

    /*(    chrome.extension.onRequest.addListener(
      function(request, sender, sendResponse) {
      console.log('request', request);
      if (request.refresh) {
      $scope.refresh();
      }
      return 1;
      });*/

    $scope.bouncy_refresh = _.debounce($scope.refresh, 1000);
    $scope.editing = false;
    $scope.url = DEFAULT_IMAGE_URL;

    $scope.root = ROOT_URL;

    $scope.publish = function(){
        $('#publish-btn').addClass('disabled');

        localStorage.setItem('averagely_author_name', $scope.author);
        localStorage.setItem('averagely_author_email', $scope.email);

        try {
            GA_Event('click-publish', $scope.title + ' by ' + $scope.author, $scope.avg.images.length);

            $('#pub-spinner').show();
            var urls = _.without(_.map($scope.avg.images, function(x) {
		return !x.muted && x.url;
	    }), false);

            var thumb_b64_list = _.without(_.map($scope.avg.images, function(x){
		return !x.muted && x.thumbnail.src;
	    }), false);

            var meta_data = { "name": $scope.title,
			      "count": urls.length,
			      "artist": $scope.author,
			      "email": $scope.email,
			      "tags": $('[name=hidden-tags]').val().split(','),
                              "urls": urls,
			      "adjustments": angular.copy($scope.avg.adjustments),
                              "filter": $scope.avg.current_filter && $scope.avg.current_filter.name};
	    
            $.post(ROOT_URL + '/publish', 
		   {"image": $scope.url, 
		    "client_version": '0.0.0.256',
		    "thumbnails": JSON.stringify(thumb_b64_list),
		    "meta_data": JSON.stringify(meta_data)},
		   function(r){
		       $('#publish-btn').removeClass('disabled');
		       GA_Event('publish-success', $scope.root + '/gallery/img/' + r, $scope.avg.images.length);
		       
		       $('.modal').modal('hide');
		       $('#pub-spinner').hide();
		       console.log('publish says: ', r);
		       location.href = 'http://average.ly/gallery/img/' + r.split('.')[0] + '#new';
		       
		   }).fail(function(r, _, e) {
		       $('#publish-btn').removeClass('disabled');
		       $('#pub-spinner').hide();
		       GA_Event('publish-fail', r.responseText);
		       alert('ERROR!!! :(:(:(\n\n\n' + r.responseText);
		   });
        }
        catch (ex) {
            GA_Event('publish-fail', ex.message);
            $('#publish-btn').removeClass('disabled');
            $('#pub-spinner').hide();
            alert('ERROR!!! :(:(:(\n\n\n' + JSON.stringify(ex));
        }
    };

    
    $scope.toggle_mute = function() {
        this.iia.muted ? $scope.avg.unmute(this.iia) : $scope.avg.mute(this.iia);
        $scope.ui.render(true);
    };

    $scope.not = function(p){
        return !p;
    };

    $scope.eq = function(a,b){
        return a === b;
    };

    $scope.refresh();
}]);


var overlaycache = {};

$(function(){
    $(document).on('mouseover', '#thumbnails .thumbnail img', function(){
	return; // disable this feature in web interface (proxy is heavy and the is no cache now)
        var img = $('#results img');
        tpos = img.offset();
        var url = angular.element(this).scope().iia.url;
        if (!overlaycache[url]) {
            overlaycache[url] = $('<img />').attr('src', url)
                .width(img.width())
                .height(img.height())
                .css({opacity:0.3,'position':'absolute','top': tpos.top, 'left': tpos.left});
        }

        overlaycache[url].appendTo('body');

    }).on('mouseleave', '#thumbnails .thumbnail img', function(){
        var img = $('#results img');
        tpos = img.offset();
        var url = angular.element(this).scope().iia.url;
        if (overlaycache[url]) {
            overlaycache[url].remove();
            delete overlaycache[url];
        }
    }).on('click', '.trash', function(){
        if (confirm('Are you sure ??')) {
            GA_Event('click-trash');
            window.location.href = '/viewer';
        }
    }).on('click', '#adjust', function(){
        calcimgheight();
    }).on('click', '.add-to-chrome', function(){
	GA_Event('click-add-to-chrome');
    });


    /*    document.addEventListener('click', function(e){
	  if (e.target.name === 'tags') { // force tags focus
	  $(e.target).focus();
	  e.stopPropagation();
	  return false;
	  }
	  });*/

    $('input[name="tags"]').focus(function(e){
	var that = this;
	if (  this.force_focused) {
	    return false;
	}
	this.force_focused = true;
	setTimeout(function(){
	    that.force_focused = false;
	},2000)
	$(this).focus();
	e.stopPropagation();
	return false;
    }).click(function(){
	$(this).focus();
    });


});



/* hoho  */

allimages = [{"img":"http://www.knesset.gov.il/mk/images/members/itzchaky_avigdor-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/liberman_avigdor-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Wortzman_Avi-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/dicter_abraham-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/braverman_avishay-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/sarsur_ibrahim-s.jpg","g":"זכר","p":" רע”מ-תע”ל"},{"img":"http://www.knesset.gov.il/mk/images/members/Avraham_Duan-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/michaeli_avraham-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/barak_ehud-s.jpg","g":"זכר","p":"העצמאות"},{"img":"http://www.knesset.gov.il/mk/images/members/akunis_ofir-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/pinespaz_ofir-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Orbach_Uri-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/ariel_uri-yehuda-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/uri_maklev-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/Zuaretz_Orit-s.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/noked_orit-s.jpg","g":"נקבה","p":"העצמאות"},{"img":"http://www.knesset.gov.il/mk/images/members/Strock_Orit-s.jpg","g":"נקבה","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/Levy_Orli-s.jpg","g":"נקבה","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/tibi_ahmed-s.jpg","g":"זכר","p":" רע”מ-תע”ל"},{"img":"http://www.knesset.gov.il/mk/images/members/kara_ayoob-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Shaked_Ayelet-s.jpg","g":"נקבה","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/gilon_ilan-s.jpg","g":"זכר","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/Shmuli_Itzik-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/cabel_eitan-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Akram_Hasoon-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/aflalo_eli-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/BenDahan_Eliahu-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/yishai_eli-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Miller_Alex-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Stern_Eliezer-s.jpg","g":"זכר","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/cohen_amnon-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Michaeli_Anastassia-s.jpg","g":"נקבה","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Margalit_Erel-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/atias_ariel-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/eldad_aryeh-s.jpg","g":"זכר","p":"האיחוד הלאומי"},{"img":"http://www.knesset.gov.il/mk/images/members/Bibi_Arie-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/deri_aryeh-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Jitas_Basil-s.jpg","g":"זכר","p":"ברית לאומית דמוקרטית"},{"img":"http://www.knesset.gov.il/mk/images/members/Toporovsky_Boaz-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/netanyahu_bibi-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/beneliezer_binyamin-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/saar_gidon-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/ezra_gidon-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/gamliel_gila-s.jpg","g":"נקבה","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/erdan_gilad-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/zahalka_jamal-s.jpg","g":"זכר","p":"ברית לאומית דמוקרטית"},{"img":"http://www.knesset.gov.il/mk/images/members/khenin_dov-s.jpg","g":"זכר","p":"חזית דמוקרטית לשלום ושוויון"},{"img":"http://www.knesset.gov.il/mk/images/members/Lipman_Dov-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/azoulay_david-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Tzur_David-s.jpg","g":"זכר","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/David_Rotem-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/avital_doron-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/itzik_dalia-s.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/meridor_dan-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Ayalon_Daniel-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Ben_Simon_Daniel-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Hershkowitz_Daniel-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/danon_danny-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/elkin_zeev-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/boim_zev-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Bielski_Zeev-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/begin_beni-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/orlev_zevulun-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://s24.postimg.org/l7xicp3td/image.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/galon_zahava-s.jpg","g":"נקבה","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/oron_chaim-s.jpg","g":"זכר","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/amsalem_haim-s.jpg","g":"זכר","p":"ש\"ס"},{"img":"http://www.knesset.gov.il/mk/images/members/katz_haim-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/ramon_haim-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Bar_Yechiel-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Amar_Hamad-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/swaid_hana-s.jpg","g":"זכר","p":"חזית דמוקרטית לשלום ושוויון"},{"img":"http://www.knesset.gov.il/mk/images/members/Zuabi_Hanin-s.jpg","g":"נקבה","p":"ברית לאומית דמוקרטית"},{"img":"http://www.knesset.gov.il/mk/images/members/AbuArar_Talab-s.jpg","g":"זכר","p":" רע”מ-תע”ל"},{"img":"http://www.knesset.gov.il/mk/images/members/elsana_taleb-s.jpg","g":"זכר","p":"רע\"מ-תע\"ל"},{"img":"http://www.knesset.gov.il/mk/images/members/Lapid_Yair-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/Shamir_Yair-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Yoav_Ben_Tzur.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/hasson_yoel-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Rozbozov_Yoel-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/ZellnerYuval.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/steinitz_yuval-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Plesner_yohanan-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Shamalov_Berkovich_Yulia-s.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/edelstein_yoel-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/tamir_yuli-s.jpg","g":"נקבה","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Chetboun_Yoni-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/Peled_Yossi-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/German_Yael-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/edri_yaakov-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Asher_Yakov-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/Yaakov_Katzeleh_Katz-s.jpg","g":"זכר","p":"האיחוד הלאומי"},{"img":"http://www.knesset.gov.il/mk/images/members/lizman_yaakov-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/margi_yaakov-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Peri_Yaakov-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/Kariv_Yifat-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/aharonovitch_yitzhak-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/herzog_yitzhak-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/vaknin_yizhak-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/cohen_yitzhak-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/levin_yariv-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/eichler_israel-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/hasson_israel-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/katz_yisrael-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Shama_Carmel-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/nass_lea-s.jpg","g":"נקבה","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/leon_litinetsky-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/shemtov_lia-s.jpg","g":"נקבה","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/livnat_limor-s.jpg","g":"נקבה","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/cohen_meir1-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/porush_meir-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/shitrit_meir-s.jpg","g":"זכר","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/whbee_majalli-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/baraka_mohamed-s.jpg","g":"זכר","p":"חזית דמוקרטית לשלום ושוויון"},{"img":"http://www.knesset.gov.il/mk/images/members/eitan_michael-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Ben_Ari_Michael-s.jpg","g":"זכר","p":"האיחוד הלאומי"},{"img":"http://www.knesset.gov.il/mk/images/members/Biran_Michal-s.jpg","g":"נקבה","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Rozin_Michal-s.jpg","g":"נקבה","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/Levy_Mickey-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/Rosenthal_Mickey-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/regev_miri-s.jpg","g":"נקבה","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/moses_menachem-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/Ganaim_Masud-s.jpg","g":"זכר","p":" רע”מ-תע”ל"},{"img":"http://www.knesset.gov.il/mk/images/members/Michaeli_Meirav-s.jpg","g":"נקבה","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Yogev_Mordechai-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://oknesset.org/static/img/mks/marina-solodkin.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/gafni_moshe-s.jpg","g":"זכר","p":"יהדות התורה"},{"img":"http://www.knesset.gov.il/mk/images/members/Feiglin_Moshe-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/yaalon_moshe-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/cahlon_moshe-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/matalon_moshe_mutz-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Mizrahi_Moshe-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/nahari_meshulam-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/vilnai_matan-s.jpg","g":"זכר","p":"העצמאות"},{"img":"http://www.knesset.gov.il/mk/images/members/nachman_shai-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Nino_Abesadze-s.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/slomiansky_nisan-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/Horowitz_Nitzan-s.jpg","g":"זכר","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/zeev_nissim-s.jpg","g":"זכר","p":"ש”ס"},{"img":"http://www.knesset.gov.il/mk/images/members/Bennett_Naftali-s.jpg","g":"זכר","p":"הבית היהודי"},{"img":"http://www.knesset.gov.il/mk/images/members/landver_sofa-s.jpg","g":"נקבה","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/miznikov_stas-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/shalom_silvan-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/naffa_said-s.jpg","g":"זכר","p":"בל\"ד"},{"img":"http://www.knesset.gov.il/mk/images/members/Shafir_Stav-s.jpg","g":"נקבה","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/Kohl_Adi-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/landau_uzi-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Einat_Wilf-s.jpg","g":"נקבה","p":"העצמאות"},{"img":"http://www.knesset.gov.il/mk/images/members/Farij_Issawi-s.jpg","g":"זכר","p":"מרצ"},{"img":"http://www.knesset.gov.il/mk/images/members/Lavie_Aliza-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/peretz_amir-s.jpg","g":"זכר","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/BarLev_Omer-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/mitzna_amram-s.jpg","g":"זכר","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/Agbaria_Afou-s.jpg","g":"זכר","p":"חזית דמוקרטית לשלום ושוויון"},{"img":"http://www.knesset.gov.il/mk/images/members/Shelach_Ofer-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/schneller_otniel-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Kirshenbaum_Faina-s.jpg","g":"נקבה","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Tamnu-Shata_Penina-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/hanegbi_tzahi-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Pinyan_Zion-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/Hotovely_Tzipi-s.jpg","g":"נקבה","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/livnee_zipi-s.jpg","g":"נקבה","p":"התנועה"},{"img":"http://www.knesset.gov.il/mk/images/members/Alharar_Karin-s.jpg","g":"נקבה","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/rivlin_rubi-s.jpg","g":"זכר","p":"הליכוד"},{"img":"http://www.knesset.gov.il/mk/images/members/majadele_ralev-s.jpg","g":"זכר","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/ilatov_robert-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Tiviaev_Robert-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/avraham_ruhama-s.jpg","g":"נקבה","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/baron_roni-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/simhon_shalom-s.jpg","g":"זכר","p":"העצמאות"},{"img":"http://www.knesset.gov.il/mk/images/members/yacimovich_shelly-s.jpg","g":"נקבה","p":"העבודה"},{"img":"http://www.knesset.gov.il/mk/images/members/molla_shlomo-s.jpg","g":"זכר","p":"קדימה"},{"img":"http://www.knesset.gov.il/mk/images/members/Ohayon_Shimon-s.jpg","g":"זכר","p":"ישראל ביתנו"},{"img":"http://www.knesset.gov.il/mk/images/members/Solomon_Shimon-s.jpg","g":"זכר","p":"יש עתיד"},{"img":"http://www.knesset.gov.il/mk/images/members/Zandberg_Tamar-s.jpg","g":"נקבה","p":"מרצ"}]
