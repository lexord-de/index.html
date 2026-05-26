/* LEXORD Visitor-Tracker — sendet Live-Daten an den Worker fuer das Admin-Globe
 * Einbinden auf jeder Seite (index.html, konfigurator.html, collections.html etc):
 *   <script src="lxrd-tracker.js" defer></script>
 * Plus pro Seite ggf:
 *   <script>LXRD.event('config_start')</script>  // beim Klick auf Konfigurator
 *   <script>LXRD.event('cart_add')</script>      // beim "In den Warenkorb"
 *   <script>LXRD.event('checkout')</script>      // beim Checkout-Start
 *   <script>LXRD.event('order_complete')</script>// nach erfolgreicher Bestellung
 */
(function(){
  'use strict';
  var WORKER = 'https://lexord-api.leonschulz1420.workers.dev';
  var SID_KEY = 'lxrd_sid';
  var sid = sessionStorage.getItem(SID_KEY);
  if(!sid){
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    sessionStorage.setItem(SID_KEY, sid);
  }
  function send(event){
    try{
      var body = JSON.stringify({
        sid: sid,
        page: location.pathname,
        ref: document.referrer || '',
        event: event || 'view'
      });
      if(navigator.sendBeacon){
        var blob = new Blob([body], {type:'application/json'});
        navigator.sendBeacon(WORKER + '/track/visitor', blob);
      } else {
        fetch(WORKER + '/track/visitor', {method:'POST', headers:{'Content-Type':'application/json'}, body: body, keepalive:true}).catch(function(){});
      }
    }catch(_){}
  }
  /* Initial Page-View */
  send('view');
  /* Heartbeat alle 10min (statt 2min — spart 80% KV-Writes) */
  setInterval(function(){send('view');}, 10*60*1000);
  /* Sichtbarkeit (Tab-Switch) */
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) send('view');
  });
  /* API fuer Custom-Events */
  window.LXRD = {
    event: send,
    sid: sid
  };
})();
