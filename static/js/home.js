var SLIDESHOW_DEFER = 500;     // before starting slideshow
var SLIDESHOW_FADE = 1000;     // between pictures
var SLIDESHOW_DELAY = 1000*13; // time for each picture

var BACKGROUNDS = _.shuffle([
    //{ src:"/static/backgrounds/bakst_34costumes_hq_conc.png", fade:SLIDESHOW_FADE },
    /*{ src:"/static/backgrounds/de_kooning_9portraits_clarity.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/hodler_17modern_hazy.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/manet_14portraits_conc.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/manet10_clarity.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/rousseau_jungle_clarity.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/manet_14portraits_conc.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/toulouse-lautrec11_conc.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/renoir_10later_conc.png", fade:SLIDESHOW_FADE }, */
    { src:"/static/backgrounds/serebriakova_40nudes_hq_conc3.png", fade:SLIDESHOW_FADE },
    { src:"/static/backgrounds/hopper_20cityscapes_hq_clar.png", fade:SLIDESHOW_FADE }
]);

//----------------------------------------------------------------------------------

function start_slideshow() {
    $.vegas('slideshow', {
        delay: SLIDESHOW_DELAY,
        backgrounds: BACKGROUNDS
    });
}

//----------------------------------------------------------------------------------
isChrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase()); ;

$( function() {
    setTimeout(start_slideshow, SLIDESHOW_DEFER);
    $('#getit').click(function(e){
	    ga("send", "event", "engagement", "landing_click_on_tryit", "nothing");
	    // add google chrome extension download code here (open new page with store)
	})
});
