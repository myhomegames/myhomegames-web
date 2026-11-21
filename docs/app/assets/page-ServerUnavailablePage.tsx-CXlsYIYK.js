import{r as s,j as r,b as Le}from"./react-vendor-B27flFty.js";import{u as Ue}from"./i18n-vendor-CsfpTV-5.js";const Re="http://localhost:4000",Z="mhg_tunnel_api_base";function P(){try{const e=localStorage.getItem(Z);if(e?.trim())return e.trim().replace(/\/$/,"")}catch{}return null}const w=String(Re).trim().replace(/\/$/,"");function Ie(){return P()??w}let S=Ie();function he(){return P()??S}function jt(e=he()){try{const t=new URL(e).hostname.toLowerCase();return t==="localhost"||t==="127.0.0.1"||t==="[::1]"||t==="::1"}catch{return!1}}const Ne="-myhomegames-server.vige.it";function Pt(e=he()){try{return new URL(e.startsWith("http")?e:`https://${e}`).hostname.toLowerCase().endsWith(Ne)}catch{return!1}}function ge(){typeof window<"u"&&window.dispatchEvent(new CustomEvent("mhg-api-base-changed"))}function pe(e){const t=e.trim().replace(/\/$/,""),o=(/^https?:\/\//i.test(t)?t:`https://${t}`).replace(/\/$/,""),a=P(),c=o===S&&a===o;S=o;try{localStorage.setItem(Z,S)}catch{}c||ge()}function _(){const t=P()!==null||S!==w;S=w;try{localStorage.removeItem(Z)}catch{}t&&ge()}function je(e){if(e.featureEnabled){if(e.connected){const t=e.publicUrl?.trim();t&&pe(t);return}_()}}const Ct="myhomegames/myhomegames-server",$t="myhomegames/myhomegames-skins";function we(){return""}let Pe=we();function Mt(){Pe=we()}const Ce="tv",J="mhgTvForce",$e=/tizen|webos|web0s|smart-tv|smarttv|viera|bravia|hbbtv|vidaa|netcast|appletv|crkey|aftb|aftt|aftm|afts|aftn|googletv|google tv|android tv|androidtv|chromecast|nvidia shield|shield android tv|mibox|mi box|smart.?tv/;function ee(e=typeof window<"u"?window.location.search:""){try{return new URLSearchParams(e).get("mhgTv")==="1"}catch{return!1}}function ve(){if(typeof window>"u")return!1;try{return sessionStorage.getItem(J)==="1"}catch{return!1}}function Ot(e=typeof window<"u"?window.location.search:""){if(!(typeof window>"u"))try{ee(e)?sessionStorage.setItem(J,"1"):sessionStorage.removeItem(J)}catch{}}function Me(e=typeof window<"u"?window.location.search:""){return ee(e)||ve()}function p(e=typeof navigator<"u"?navigator.userAgent:""){return Me()?!0:$e.test(String(e||"").toLowerCase())}function Dt(e=p(),t=typeof document<"u"?document.documentElement:null){t&&(e?t.dataset.mhgTv="1":delete t.dataset.mhgTv)}function Ht(e,t=p()){if(!t)return e;try{const n=new URL(e);return n.searchParams.set("mhgProfile",Ce),n.toString()}catch{return e}}function Bt(e){if(!ve()&&!ee(e))return null;const t=new URLSearchParams(e.startsWith("?")?e.slice(1):e);if(t.get("mhgTv")==="1")return null;t.set("mhgTv","1");const n=t.toString();return n?`?${n}`:"?mhgTv=1"}const Oe=2500,De=8e3,He="https://myhomegames-server.vige.it",me="/app/";function T(){return("https://myhomegames-server.vige.it".trim()||He).replace(/\/$/,"")}function Be(e){let t=e.trim();return t.startsWith("/")||(t=`/${t}`),t.endsWith("/")||(t=`${t}/`),t}function Fe(e){return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function ze(){if(typeof window>"u")return"";const e=window.location.origin,t=window.location.pathname;if(t==="/app"||t.startsWith("/app/"))return`${e}${me}`;const n=Be(me);return`${e}${n}`}function xe(e){const t=ze(),n=T();if(!t)return`${n}/api/get-token`;const o=Fe(t),a=new URL(`${n}/api/get-token/r/${o}`);return a.searchParams.set("return_to",t),a.toString()}function Ge(){const e=xe();return`${T()}/cdn-cgi/access/logout?redirect_url=${encodeURIComponent(e)}`}function We(e){const t=e.replace(/-/g,"+").replace(/_/g,"/"),n=(4-t.length%4)%4;return atob(t+"=".repeat(n))}const te="mhg_tunnel_connect_payload";function ne(e){let t=e.trim();return t?(/^https?:\/\//i.test(t)||(t=`https://${t}`),t.replace(/\/$/,"")):""}function re(e){const t=e.token?.trim(),n=e.url?.trim();return!t||!n?null:{token:t,url:ne(n)}}function Ve(){if(typeof window>"u")return null;const e=window.location.hash.replace(/^#/,"");if(!e.startsWith("tunnel="))return null;try{const t=JSON.parse(We(e.slice(7)));return re(t)}catch{return null}}function Ye(e){try{sessionStorage.setItem(te,JSON.stringify(e))}catch{}}function Ke(){try{const e=sessionStorage.getItem(te);return e?re(JSON.parse(e)):null}catch{return null}}function H(){try{sessionStorage.removeItem(te)}catch{}}function K(){const e=Ve();return e?(Ye(e),e):Ke()}function B(){if(typeof window>"u"||!window.location.hash.startsWith("#tunnel="))return;const e=`${window.location.pathname}${window.location.search}`;window.history.replaceState({},document.title,e)}async function qe(){try{return(await fetch(`${w}/tunnel/status`,{signal:AbortSignal.timeout(Oe)})).ok}catch{return!1}}async function oe(e){const t=ne(e);if(!t)throw new Error("tunnel_unreachable");const n=await fetch(`${t}/tunnel/status`,{signal:AbortSignal.timeout(De)});if(!n.ok)throw new Error(`tunnel status failed (${n.status})`);const o=await n.json();return{featureEnabled:!!o.featureEnabled,hasStoredToken:!!o.hasStoredToken,connected:!!o.connected,publicUrl:(o.publicUrl||t).replace(/\/$/,"")}}async function ae(){return oe(w)}async function Je(e){const t=ne(e);if(!t)throw new Error("tunnel_unreachable");pe(t);let n;try{n=await oe(t)}catch{throw _(),new Error("tunnel_unreachable")}if(!n.featureEnabled)throw _(),new Error("tunnel_feature_disabled");if(!n.connected)throw _(),new Error("tunnel_not_connected");return{...n,publicUrl:n.publicUrl||t}}async function Qe(e,t){const n=re({token:e,url:t});if(!n)throw new Error("Invalid tunnel credentials");return await qe()?Ze(n.token,n.url):Je(n.url)}async function Xe(){const e=T(),t=await fetch(`${e}/api/get-token`,{credentials:"include"});if(!t.ok){const c=await t.json().catch(()=>({})),u=typeof c?.error=="string"?c.error:`get-token failed (${t.status})`;throw new Error(u)}const n=await t.json(),o=n.token?.trim(),a=n.url?.trim();if(!o||!a)throw new Error("Invalid tunnel token response");return{token:o,url:a}}function Ft(e){return`${T()}/link`}async function zt(){const e=T(),t=await fetch(`${e}/api/device/code`,{method:"POST"}),n=await t.json().catch(()=>({}));if(!t.ok){const l=typeof n.error=="string"?n.detail?`${n.error}: ${n.detail}`:n.error:`device code failed (${t.status})`;throw new Error(l)}const o=n.device_code?.trim(),a=n.user_code?.trim(),c=n.verification_uri?.trim(),u=n.verification_uri_complete?.trim();if(!o||!a||!c||!u)throw new Error("Invalid device pairing response");return{device_code:o,user_code:a,verification_uri:c,verification_uri_complete:u,expires_in:Number(n.expires_in)>0?Number(n.expires_in):600,interval:Number(n.interval)>0?Number(n.interval):5}}async function Gt(e){const t=T(),n=new URL(`${t}/api/device/poll`);n.searchParams.set("device_code",e);const o=await fetch(n.toString()),a=await o.json().catch(()=>({}));if(!o.ok){const c=typeof a.error=="string"?a.error:`device poll failed (${o.status})`;throw new Error(c)}if(a.status==="authorization_pending")return{status:"authorization_pending"};if(a.status==="expired")return{status:"expired"};if(a.status==="ok"){const c=a.token?.trim(),u=a.url?.trim();if(!c||!u)throw new Error("Invalid device poll payload");return{status:"ok",token:c,url:u}}return{status:"expired"}}async function Ze(e,t){const n=await fetch(`${w}/tunnel/connect`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:e,url:t})}),o=await n.json().catch(()=>({}));if(!n.ok){const a=typeof o?.error=="string"?o.error:typeof o?.detail=="string"?o.detail:`tunnel connect failed (${n.status})`;throw new Error(a)}return ae()}async function et(){const e=await fetch(`${w}/tunnel/reconnect`,{method:"POST"}),t=await e.json().catch(()=>({}));if(!e.ok){const n=typeof t?.error=="string"?t.error:typeof t?.detail=="string"?t.detail:`tunnel reconnect failed (${e.status})`;throw new Error(n)}return ae()}async function tt(){await fetch(`${w}/tunnel/logout`,{method:"POST"})}const be=s.createContext(null),I="mhg_tunnel_auth_redirect",nt=2500,ye={featureEnabled:!0,hasStoredToken:!1,connected:!1,publicUrl:""};async function rt(e){const t=P();if(t)try{const n=await oe(t);e({...n,featureEnabled:!0,publicUrl:n.publicUrl||t});return}catch{_()}e(ye)}function fe(){if(typeof window>"u")return null;const e=new URLSearchParams(window.location.search).get("tunnel_auth");return e==="ok"||e==="error"?e:null}function Wt({children:e}){const[t,n]=s.useState(null),[o,a]=s.useState(!1),[c,u]=s.useState(!1),[l,m]=s.useState(null),[k,A]=s.useState(!1),[L,f]=s.useState(!1),v=s.useRef(K()),C=s.useRef(fe()==="ok"),$=s.useRef(!1),M=s.useRef(null),U=s.useRef(void 0),V=s.useCallback(()=>{const i=new URLSearchParams(window.location.search);if(!i.has("tunnel_auth")&&!i.has("reason"))return null;const d=i.get("reason");i.delete("tunnel_auth"),i.delete("reason");const h=i.toString(),b=`${window.location.pathname}${h?`?${h}`:""}${window.location.hash}`;return window.history.replaceState({},document.title,b),d},[]),x=s.useCallback(()=>{U.current!==void 0&&(window.clearTimeout(U.current),U.current=void 0)},[]),se=s.useCallback(()=>{x(),A(!0),U.current=window.setTimeout(()=>{U.current=void 0,A(!1)},nt)},[x]),g=s.useCallback((i,d)=>{n(i),je(i),i.connected&&f(!1),d?.warmupAfterConnect&&i.connected&&se()},[se]),O=s.useCallback(()=>{try{sessionStorage.setItem(I,String(Date.now()))}catch{}window.location.assign(xe())},[]),R=s.useCallback(async(i,d)=>Qe(i,d),[]),D=s.useCallback(async()=>{try{const i=await ae();M.current===null&&(M.current=i.connected),g(i)}catch{await rt(g)}finally{a(!0)}},[g]);s.useEffect(()=>(D(),()=>{x()}),[D,x]),s.useEffect(()=>{const i=fe();if(i==="ok"){V(),v.current||(v.current=K());try{sessionStorage.removeItem(I)}catch{}return}if(i==="error"){const d=V();B(),H(),m(`Cloudflare tunnel auth failed: ${d||"unknown"}`);try{sessionStorage.removeItem(I)}catch{}}},[V]);const ie=s.useCallback(async()=>{O()},[O]),ce=s.useCallback(async(i,d)=>{u(!0),m(null);try{const h=await R(i,d);B(),H(),g(h,{warmupAfterConnect:!0}),f(!1)}catch(h){const b=h instanceof Error?h.message:String(h);throw m(b),h}finally{u(!1)}},[R,g]),le=s.useCallback(async()=>{if(!$.current&&!(!t?.featureEnabled||t.connected)){$.current=!0,u(!0),m(null);try{let i;const d=v.current;if(d)v.current=null,C.current=!1,i=await R(d.token,d.url);else if(t.hasStoredToken)i=await et();else if(C.current){C.current=!1;const b=await Xe();i=await R(b.token,b.url)}else if(p()){f(!0),u(!1),$.current=!1;return}else{O();return}B(),H();const h=!M.current;g(i,{warmupAfterConnect:h}),f(!1);try{sessionStorage.removeItem(I)}catch{}}catch(i){const d=i instanceof Error?i.message:String(i);m(d),p()&&!t.connected&&f(!0)}finally{u(!1),$.current=!1}}},[t,R,O,g]);s.useEffect(()=>{v.current||(v.current=K()),!(!o||!t?.featureEnabled||t.connected)&&le()},[o,t?.featureEnabled,t?.connected,t?.hasStoredToken,le]);const ue=s.useCallback(async()=>{x(),A(!1),f(!1),C.current=!1,v.current=null,B(),H();try{sessionStorage.removeItem(I)}catch{}try{await tt()}catch{}if(_(),M.current=!1,p()){f(!0),g(ye);return}window.location.assign(Ge())},[x,g]),Y=!!t?.featureEnabled,de=!Y||!!t?.connected&&!c&&!k&&!L,Ae=s.useMemo(()=>({status:t,statusLoaded:o,featureEnabled:Y,tunnelReady:de,needsDevicePairing:L,publicUrl:t?.publicUrl||"",refreshStatus:D,connectFromManager:ie,completeDevicePairing:ce,disconnect:ue,isConnecting:c,warmupPending:k,connectError:l}),[t,o,Y,de,L,D,ie,ce,ue,c,k,l]);return r.jsx(be.Provider,{value:Ae,children:e})}function ot(){const e=s.useContext(be);if(!e)throw new Error("useTunnel must be used within TunnelProvider");return e}const at=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;function Se(e){return typeof e=="string"&&at.test(e)}const N="mhg_active_skin_id",st="mhg_custom_skins_v1",it="builtin-empty";function ct(){const e=localStorage.getItem(N);if(!e||!e.trim())return"";const t=e.trim();return t.startsWith("custom-")?(localStorage.removeItem(N),localStorage.removeItem(st),""):t===it?(localStorage.setItem(N,""),""):Se(t)?t:(localStorage.removeItem(N),"")}function Vt(e){localStorage.setItem(N,e)}const E="data-mhg-tv-hover",y="data-mhg-strip-focus",j="mhg-cover-scale-selected",lt=".cover-hover-effect, .games-list-item, .tag-list-item, .collections-list-item, .fixed-focal-games-item, .fixed-focal-tag-item, .fixed-focal-collections-item, .fixed-focal-recommended-strip-item";function ut(e){if(!e||e===document.body||e===document.documentElement||e.hidden||e.getAttribute("aria-hidden")==="true")return!1;const t=window.getComputedStyle(e);return!(t.display==="none"||t.visibility==="hidden")}function z(e){e.setAttribute(E,"true"),e.querySelectorAll(lt).forEach(o=>{o.setAttribute(E,"true")});const t=e.closest([".games-list-item",".tag-list-item",".collections-list-item",".similar-games-cover-cell",".virtualized-grid-cell-pad",".library-item-detail-subcollection-cell"].join(","));t&&t!==e&&t.setAttribute(E,"true");const n=e.closest(".fixed-focal-games-item, .fixed-focal-tag-item, .fixed-focal-collections-item, .fixed-focal-recommended-strip-item");n&&n!==e&&z(n)}function Q(e){e.removeAttribute(E),e.style.removeProperty("outline"),e.style.removeProperty("outline-offset")}function dt(e){e.classList.contains("cover-hover-effect")||e.classList.contains("games-list-cover")||e.classList.contains("games-list-item")||e.classList.contains("tag-list-item")||e.classList.contains("collections-list-item")||e.classList.contains("fixed-focal-games-item")||e.classList.contains("fixed-focal-tag-item")||e.classList.contains("fixed-focal-collections-item")||e.classList.contains("fixed-focal-recommended-strip-item")||e.classList.contains("mhg-logo-button")||e.classList.contains("mhg-top-right-tool-dock-logo")||(e.style.setProperty("outline","none","important"),e.style.setProperty("outline-offset","0","important"))}function _e(e=p()){if(!e||typeof document>"u")return;const t=document.activeElement instanceof HTMLElement?document.activeElement:null;document.querySelectorAll(`.${j}`).forEach(n=>{z(n)}),document.querySelectorAll(`[${y}]`).forEach(n=>{z(n)}),document.querySelectorAll(`[${E}]`).forEach(n=>{n.classList.contains(j)||n.hasAttribute(y)||n!==t&&Q(n)})}function Yt(e=p()){if(!e||typeof document>"u")return()=>{};let t=null,n=0;const o=()=>{window.clearTimeout(n),n=window.setTimeout(()=>_e(!0),0)},a=u=>{const l=u.target;!(l instanceof HTMLElement)||!ut(l)||(z(l),dt(l))},c=u=>{const l=u.target;l instanceof HTMLElement&&(l.classList.contains(j)||l.hasAttribute(y)||(Q(l),o()))};return document.addEventListener("focusin",a,!0),document.addEventListener("focusout",c,!0),t=new MutationObserver(u=>{for(const l of u){if(l.type!=="attributes"||l.attributeName!=="class"&&l.attributeName!==y)continue;const m=l.target;if(m instanceof HTMLElement&&(m.classList.contains(j)||m.hasAttribute(y)||l.attributeName==="class"&&typeof l.oldValue=="string"&&l.oldValue.includes(j))){o();return}}}),t.observe(document.body,{subtree:!0,attributes:!0,attributeFilter:["class",y],attributeOldValue:!0}),o(),()=>{document.removeEventListener("focusin",a,!0),document.removeEventListener("focusout",c,!0),t?.disconnect(),t=null,window.clearTimeout(n),document.querySelectorAll(`[${E}]`).forEach(u=>{Q(u)})}}const X="mhg-active-skin-bundle";function Ee(){let e=document.getElementById(X);return e||(e=document.createElement("style"),e.id=X,document.head.appendChild(e)),e}function Kt(e){const t=Ee();t.textContent=e;const n=ct();document.documentElement.dataset.mhgSkin=n&&Se(n)?"server":"none",_e()}function mt(){const e=Ee(),t=e.disabled;return e.disabled=!0,document.documentElement.dataset.mhgUiOverlay="reconnect",()=>{const n=document.getElementById(X)||e;n.isConnected&&(n.disabled=t),delete document.documentElement.dataset.mhgUiOverlay}}const ft="myhomegames/myhomegames-server",G="https://github.com/myhomegames/myhomegames-server/releases",ht={win:"header.downloadWindows","mac-arm64":"header.downloadMacArm","mac-x64":"header.downloadMacIntel","linux-deb":"header.downloadLinuxDeb","linux-rpm":"header.downloadLinuxRpm",linux:"header.downloadLinux"},gt=["win","mac-arm64","mac-x64","linux-deb","linux-rpm","linux"],pt={win:[/MyHomeGames-[0-9.]+-win-x64\.zip$/i],"mac-arm64":[/MyHomeGames-[0-9.]+-mac-arm64\.pkg$/i],"mac-x64":[/MyHomeGames-[0-9.]+-mac-x64\.pkg$/i],"linux-deb":[/myhomegames-server_[0-9.]+_amd64\.deb$/i,/MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i],"linux-rpm":[/myhomegames-server-[0-9.]+-1\.x86_64\.rpm$/i,/MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i],linux:[/MyHomeGames-[0-9.]+-linux-x64\.tar\.gz$/i]};function wt(e){const t=e.toLowerCase();return/ubuntu|debian|linux mint|mint\/|pop!_os|elementary|kali|raspbian|zorin|mx linux|chrome.?os/i.test(t)?"linux-deb":/fedora|centos|red hat|rhel|rocky|alma|suse|opensuse|mageia|mandriva|nobara/i.test(t)?"linux-rpm":"linux"}function W(){if(typeof navigator>"u")return!1;const e=navigator.userAgent||"";if(/android/i.test(e)||/iPhone|iPod|iPad/i.test(e))return!0;const n=navigator.userAgentData;if(n?.mobile===!0||typeof n?.platform=="string"&&/android|ios/i.test(n.platform)||/Macintosh/i.test(e)&&navigator.maxTouchPoints>1)return!0;try{if(navigator.maxTouchPoints>0&&typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(pointer: coarse)").matches){const o=Math.min(window.screen?.width||0,window.screen?.height||0);if(o>0&&o<=920)return!0}}catch{}return!1}function Te(){if(typeof navigator>"u")return"linux";const e=navigator.userAgent.toLowerCase(),t=navigator,n=t.userAgentData?.platform?.toLowerCase(),o=t.userAgentData?.architecture?.toLowerCase();if(e.includes("win")||n==="windows")return"win";if((e.includes("mac")||n==="macos")&&!/iphone|ipod|ipad/i.test(e)&&n!=="ios"&&!W()){const a=typeof o=="string"&&/x86|x64|amd64|intel/i.test(o)||/x86_64|amd64|wow64/.test(e);return typeof o=="string"&&/arm|aarch64/i.test(o)||/arm64|aarch64|apple silicon/.test(e)?"mac-arm64":a?"mac-x64":"mac-arm64"}return/android/i.test(e)||n==="android"||/iphone|ipod|ipad/i.test(e)||n==="ios"||W()?"linux":e.includes("linux")||e.includes("x11")||n==="linux"||n==="chrome os"?wt(e):"linux"}function ke(e,t){const n=pt[t]??[];for(const o of n){const a=e.find(c=>o.test(c.name));if(a)return a}return null}function qt(e){const t=[],n=new Set;for(const o of gt){const a=ke(e,o);a&&!n.has(a.browser_download_url)&&(n.add(a.browser_download_url),t.push({os:o,url:a.browser_download_url,name:a.name}))}return t}async function vt(e=fetch){const t=Te();if(W())return{url:G,os:t,fileName:null,platformSpecific:!1};try{const n=await e(`https://api.github.com/repos/${ft}/releases/latest`,{headers:{Accept:"application/vnd.github.v3+json"}});if(!n.ok)throw new Error(`GitHub API ${n.status}`);const o=await n.json(),a=ke(o.assets??[],t);if(a)return{url:a.browser_download_url,os:t,fileName:a.name,platformSpecific:!0}}catch{}return{url:G,os:t,fileName:null,platformSpecific:!1}}function xt(){const[e,t]=s.useState(()=>({loading:!0,url:G,os:Te(),fileName:null,platformSpecific:!1}));return s.useEffect(()=>{let n=!1;return vt().then(o=>{n||t({loading:!1,...o})}),()=>{n=!0}},[]),e}const q="myhomegames@vige.it",bt="https://www.facebook.com/groups/1864095787557962",yt="https://www.instagram.com/myhomegames/",St="https://t.me/+0PutCvWJRSQwYjg0",_t="https://myhomegames.vige.it/logo.png",F="https://myhomegames.vige.it",Et="https://apps.microsoft.com/detail/9nr449qz8r8f",Tt=`
.mhg-reconnect {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-x: hidden;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  color: #333;
  line-height: 1.35;
  text-align: left;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.mhg-reconnect, .mhg-reconnect * { box-sizing: border-box; }
.mhg-reconnect p { margin: 0 0 1rem; line-height: 1.35; text-align: left; }
.mhg-reconnect-wrap {
  display: block;
  width: 100%;
  max-width: 1200px;
  min-height: 100%;
  margin-left: auto;
  margin-right: auto;
  padding: 2rem;
}
.mhg-reconnect-logo {
  display: block;
  width: 100%;
  max-width: 528px;
  height: auto;
  margin-left: auto;
  margin-right: auto;
}
.mhg-reconnect-card {
  width: 100%;
  margin-top: 2rem;
  padding: 3rem;
  border-radius: 12px;
  background: #fff;
  text-align: left;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.mhg-reconnect-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  margin: 0 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 3px solid #667eea;
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  color: #667eea;
}
.mhg-reconnect-title svg { flex-shrink: 0; }
.mhg-reconnect-text {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  line-height: 1.35;
  text-align: left;
  color: #333;
}
.mhg-reconnect-muted {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  line-height: 1.35;
  text-align: left;
  color: #555;
}
.mhg-reconnect-actions {
  margin: 0;
  padding: 2.5rem 0 1.5rem;
  text-align: center;
}
.mhg-reconnect-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  padding: 1.2rem 2.5rem;
  border: 0;
  border-radius: 8px;
  font-size: 1.3rem;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: normal;
  text-align: center;
  text-decoration: none;
  text-transform: none;
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mhg-reconnect-btn:hover { transform: translateY(-2px); }
.mhg-reconnect-btn-download {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}
.mhg-reconnect-btn-download:hover { box-shadow: 0 6px 20px rgba(245, 87, 108, 0.6); }
.mhg-reconnect-btn-retry {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}
.mhg-reconnect-btn-retry:hover { box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }
.mhg-reconnect-btn:disabled { cursor: not-allowed; opacity: 0.6; transform: none; }
.mhg-reconnect p.mhg-reconnect-store,
.mhg-reconnect p.mhg-reconnect-signout-row {
  margin: 1.75rem 0 0;
  text-align: center;
}
.mhg-reconnect p.mhg-reconnect-extra {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.35rem 1.25rem;
  margin: 1.5rem 0 2.5rem;
  text-align: center;
}
.mhg-reconnect-textlink {
  margin: 0;
  padding: 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.35;
  color: #667eea;
  text-decoration: underline;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.mhg-reconnect-social {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: center;
  gap: 1.5rem 2rem;
  margin-top: 2rem;
}
.mhg-reconnect-social a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 5.5rem;
  max-width: 11rem;
  color: #444;
  text-decoration: none;
}
.mhg-reconnect-social span.mhg-reconnect-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 9999px;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.mhg-reconnect-social span.mhg-reconnect-label {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
  color: #555;
  text-align: center;
}
@media (max-width: 768px) {
  .mhg-reconnect-wrap { padding: 1.5rem; }
  .mhg-reconnect-logo { max-width: 320px; }
  .mhg-reconnect-card { padding: 1.5rem; }
  .mhg-reconnect-btn {
    display: flex;
    width: 100%;
  }
}
`;function kt(){return r.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",width:"40",height:"40","aria-hidden":"true",children:r.jsx("path",{fill:"#f5a524",d:"M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"})})}function At(){return r.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",width:"26",height:"26","aria-hidden":"true",children:r.jsx("path",{fill:"currentColor",d:"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"})})}function Lt(){return r.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",width:"26",height:"26","aria-hidden":"true",children:r.jsx("path",{fill:"currentColor",d:"M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"})})}function Ut(){return r.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",width:"26",height:"26","aria-hidden":"true",children:r.jsx("path",{fill:"currentColor",d:"M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"})})}function Rt(){return r.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 24 24",width:"26",height:"26","aria-hidden":"true",children:r.jsx("path",{fill:"currentColor",d:"M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"})})}function Jt({onRetry:e}){const{t}=Ue(),{disconnect:n}=ot(),{url:o,os:a,loading:c,platformSpecific:u}=xt();s.useEffect(()=>mt(),[]);const l=!W()&&!p(),m=t(ht[a],a),k=u?t("serverUnavailable.downloadForPlatform","Download for {{platform}}",{platform:m}):t("serverUnavailable.download","Download"),A=encodeURIComponent(t("serverUnavailable.supportMailSubject","MyHomeGames support")),L=`mailto:${q}?subject=${A}`,f=a==="mac-arm64"||a==="mac-x64"?{href:`${F}/install-homebrew.html`,label:t("serverUnavailable.installBrew","Install with Brew")}:a==="linux-deb"?{href:`${F}/install-linux.html#apt`,label:t("serverUnavailable.installApt","Install with Apt")}:a==="linux-rpm"?{href:`${F}/install-linux.html#yum-dnf`,label:t("serverUnavailable.installYumDnf","Install with Yum/Dnf")}:a==="linux"?{href:`${F}/install-linux.html`,label:t("serverUnavailable.installYumDnfApt","Install with Yum/Dnf/Apt")}:null;return Le.createPortal(r.jsxs("div",{className:"mhg-reconnect",children:[r.jsx("style",{children:Tt}),r.jsxs("div",{className:"mhg-reconnect-wrap",children:[r.jsx("header",{style:{width:"100%",padding:"3rem 0",textAlign:"center"},children:r.jsx("a",{href:"https://myhomegames.vige.it/",style:{display:"inline-block"},children:r.jsx("img",{src:_t,alt:"MyHomeGames",className:"mhg-reconnect-logo",style:{filter:"drop-shadow(2px 2px 4px rgba(0,0,0,0.2))"}})})}),r.jsxs("main",{className:"mhg-reconnect-card",children:[r.jsxs("h1",{className:"mhg-reconnect-title",children:[r.jsx(kt,{}),r.jsx("span",{children:t("serverUnavailable.title","MyHomeGames server is not reachable")})]}),r.jsx("p",{className:"mhg-reconnect-text",children:t("serverUnavailable.message","The web app cannot connect to the server. Install and start it, or verify it is running, then retry.")}),l&&r.jsxs("div",{children:[r.jsx("p",{className:"mhg-reconnect-muted",children:t("serverUnavailable.downloadHint","Download the server for your platform:")}),c?r.jsx("p",{className:"mhg-reconnect-muted",children:t("common.loading","Loading...")}):r.jsxs("div",{children:[r.jsx("div",{className:"mhg-reconnect-actions",children:r.jsx("a",{className:"mhg-reconnect-btn mhg-reconnect-btn-download",href:o,target:"_blank",rel:"noopener noreferrer",children:k})}),a==="win"?r.jsx("p",{className:"mhg-reconnect-store",children:r.jsx("a",{className:"mhg-reconnect-textlink",href:Et,target:"_blank",rel:"noopener noreferrer",children:t("serverUnavailable.downloadMicrosoftStore","Download from the Microsoft Store")})}):null,r.jsxs("p",{className:"mhg-reconnect-extra",children:[f?r.jsx("a",{className:"mhg-reconnect-textlink",href:f.href,children:f.label}):null,r.jsx("a",{className:"mhg-reconnect-textlink",href:G,target:"_blank",rel:"noopener noreferrer",children:t("serverUnavailable.viewAllReleases","View all releases")})]})]})]}),r.jsxs("div",{children:[r.jsx("p",{className:"mhg-reconnect-muted",children:t("serverUnavailable.supportHint","Need help? Contact support:")}),r.jsxs("div",{className:"mhg-reconnect-social",children:[r.jsxs("a",{href:L,title:q,children:[r.jsx("span",{className:"mhg-reconnect-icon",style:{background:"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"},children:r.jsx(At,{})}),r.jsx("span",{className:"mhg-reconnect-label",style:{fontSize:"0.8rem",wordBreak:"break-all"},children:q})]}),r.jsxs("a",{href:bt,target:"_blank",rel:"noopener noreferrer",children:[r.jsx("span",{className:"mhg-reconnect-icon",style:{background:"#1877f2"},children:r.jsx(Lt,{})}),r.jsx("span",{className:"mhg-reconnect-label",children:t("serverUnavailable.supportFacebook","Facebook")})]}),r.jsxs("a",{href:yt,target:"_blank",rel:"noopener noreferrer",children:[r.jsx("span",{className:"mhg-reconnect-icon",style:{background:"radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285aeb 90%)"},children:r.jsx(Ut,{})}),r.jsx("span",{className:"mhg-reconnect-label",children:t("serverUnavailable.supportInstagram","Instagram")})]}),r.jsxs("a",{href:St,target:"_blank",rel:"noopener noreferrer",children:[r.jsx("span",{className:"mhg-reconnect-icon",style:{background:"#229ED9"},children:r.jsx(Rt,{})}),r.jsx("span",{className:"mhg-reconnect-label",children:t("serverUnavailable.supportTelegram","Telegram")})]})]})]}),r.jsx("div",{className:"mhg-reconnect-actions",children:r.jsx("button",{type:"button",className:"mhg-reconnect-btn mhg-reconnect-btn-retry",onClick:e,children:t("serverUnavailable.retry","Retry connection")})}),r.jsx("p",{className:"mhg-reconnect-signout-row",children:r.jsx("button",{type:"button",className:"mhg-reconnect-textlink",onClick:()=>{n()},children:t("serverUnavailable.signOut","Sign out")})})]})]})]}),document.body)}export{S as A,_ as B,Ot as C,Dt as D,Yt as E,Ct as G,w as L,$t as S,Wt as T,we as a,P as b,jt as c,Mt as d,Se as e,ct as f,he as g,Kt as h,Pt as i,p as j,E as k,Pe as l,Te as m,ke as n,qt as o,Gt as p,ht as q,zt as r,Vt as s,W as t,ot as u,T as v,Ft as w,Ht as x,Bt as y,Jt as z};
