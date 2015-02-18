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


window.search = function(q) {
    load_image(allimages[iii], function(){
	window.avg.add(this);
	window.scope.refresh();
    });

    setTimeout(function(){
	iii++;
	window.search();
    },1000);

};

var iii = 0;
setTimeout(function(){
    window.search();
},3000);



$(function() {
	$('#spinner').show();
	$.get('/datumjson?_=' + (new Date()).getTime()).
	    done(function(data, status, headers, config) {
		    window.data = JSON.parse(data);
		    var fake_avg = null;
		    _.each(window.data, function(d){
			    if (d.avgid === getParameterByName('q')){
				fake_avg = d;
			    }
			});

		    if (fake_avg) {
			window.avg.adjustments = fake_avg.adjustments;
			window.avg.current_filter = fake_avg.filter ? {name: fake_avg.filter,  title: fake_avg.filter} : null;
			_.each(fake_avg.urls, function(x){
				// protect from crazy proxy redirection
				var url = x.indexOf('/proxy/?q=') === -1 ? '/proxy/?q=' + encodeURIComponent(x) : x;
				load_image(url, function(){
					window.avg.add(this);
					window.scope.bouncy_refresh();
				    });
			    });
		    }
		    else {
			var q = getParameterByName('q');
			if (!q) {
			    $('#spinner').hide();
			    return;
			}
			window.search(q);
		    }
		});
    })
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
    jQuery(".tm-input").tagsManager({
        typeahead: true,
        typeaheadAjaxSource: '/tags',
        typeaheadAjaxPolling: false
    });
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


allimages = [
"/mmkay/static/images/mks/itzchaky_avigdor.jpg",
"/mmkay/static/images/mks/liberman_avigdor.jpg",
"/mmkay/static/images/mks/Wortzman_Avi.jpg",
"/mmkay/static/images/mks/dicter_abraham.jpg",
"/mmkay/static/images/mks/braverman_avishay.jpg",
"/mmkay/static/images/mks/sarsur_ibrahim.jpg",
"/mmkay/static/images/mks/Avraham_Duan.jpg",
"/mmkay/static/images/mks/michaeli_avraham.jpg",
"/mmkay/static/images/mks/barak_ehud.jpg",
"/mmkay/static/images/mks/akunis_ofir.jpg",
"/mmkay/static/images/mks/pinespaz_ofir.jpg",
"/mmkay/static/images/mks/Orbach_Uri.jpg",
"/mmkay/static/images/mks/ariel_uriehuda-l.jpg",
"/mmkay/static/images/mks/uri_maklev.jpg",
"/mmkay/static/images/mks/Zuaretz_Orit.jpg",
"/mmkay/static/images/mks/noked_orit.jpg",
"/mmkay/static/images/mks/Strock_Orit.jpg",
"/mmkay/static/images/mks/Levy_Orli.jpg",
"/mmkay/static/images/mks/tibi_ahmed.jpg",
"/mmkay/static/images/mks/kara_ayoob.jpg",
"/mmkay/static/images/mks/Shaked_Ayelet.jpg",
"/mmkay/static/images/mks/gilon_ilan.jpg",
"/mmkay/static/images/mks/Shmuli_Itzik.jpg",
"/mmkay/static/images/mks/cabel_eitan.jpg",
"/mmkay/static/images/mks/Akram_Hasoon.jpg",
"/mmkay/static/images/mks/aflalo_eli.jpg",
"/mmkay/static/images/mks/BenDahan_Eliahu.jpg",
"/mmkay/static/images/mks/yishai_eli.jpg",
"/mmkay/static/images/mks/Miller_Alex.jpg",
"/mmkay/static/images/mks/Stern_Eliezer.jpg",
"/mmkay/static/images/mks/cohen_amnon.jpg",
"/mmkay/static/images/mks/Michaeli_Anastassia.jpg",
"/mmkay/static/images/mks/Margalit_Erel.jpg",
"/mmkay/static/images/mks/atias_ariel.jpg",
"/mmkay/static/images/mks/eldad_aryeh.jpg",
"/mmkay/static/images/mks/Bibi_Arie.jpg",
"/mmkay/static/images/mks/deri_aryeh.jpg",
"/mmkay/static/images/mks/Jitas_Basil.jpg",
"/mmkay/static/images/mks/Toporovsky_Boaz.jpg",
"/mmkay/static/images/mks/netanyahu_bibi.jpg",
"/mmkay/static/images/mks/beneliezer_binyamin.jpg",
"/mmkay/static/images/mks/saar_gidon.jpg",
"/mmkay/static/images/mks/ezra_gidon.jpg",
"/mmkay/static/images/mks/gamliel_gila.jpg",
"/mmkay/static/images/mks/erdan_gilad.jpg",
"/mmkay/static/images/mks/zahalka_jamal.jpg",
"/mmkay/static/images/mks/khenin_dov.jpg",
"/mmkay/static/images/mks/Lipman_Dov.jpg",
"/mmkay/static/images/mks/azoulay_david.jpg",
"/mmkay/static/images/mks/Tzur_David.jpg",
"/mmkay/static/images/mks/David_Rotem.jpg",
"/mmkay/static/images/mks/avital_doron.jpg",
"/mmkay/static/images/mks/itzik_dalia.jpg",
"/mmkay/static/images/mks/meridor_dan.jpg",
"/mmkay/static/images/mks/Ayalon_Daniel.jpg",
"/mmkay/static/images/mks/Ben_Simon_Daniel.jpg",
"/mmkay/static/images/mks/Hershkowitz_Daniel.jpg",
"/mmkay/static/images/mks/danon_danny.jpg",
"/mmkay/static/images/mks/elkin_zeev.jpg",
"/mmkay/static/images/mks/boim_zev.jpg",
"/mmkay/static/images/mks/Bielski_Zeev.jpg",
"/mmkay/static/images/mks/begin_beni.jpg",
"/mmkay/static/images/mks/orlev_zevulun.jpg",
"/mmkay/static/images/mks/galon_zahava.jpg",
"/mmkay/static/images/mks/oron_chaim.jpg",
"/mmkay/static/images/mks/amsalem_haim.jpg",
"/mmkay/static/images/mks/katz_haim.jpg",
"/mmkay/static/images/mks/ramon_haim.jpg",
"/mmkay/static/images/mks/Bar_Yechiel.jpg",
"/mmkay/static/images/mks/Amar_Hamad.jpg",
"/mmkay/static/images/mks/swaid_hana.jpg",
"/mmkay/static/images/mks/Zuabi_Hanin.jpg",
"/mmkay/static/images/mks/AbuArar_Talab.jpg",
"/mmkay/static/images/mks/elsana_taleb.jpg",
"/mmkay/static/images/mks/Lapid_Yair.jpg",
"/mmkay/static/images/mks/Shamir_Yair.jpg",
"/mmkay/static/images/mks/Yoav_Ben_Tzur.jpg",
"/mmkay/static/images/mks/hasson_yoel.jpg",
"/mmkay/static/images/mks/Rozbozov_Yoel.jpg",
"/mmkay/static/images/mks/ZellnerYuval.jpg",
"/mmkay/static/images/mks/steinitz_yuval.jpg",
"/mmkay/static/images/mks/Plesner_yohanan.jpg",
"/mmkay/static/images/mks/Shamalov_Berkovich_Yulia.jpg",
"/mmkay/static/images/mks/edelstein_yoel.jpg",
"/mmkay/static/images/mks/tamir_yuli.jpg",
"/mmkay/static/images/mks/Chetboun_Yoni.jpg",
"/mmkay/static/images/mks/Peled_Yossi.jpg",
"/mmkay/static/images/mks/German_Yael.jpg",
"/mmkay/static/images/mks/edri_yaakov.jpg",
"/mmkay/static/images/mks/Asher_Yakov.jpg",
"/mmkay/static/images/mks/Yaakov_Katzeleh_Katz.jpg",
"/mmkay/static/images/mks/lizman_yaakov.jpg",
"/mmkay/static/images/mks/margi_yaakov.jpg",
"/mmkay/static/images/mks/Peri_Yaakov.jpg",
"/mmkay/static/images/mks/Kariv_Yifat.jpg",
"/mmkay/static/images/mks/aharonovitch_yitzhak.jpg",
"/mmkay/static/images/mks/herzog_yitzhak.jpg",
"/mmkay/static/images/mks/vaknin_yizhak.jpg",
"/mmkay/static/images/mks/cohen_yitzhak.jpg",
"/mmkay/static/images/mks/levin_yariv.jpg",
"/mmkay/static/images/mks/eichler_israel.jpg",
"/mmkay/static/images/mks/hasson_israel.jpg",
"/mmkay/static/images/mks/katz_yisrael.jpg",
"/mmkay/static/images/mks/Shama_Carmel.jpg",
"/mmkay/static/images/mks/nass_lea.jpg",
"/mmkay/static/images/mks/leon_litinetsky.jpg",
"/mmkay/static/images/mks/shemtov_lia.jpg",
"/mmkay/static/images/mks/livnat_limor.jpg",
"/mmkay/static/images/mks/cohen_meir1.jpg",
"/mmkay/static/images/mks/porush_meir.jpg",
"/mmkay/static/images/mks/shitrit_meir.jpg",
"/mmkay/static/images/mks/whbee_majalli.jpg",
"/mmkay/static/images/mks/baraka_mohamed.jpg",
"/mmkay/static/images/mks/eitan_michael.jpg",
"/mmkay/static/images/mks/Ben_Ari_Michael.jpg",
"/mmkay/static/images/mks/Biran_Michal.jpg",
"/mmkay/static/images/mks/Rozin_Michal.jpg",
"/mmkay/static/images/mks/Levy_Mickey.jpg",
"/mmkay/static/images/mks/Rosenthal_Mickey.jpg",
"/mmkay/static/images/mks/regev_miri.jpg",
"/mmkay/static/images/mks/moses_menachem.jpg",
"/mmkay/static/images/mks/Ganaim_Masud.jpg",
"/mmkay/static/images/mks/Michaeli_Meirav.jpg",
"/mmkay/static/images/mks/Yogev_Mordechai.jpg",
"/mmkay/static/images/mks/gafni_moshe.jpg",
"/mmkay/static/images/mks/Feiglin_Moshe.jpg",
"/mmkay/static/images/mks/yaalon_moshe.jpg",
"/mmkay/static/images/mks/cahlon_moshe.jpg",
"/mmkay/static/images/mks/matalon_moshe_mutz.jpg",
"/mmkay/static/images/mks/Mizrahi_Moshe.jpg",
"/mmkay/static/images/mks/nahari_meshulam.jpg",
"/mmkay/static/images/mks/vilnai_matan.jpg",
"/mmkay/static/images/mks/nachman_shai.jpg",
"/mmkay/static/images/mks/Nino_Abesadze.jpg",
"/mmkay/static/images/mks/slomiansky_nisan.jpg",
"/mmkay/static/images/mks/Horowitz_Nitzan.jpg",
"/mmkay/static/images/mks/zeev_nissim.jpg",
"/mmkay/static/images/mks/Bennett_Naftali.jpg",
"/mmkay/static/images/mks/landver_sofa.jpg",
"/mmkay/static/images/mks/miznikov_stas.jpg",
"/mmkay/static/images/mks/shalom_silvan.jpg",
"/mmkay/static/images/mks/naffa_said.jpg",
"/mmkay/static/images/mks/Shafir_Stav.jpg",
"/mmkay/static/images/mks/Kohl_Adi.jpg",
"/mmkay/static/images/mks/landau_uzi.jpg",
"/mmkay/static/images/mks/Einat_Wilf.jpg",
"/mmkay/static/images/mks/Farij_Issawi.jpg",
"/mmkay/static/images/mks/Lavie_Aliza.jpg",
"/mmkay/static/images/mks/peretz_amir.jpg",
"/mmkay/static/images/mks/BarLev_Omer.jpg",
"/mmkay/static/images/mks/mitzna_amram.jpg",
"/mmkay/static/images/mks/Agbaria_Afou.jpg",
"/mmkay/static/images/mks/Shelach_Ofer.jpg",
"/mmkay/static/images/mks/schneller_otniel.jpg",
"/mmkay/static/images/mks/Kirshenbaum_Faina.jpg",
"/mmkay/static/images/mks/Tamnuhata_Penina-s.jpg",
"/mmkay/static/images/mks/hanegbi_tzahi.jpg",
"/mmkay/static/images/mks/Pinyan_Zion.jpg",
"/mmkay/static/images/mks/Hotovely_Tzipi.jpg",
"/mmkay/static/images/mks/livnee_zipi.jpg",
"/mmkay/static/images/mks/Alharar_Karin.jpg",
"/mmkay/static/images/mks/rivlin_rubi.jpg",
"/mmkay/static/images/mks/majadele_ralev.jpg",
"/mmkay/static/images/mks/ilatov_robert.jpg",
"/mmkay/static/images/mks/Tiviaev_Robert.jpg",
"/mmkay/static/images/mks/avraham_ruhama.jpg",
"/mmkay/static/images/mks/baron_roni.jpg",
"/mmkay/static/images/mks/tirosh_ronit.jpg",
"/mmkay/static/images/mks/Hoffman_Ronen.jpg",
"/mmkay/static/images/mks/Calderon_Ruth.jpg",
"/mmkay/static/images/mks/Adatto_Rachel.jpg",
"/mmkay/static/images/mks/Frankel_Rena.jpg",
"/mmkay/static/images/mks/mofaz_shaul.jpg",
"/mmkay/static/images/mks/Moalem_Shuli.jpg",
"/mmkay/static/images/mks/hermesh_shai.jpg",
"/mmkay/static/images/mks/Piron_Shai.jpg",
"/mmkay/static/images/mks/Shnaan_Shachiv.jpg",
"/mmkay/static/images/mks/simhon_shalom.jpg",
"/mmkay/static/images/mks/yacimovich_shelly.jpg",
"/mmkay/static/images/mks/molla_shlomo.jpg",
"/mmkay/static/images/mks/Ohayon_Shimon.jpg",
"/mmkay/static/images/mks/Solomon_Shimon.jpg",
"/mmkay/static/images/mks/Zandberg_Tamar.jpg"]
