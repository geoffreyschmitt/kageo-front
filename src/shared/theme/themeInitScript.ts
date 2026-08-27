/**
 * Runs in <head> before first paint. Reconciles <html data-theme>
 * with localStorage (then cookie) so a CDN-cached document or a
 * localStorage/cookie disagreement can't flash the wrong theme.
 * 'system' ⇒ remove the attribute and let CSS media query resolve.
 */
export const themeInitScript = `(function(){try{var k='kageo-theme';var v=null;try{v=localStorage.getItem(k)}catch(e){}if(v!=='light'&&v!=='dark'){var m=document.cookie.match(/(?:^|;\\s*)kageo-theme=(light|dark)/);v=m?m[1]:null}var d=document.documentElement;if(v==='light'||v==='dark'){d.setAttribute('data-theme',v)}else{d.removeAttribute('data-theme')}}catch(e){}})()`
