/* The quote checker's page logic, shared by the homepage (#check) and /quote-check/.
   The reader itself is quote-check.js, generated from the app. Nothing leaves the page. */
/* owner, 27 Oct: the homepage quote checker. The reader is the app's own
   (quote-check.js, generated from it). Nothing leaves this page. */
(function(){
  var me=document.currentScript||document.querySelector('script[src$="quote-ui.js"]'), B=(me&&me.getAttribute("data-base"))||"";
  var SAMPLE="ESTIMATE AND ORDER FOR SERVICE\nSample Moving Co. (a made-up company, built from real quotes)\nWe arrange your move through our nationwide network of carriers.\nPickup window: 72 hours. Survey waived.\nEstimated weight: 4,200 lbs\nLine haul $2,769.00\nFuel surcharge $415.35\nAdmin / dispatch $200.00\nBinding estimate fee $2,001.99\nAvailability discount -$615.35\nTotal Moving Estimate $4,770.99\nDeposit 30% due at booking, non-refundable.\nValuation: [X] Basic Value Protection ($0.60 per lb)\nDelivery: up to 30 business days from pickup.\nThis price is valid today only.";
  var f=document.getElementById("qform"), ta=document.getElementById("qtext"), out=document.getElementById("qout");
  if(!f) return;
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
  function run(t0,quiet){
    var t=(t0!=null?t0:ta.value).trim();
    if(!t){out.innerHTML='<p class="qfine">'+(document.getElementById("qsample")?'Paste a quote first, or try the sample.':'Paste the text of a quote first.')+'</p>';ta.focus();return;}
    if(!window.prReadQuote){out.innerHTML='<p class="qfine">One moment, the reader is still loading. Try again.</p>';return;}
    var r=window.prReadQuote(t), fl=r.flags||[];
    /* Lumi's review, 5 Nov: say what was found, what wasn't in the pasted text, and what to check.
       A flag is a question to ask, never a verdict that a mover is a scam. */
    var missing=function(x){return /^(No |It doesn't say|Doesn't|Delivery isn't)/.test(x.text)&&x.tone!=="good";};
    var found=fl.filter(function(x){return x.tone!=="good"&&!missing(x);}), miss=fl.filter(missing), good=fl.filter(function(x){return x.tone==="good";});
    found.sort(function(a,b){return (a.tone==="bad"?0:1)-(b.tone==="bad"?0:1);});
    var lab={bad:"Check this",warn:"Ask about this",good:"Good sign"};
    var more=function(x){return /broker/i.test(x.text)?' <a href="'+B+'movers-vs-brokers/">What a broker is</a>':/USDOT/.test(x.text)?' <a href="'+B+'mover-check/">How to check a mover</a>':/coverage|valuation|value protection/i.test(x.text)?' <a href="'+B+'answers/valuation.html">How coverage works</a>':'';};
    /* review, 11 Nov: the words on the quote behind each finding, so a person can see why and judge it */
    var said=function(x){return x.said?'<small class="qsaid">Your quote says: \u201c'+esc(x.said)+'\u201d</small>':'';};
    /* review, 11 Nov: what the reader worked out from softer wording says so */
    var unsure=function(x){return x.maybe?'<small class="qsaid">The reader isn\u2019t certain here. Read those words, then ask the mover.</small>':'';};
    var row=function(x,miss){return '<div class="qflag '+(miss?"warn":x.tone)+'"><i>'+(miss?"Not found":x.maybe?"Possibly":lab[x.tone])+'</i><span>'+esc(x.text)+more(x)+said(x)+unsure(x)+'</span></div>';};
    var h='<div class="qsum">'+(found.length?'<span class="b">'+found.length+' found to check</span>':'')+(miss.length?'<span class="w">'+miss.length+' not in what you pasted</span>':'')+(good.length?'<span class="g">'+good.length+' good sign'+(good.length>1?'s':'')+'</span>':'')+'</div>';
    h+='<p class="qfine" style="margin-top:4px">These are things to check and questions to ask before you book. A flag on its own doesn\'t mean a mover is dishonest.</p>';
    var sec=function(title,list,isMiss,note,open){if(!list.length)return "";var first=quiet?list.slice(0,3):list,rest=quiet?list.slice(3):[];return '<h3 class="qgroup">'+title+'</h3>'+(note?'<p class="qfine">'+note+'</p>':'')+first.map(function(x){return row(x,isMiss);}).join("")+(rest.length?'<details class="qmore"><summary>Show '+rest.length+' more</summary>'+rest.map(function(x){return row(x,isMiss);}).join("")+'</details>':'');};
    h+=sec("Found in your quote",found,false,"");
    h+=sec("Not in what you pasted",miss,true,"If you copied only part of the quote, these may be on a page you didn't paste. Ask the mover either way.");
    h+=sec("Good signs",good,false,"");
    h+='<div class="qshare"><button type="button" class="btn tape" id="qsharebtn">Share my result</button><span>A picture of what was found, with no amounts or company names. Made on this page.</span></div>';
    h+='<div class="qnext"><p>Keep every quote side by side, give each mover stars for facts, and log every call. Then it runs the rest of the move: every box, the truck, move day and the deposit.</p><a class="btn tape" href="'+B+'app/">Start managing my move</a></div>';
    h+='<p class="qfine">This checks the words on the quote against federal moving rules and the tricks we have seen. It isn\'t legal advice. <a href="'+B+'movers-vs-brokers/">How each trick works</a></p>';
    if(quiet) h='<p class="qsamplehead">A sample result, from a made-up quote built from real ones. Paste yours above to check it.</p>'+h;
    out.innerHTML=h;
    var sb=document.getElementById('qsharebtn'); if(sb&&t===SAMPLE.trim()){sb.parentNode.style.display='none';} else if(sb&&window.prShareResult) sb.addEventListener('click',function(){window.prShareResult(fl,sb);});
    if(quiet) return;
    try{out.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"});}catch(e){}
  }
  f.addEventListener("submit",function(e){e.preventDefault();run();});
  /* Research 28 Oct: show a finished result before anyone pastes anything (homepage only, data-preview). */
  if(f.hasAttribute("data-preview")&&!/^#q=/.test(location.hash||"")){var pv=function(){if(window.prReadQuote)run(SAMPLE,true);else setTimeout(pv,120);};pv();}
  /* #q=<the quote's text>: opens already checked. The part of a web address
     after # is never sent to any server, so the quote stays on the phone. */
  function fromHash(){var m=/^#q=([\s\S]+)$/.exec(location.hash||"");if(!m)return;var q="";try{q=decodeURIComponent(m[1].replace(/\+/g," "));}catch(e){return;}if(!q.trim())return;ta.value=q.slice(0,20000);var go=function(){if(window.prReadQuote)run();else setTimeout(go,120);};go();}
  fromHash(); addEventListener("hashchange",fromHash);
  var qs=document.getElementById("qsample"); if(qs) qs.addEventListener("click",function(){ta.value=SAMPLE;run();});
})();
