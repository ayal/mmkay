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

DEFAULT_IMAGE_URL = "/static/icons/averagely_icon500_gutter2.png";

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
"/static/images/mks/itzchaky_avigdor.jpg",
"/static/images/mks/liberman_avigdor.jpg",
"/static/images/mks/Wortzman_Avi.jpg",
"/static/images/mks/dicter_abraham.jpg",
"/static/images/mks/braverman_avishay.jpg",
"/static/images/mks/sarsur_ibrahim.jpg",
"/static/images/mks/Avraham_Duan.jpg",
"/static/images/mks/michaeli_avraham.jpg",
"/static/images/mks/barak_ehud.jpg",
"/static/images/mks/akunis_ofir.jpg",
"/static/images/mks/pinespaz_ofir.jpg",
"/static/images/mks/Orbach_Uri.jpg",
"/static/images/mks/ariel_uriehuda-l.jpg",
"/static/images/mks/uri_maklev.jpg",
"/static/images/mks/Zuaretz_Orit.jpg",
"/static/images/mks/noked_orit.jpg",
"/static/images/mks/Strock_Orit.jpg",
"/static/images/mks/Levy_Orli.jpg",
"/static/images/mks/tibi_ahmed.jpg",
"/static/images/mks/kara_ayoob.jpg",
"/static/images/mks/Shaked_Ayelet.jpg",
"/static/images/mks/gilon_ilan.jpg",
"/static/images/mks/Shmuli_Itzik.jpg",
"/static/images/mks/cabel_eitan.jpg",
"/static/images/mks/Akram_Hasoon.jpg",
"/static/images/mks/aflalo_eli.jpg",
"/static/images/mks/BenDahan_Eliahu.jpg",
"/static/images/mks/yishai_eli.jpg",
"/static/images/mks/Miller_Alex.jpg",
"/static/images/mks/Stern_Eliezer.jpg",
"/static/images/mks/cohen_amnon.jpg",
"/static/images/mks/Michaeli_Anastassia.jpg",
"/static/images/mks/Margalit_Erel.jpg",
"/static/images/mks/atias_ariel.jpg",
"/static/images/mks/eldad_aryeh.jpg",
"/static/images/mks/Bibi_Arie.jpg",
"/static/images/mks/deri_aryeh.jpg",
"/static/images/mks/Jitas_Basil.jpg",
"/static/images/mks/Toporovsky_Boaz.jpg",
"/static/images/mks/netanyahu_bibi.jpg",
"/static/images/mks/beneliezer_binyamin.jpg",
"/static/images/mks/saar_gidon.jpg",
"/static/images/mks/ezra_gidon.jpg",
"/static/images/mks/gamliel_gila.jpg",
"/static/images/mks/erdan_gilad.jpg",
"/static/images/mks/zahalka_jamal.jpg",
"/static/images/mks/khenin_dov.jpg",
"/static/images/mks/Lipman_Dov.jpg",
"/static/images/mks/azoulay_david.jpg",
"/static/images/mks/Tzur_David.jpg",
"/static/images/mks/David_Rotem.jpg",
"/static/images/mks/avital_doron.jpg",
"/static/images/mks/itzik_dalia.jpg",
"/static/images/mks/meridor_dan.jpg",
"/static/images/mks/Ayalon_Daniel.jpg",
"/static/images/mks/Ben_Simon_Daniel.jpg",
"/static/images/mks/Hershkowitz_Daniel.jpg",
"/static/images/mks/danon_danny.jpg",
"/static/images/mks/elkin_zeev.jpg",
"/static/images/mks/boim_zev.jpg",
"/static/images/mks/Bielski_Zeev.jpg",
"/static/images/mks/begin_beni.jpg",
"/static/images/mks/orlev_zevulun.jpg",
"/static/images/mks/galon_zahava.jpg",
"/static/images/mks/oron_chaim.jpg",
"/static/images/mks/amsalem_haim.jpg",
"/static/images/mks/katz_haim.jpg",
"/static/images/mks/ramon_haim.jpg",
"/static/images/mks/Bar_Yechiel.jpg",
"/static/images/mks/Amar_Hamad.jpg",
"/static/images/mks/swaid_hana.jpg",
"/static/images/mks/Zuabi_Hanin.jpg",
"/static/images/mks/AbuArar_Talab.jpg",
"/static/images/mks/elsana_taleb.jpg",
"/static/images/mks/Lapid_Yair.jpg",
"/static/images/mks/Shamir_Yair.jpg",
"/static/images/mks/Yoav_Ben_Tzur.jpg",
"/static/images/mks/hasson_yoel.jpg",
"/static/images/mks/Rozbozov_Yoel.jpg",
"/static/images/mks/ZellnerYuval.jpg",
"/static/images/mks/steinitz_yuval.jpg",
"/static/images/mks/Plesner_yohanan.jpg",
"/static/images/mks/Shamalov_Berkovich_Yulia.jpg",
"/static/images/mks/edelstein_yoel.jpg",
"/static/images/mks/tamir_yuli.jpg",
"/static/images/mks/Chetboun_Yoni.jpg",
"/static/images/mks/Peled_Yossi.jpg",
"/static/images/mks/German_Yael.jpg",
"/static/images/mks/edri_yaakov.jpg",
"/static/images/mks/Asher_Yakov.jpg",
"/static/images/mks/Yaakov_Katzeleh_Katz.jpg",
"/static/images/mks/lizman_yaakov.jpg",
"/static/images/mks/margi_yaakov.jpg",
"/static/images/mks/Peri_Yaakov.jpg",
"/static/images/mks/Kariv_Yifat.jpg",
"/static/images/mks/aharonovitch_yitzhak.jpg",
"/static/images/mks/herzog_yitzhak.jpg",
"/static/images/mks/vaknin_yizhak.jpg",
"/static/images/mks/cohen_yitzhak.jpg",
"/static/images/mks/levin_yariv.jpg",
"/static/images/mks/eichler_israel.jpg",
"/static/images/mks/hasson_israel.jpg",
"/static/images/mks/katz_yisrael.jpg",
"/static/images/mks/Shama_Carmel.jpg",
"/static/images/mks/nass_lea.jpg",
"/static/images/mks/leon_litinetsky.jpg",
"/static/images/mks/shemtov_lia.jpg",
"/static/images/mks/livnat_limor.jpg",
"/static/images/mks/cohen_meir1.jpg",
"/static/images/mks/porush_meir.jpg",
"/static/images/mks/shitrit_meir.jpg",
"/static/images/mks/whbee_majalli.jpg",
"/static/images/mks/baraka_mohamed.jpg",
"/static/images/mks/eitan_michael.jpg",
"/static/images/mks/Ben_Ari_Michael.jpg",
"/static/images/mks/Biran_Michal.jpg",
"/static/images/mks/Rozin_Michal.jpg",
"/static/images/mks/Levy_Mickey.jpg",
"/static/images/mks/Rosenthal_Mickey.jpg",
"/static/images/mks/regev_miri.jpg",
"/static/images/mks/moses_menachem.jpg",
"/static/images/mks/Ganaim_Masud.jpg",
"/static/images/mks/Michaeli_Meirav.jpg",
"/static/images/mks/Yogev_Mordechai.jpg",
"/static/images/mks/gafni_moshe.jpg",
"/static/images/mks/Feiglin_Moshe.jpg",
"/static/images/mks/yaalon_moshe.jpg",
"/static/images/mks/cahlon_moshe.jpg",
"/static/images/mks/matalon_moshe_mutz.jpg",
"/static/images/mks/Mizrahi_Moshe.jpg",
"/static/images/mks/nahari_meshulam.jpg",
"/static/images/mks/vilnai_matan.jpg",
"/static/images/mks/nachman_shai.jpg",
"/static/images/mks/Nino_Abesadze.jpg",
"/static/images/mks/slomiansky_nisan.jpg",
"/static/images/mks/Horowitz_Nitzan.jpg",
"/static/images/mks/zeev_nissim.jpg",
"/static/images/mks/Bennett_Naftali.jpg",
"/static/images/mks/landver_sofa.jpg",
"/static/images/mks/miznikov_stas.jpg",
"/static/images/mks/shalom_silvan.jpg",
"/static/images/mks/naffa_said.jpg",
"/static/images/mks/Shafir_Stav.jpg",
"/static/images/mks/Kohl_Adi.jpg",
"/static/images/mks/landau_uzi.jpg",
"/static/images/mks/Einat_Wilf.jpg",
"/static/images/mks/Farij_Issawi.jpg",
"/static/images/mks/Lavie_Aliza.jpg",
"/static/images/mks/peretz_amir.jpg",
"/static/images/mks/BarLev_Omer.jpg",
"/static/images/mks/mitzna_amram.jpg",
"/static/images/mks/Agbaria_Afou.jpg",
"/static/images/mks/Shelach_Ofer.jpg",
"/static/images/mks/schneller_otniel.jpg",
"/static/images/mks/Kirshenbaum_Faina.jpg",
"/static/images/mks/Tamnuhata_Penina-s.jpg",
"/static/images/mks/hanegbi_tzahi.jpg",
"/static/images/mks/Pinyan_Zion.jpg",
"/static/images/mks/Hotovely_Tzipi.jpg",
"/static/images/mks/livnee_zipi.jpg",
"/static/images/mks/Alharar_Karin.jpg",
"/static/images/mks/rivlin_rubi.jpg",
"/static/images/mks/majadele_ralev.jpg",
"/static/images/mks/ilatov_robert.jpg",
"/static/images/mks/Tiviaev_Robert.jpg",
"/static/images/mks/avraham_ruhama.jpg",
"/static/images/mks/baron_roni.jpg",
"/static/images/mks/tirosh_ronit.jpg",
"/static/images/mks/Hoffman_Ronen.jpg",
"/static/images/mks/Calderon_Ruth.jpg",
"/static/images/mks/Adatto_Rachel.jpg",
"/static/images/mks/Frankel_Rena.jpg",
"/static/images/mks/mofaz_shaul.jpg",
"/static/images/mks/Moalem_Shuli.jpg",
"/static/images/mks/hermesh_shai.jpg",
"/static/images/mks/Piron_Shai.jpg",
"/static/images/mks/Shnaan_Shachiv.jpg",
"/static/images/mks/simhon_shalom.jpg",
"/static/images/mks/yacimovich_shelly.jpg",
"/static/images/mks/molla_shlomo.jpg",
"/static/images/mks/Ohayon_Shimon.jpg",
"/static/images/mks/Solomon_Shimon.jpg",
"/static/images/mks/Zandberg_Tamar.jpg"]
