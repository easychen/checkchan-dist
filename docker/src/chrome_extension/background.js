// import html2canvas from './html2canvas.esm.js';
import { Base64 } from './base64.mjs';

let inspector = {};
console.log( "load bg.js" );
// javascript-obfuscator:disable
async function show_inspector( tabid,inspector )
{
    inspector = new DomInspector({
        maxZIndex: 9999,
        onClick: async (path) => {
            
            if( window.confirm( "选择器为"+path+"，是否转向到任务添加页面？" ) )
            {
                var getFavicon = function(){
                    var favicon = undefined;
                    var nodeList = document.getElementsByTagName("link");
                    for (var i = 0; i < nodeList.length; i++)
                    {
                        if((nodeList[i].getAttribute("rel") == "icon")||(nodeList[i].getAttribute("rel") == "shortcut icon"))
                        {
                            favicon = nodeList[i].getAttribute("href");
                        }
                    }
                    return favicon;
                }
    
                let icon_url = getFavicon() || "/favicon.ico";
                if( icon_url.substring(0,4) != 'http' )
                {
                    if( icon_url.substring(0,2) == '//' )
                    {
                        icon_url = window.location.protocol + icon_url;
                    }else
                    {
                        if( icon_url.substring(0,1) != '/' ) icon_url = window.origin+ '/' + icon_url;
                        else icon_url = window.origin + icon_url;
                    }
                }
                
                const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url);
    
                
    
                // 这里是 content script 同等权限，发送消息来调整网页
                const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":tabid},);
                console.log( "ret" , ret, inspector );
                // 因为给元素注入了onclick，这里还是要reload才行
            }else
            {
                window.location.reload();    
            }
        }
    });
    inspector.enable();
    alert("可视化选择器已初始化，请移动鼠标选择要监测的区域后点击，取消请按ESC");
    console.log( "inspector2", inspector );
    document.addEventListener('keyup',e => {
        if (e.key === "Escape") inspector.disable();
   });
}

// javascript-obfuscator:disable
async function ck_get_content( path,delay=3000, ignore_path = "",click_path = "",data_path="",scroll_down="0" )
{
    function sleep(ms) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
    }

    function dom_ready(ms)
    {
        return new Promise((resolve) => {
            const handle = setInterval( ()=>{ 
                console.log( "document.readyState →", document.readyState );
                if( document.readyState == 'complete' )
                {
                    clearInterval(handle);
                    resolve(true);
                }
            } , 1000 );
            if(ms) setTimeout(resolve, ms);
            else setTimeout(resolve, 5000);
            
        });
    }

    async function dom_mul_select( path, ignore_path = "",click_path = "",data_path="",scroll_down="0" )
    {
        // 滚动到页面底部
        if( scroll_down && parseInt(scroll_down) > 0 )
        {
            window.scrollTo(0,document.body.scrollHeight);
            await sleep(5000);
        }

        // 点击特定区域
        if( click_path )
        {
            const click_path_items = click_path.split(",");
            for( let item of click_path_items )
            {
                const click_item = window.document.querySelector(item);
                if( click_item )
                {
                    click_item.click();
                    await sleep(1000);
                }
            }
        }

        
        
        if( ignore_path )
            window.document.querySelectorAll( ignore_path ).forEach( item => item.remove() );
        
        // path 扩展语法 selector@1,selector
        const path_info = path.split("@");
        const selector_info = path_info[0].split("%");
        let ret = window.document.querySelectorAll(selector_info[0]);
        if( path_info[1] ) ret = [ret[path_info[1]]];

        
        if( !ret ) return false;
        let texts = [];
        let html = "";
        for( let item of ret )
        {
            item.querySelectorAll("[src]").forEach( item => { if( item.src.substr(0,4) != 'http' ) { item.src = window.origin +( item.src.substr(0,1) == '/' ? item.src : '/'+ item.src  )   } } );

            item.querySelectorAll("[href]").forEach( item => { if( item.href.substr(0,4) != 'http' ) { item.href = window.origin +( item.href.substr(0,1) == '/' ? item.href : '/'+ item.href  )   } } );
            
            const field = selector_info[1] ? selector_info[1] : "innerText";
            if( item[field] ) texts.push(item[field]?.trim());
            if( field == 'innerText' )
                html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 
        }

        let data_ret = "";
        if( data_path )
        {
            const data_path_items = data_path.split(",");
            for( let item of data_path_items )
            {
                const data_items = window.document.querySelectorAll(item);
                for( let data_item of data_items ){
                    if( data_item )
                    {
                        data_ret += data_item.outerHTML ? data_item.outerHTML+"<br/>" : "";
                    }
                }
                
            }
        }
        return {text:path.indexOf(",") >= 0 ? texts.join("\n") :texts[0]||"",html,"data":data_ret};
    }
    
    // await sleep(delay);
    await dom_ready();
    if( delay > 0 ) await sleep(delay);
    const ret = await dom_mul_select(path,ignore_path,click_path,data_path,scroll_down);
    // 直接提取
    if( ret )
    {
        return ret;
    }
    else
    {
        // 失败的话，先延迟再尝试一次
        await sleep(3000);
        const ret2 = await dom_mul_select(path,ignore_path,click_path,data_path,scroll_down);
        if( ret2  )
        {
            return ret2;
        }
        else
        {
            await sleep(3000);
            // 再来一次
            const ret3 = await dom_mul_select(path,ignore_path,click_path,data_path,scroll_down);
            if( ret3  ) return ret;
        }
        
    }

    return false;
    
    
}



chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    
    // console.log("in event listender", request);
    if (request.action === "redirect")
    {
        (async () =>{
            // 必须用update，直接给属性赋值没有用
            // 如果已经打开了窗口，重用窗口
            const [tab] = await chrome.tabs.query({ title:"Check酱" });
            // 否则创建一个新的
            const current_tab = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabid = request.tabid || current_tab[0].id;
            
            const tab2 = await chrome.tabs.get(tabid);
            console.log(tab2);

            const that_tab = tab || tab2;
            // 重用模式下，刷新定位窗口
            // 不用刷新了，加了esc
            // if( tab )
            // {
            //     await chrome.tabs.reload(tab2.id);
            // }

            // await chrome.tabs.update(that_tab.id, {"url":request.url+'&icon='+encodeURIComponent(that_tab.favIconUrl),"active":true});
            // 不传递favicon了
            await chrome.tabs.update(that_tab.id, {"url":request.url,"active":true});
            // 强制刷新时hash值生效
            await chrome.tabs.reload(that_tab.id);
            sendResponse({"message":"done",request});
        })();
        return true;
    }
    if (request.action === "fetch")
    {
        (async () =>{
            const tab = await chrome.tabs.create({"url":request.url,"active":request.tab_activity=='front',"pinned":true});

            // console.log("request",request);
            if( request.ua )
            {
                await attach_debugger( tab.id );
                await send_debug_command(tab.id, 'Network.setUserAgentOverride', {
                    userAgent: request.ua,
                });
                // console.log("reload");
                await chrome.tabs.reload(tab.id);
                await sleep(1000);

            }
            // console.log( tab );
            // javascript-obfuscator:disable
            const r = await chrome.scripting.executeScript(
            {
                    target: {tabId: tab.id},
                    function: ck_get_content,
                    args: [request.path,request.delay,request.ignore_path,request.click_path,request.data_path,request.scroll_down]
            });
            //  console.log( r );
           
            if( request.ua ) await detach_debugger(tab.id);
            
            const result = r[0]?.result;
            console.log( "result", result );
            await chrome.tabs.remove(tab.id);
            sendResponse( result );
        })();
        
        return true;

        
    }
    sendResponse({});
    return true;
});

chrome.action.onClicked.addListener(function(activeTab)
{
    tab_init();
});

chrome.runtime.onInstalled.addListener(function (details)
{
    // 在安装完成事件后
    chrome.contextMenus.create({
        // "id": `checkchanSelector-${Date.now()}`,
        "id": `checkchanSelector`,
        "title": "定位监测对象",
        "contexts": ["all"]
    });
    // 只创建一次
    chrome.alarms.create('check_change', 
    {
        when: Date.now(),
        periodInMinutes: 1
    });

    chrome.alarms.create('cookie_sync', 
    {
        when: Date.now(),
        periodInMinutes: 1
    });

    // chrome.alarms.create('auto_sync', 
    // {
    //     when: Date.now(),
    //     periodInMinutes: 10
    // });

    chrome.alarms.create('bg_cookie_sync', 
    {
        when: Date.now(),
        periodInMinutes: 11
    });

    console.log("create alarms");
    tab_init();
});

function send_debug_command(tabid, method, params = {}) {
    return new Promise((resolve) => {
      chrome.debugger.sendCommand({ tabId:tabid }, method, params, resolve);
    });
}

function attach_debugger(tabId, prevTab) {
    return new Promise((resolve) => {
      if (prevTab && tabId !== prevTab)
        chrome.debugger.detach({ tabId: prevTab });
  
      chrome.debugger.attach({ tabId }, '1.3', () => {
        chrome.debugger.sendCommand({ tabId }, 'Page.enable', resolve);
      });
    });
}

function detach_debugger(tabId) {
    return new Promise((resolve) => {
        chrome.debugger.detach({ tabId },resolve);
    });
}

async function tab_init()
{
    // 首先查找名为[Check酱]的tab，没有再创建新的
    const [tab] = await chrome.tabs.query({ title:"Check酱" });
    // console.log( tab );
    if( tab )
    {
        await chrome.tabs.update(tab.id, {"active":true});
        // await chrome.tabs.update(tab.id, {"highlighted":true});
    }else
    {
        await chrome.tabs.create({"url":"index.html","pinned":true});
    }

}


function selector_init( tabid )
{
    chrome.scripting.executeScript(
        {
            target: {tabId: tabid},
            // files: ['init.js']
            function: show_inspector,
            args: [tabid,inspector]
        },
        (injectionResults)=>
        {
            console.log(injectionResults);
        }
    );
}





chrome.contextMenus.onClicked.addListener(async(e)=>{
    console.log("menu clicked", e);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    selector_init(tab.id);
});

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

// chrome.webRequest.onBeforeSendHeaders.addListener(
//     async details => 
//     {
//         let headers = details.requestHeaders;
//         const checks = (await load_data('checks')).filter( item => item.ua );
//         if( checks.length > 0 )
//         {
//             const domains = checks.map( item => new URL(item.url).host );
//             const uas = checks.map( item => item.ua );
//             // console.log( domains, uas );
//             for (var i = 0; i < headers.length; ++i) 
//             {
//                 if (headers[i].name.toLowerCase() === 'user-agent') 
//                 {
//                     const host = new URL(details.url).host;
//                     if( domains.includes(host) )
//                     {
//                         headers[i].value = uas[domains.indexOf(host)];
//                         console.log("change headers", details.url , headers[i]);
//                     }
                    
                    
//                 }
//             }
//         }
       
//         return {requestHeaders: headers};
//     },
//     {urls: ["<all_urls>"]},
//     ["requestHeaders"]
//   );

chrome.alarms.onAlarm.addListener( async a =>
{
    if( a.name == 'cookie_sync' )
    {
        const settings = await kv_load('settings');
        
        // 如果没有配置上行URL，则不同步cookie
        if( !settings._settings_cookie_sync_url ) return false;
        
        // 每分钟检查，如果没有到设置的时间，则不同步cookie
        const interval = settings._settings_cookie_sync_interval || 5;
        const minute = new Date().getMinutes();
        if( minute % interval != 0 ) return false;

        if( settings._settings_cookie_sync_direction == 'up' )
        {
            // 获得cookie
            const checks = await load_data('checks');
            const cookies = (settings._settings_cookie_sync_range == 'all'? await get_all_cookie_indexed_by_domain() : await get_cookie_by_checks( checks )) || [];

            // 引入base64 和 aes 库
            let cookie_string = Base64.encode(JSON.stringify(cookies));
            
            // console.log("cookie_string", cookie_string);
            const form = new FormData();
            form.append( 'cookies_base64',cookie_string );
            form.append( 'direction', settings._settings_cookie_sync_direction );
            form.append( 'password', settings._settings_cookie_sync_password );
            try {
                const response = await fetch( settings._settings_cookie_sync_url, {
                    method: 'POST', 
                    body: form
                } );

                const ret = await response.json();
                console.log( "ret", ret );
                return ret;
                
            } catch (error) {
                console.log("请求服务器失败。"+error);
                return false;
            }
        }else
        {
            // Cookie 下行
            const form = new FormData();
            form.append( 'direction', settings._settings_cookie_sync_direction );
            form.append( 'password', settings._settings_cookie_sync_password );
            try {
                const response = await fetch( settings._settings_cookie_sync_url, {
                    method: 'POST', 
                    body: form
                } );

                const ret = await response.json();
                if( ret.code == 0 && ret.data )
                {
                    const cookies = JSON.parse(Base64.decode(ret.data));
                    // set cookies to browser
                    for( let domain in cookies )
                    {
                        // console.log( "domain" , cookies[domain] );
                        if( Array.isArray(cookies[domain]) )
                        {
                            for( let cookie of cookies[domain] )
                            {
                                let newcookie = {};
                                ['name','value','domain','path','secure','httpOnly','sameSite'].forEach( key => {
                                    newcookie[key] = cookie[key];
                                } );
                                newcookie.url = buildUrl(cookie.secure, cookie.domain, cookie.path);
                                // console.log(newcookie);
                                chrome.cookies.set(newcookie, (e)=>{
                                    // console.log(e)
                                });
                            }
                        }
                    }
                }
                // console.log( "ret", ret );
                return ret;

                
                
            } catch (error) {
                console.log("请求服务器失败。"+error);
                return false;
            }
        }
        
        
    }
    
    if( a.name == 'bg_cookie_sync' )
    {
        console.log( 'bg_cookie_sync' );
        // 读取api
        const settings = await kv_load('settings');
        if( !settings._hosted_api_base ) return false;
        // 开关
        if( parseInt( settings._hosted_auto_sync||0 ) <= 0 || parseInt( settings._hosted_sync_cookie||0 ) <= 0 ) return false;

        console.log( 'bg_cookie_sync start', parseInt( settings._hosted_auto_sync||0 ), parseInt( settings._hosted_sync_cookie||0 )  );
        
        // 读取 checks
        const checks = await load_data('checks');

        // 获取 cookie
        const cookies = parseInt( settings._hosted_sync_cookie ) > 0 ? await get_cookie_by_checks( checks ) : [];

        // 同步 checks 和 cookies
        const form = new FormData();
        form.append( 'key',settings._hosted_api_key||"" ); 
        form.append( 'checks',JSON.stringify(checks) ); 
        form.append( 'cookies',JSON.stringify(cookies) );
        try {
            const response = await fetch( settings._hosted_api_base+'/checks/upload', {
                method: 'POST', 
                body: form
            } );

            const ret = await response.json();
            console.log( "ret", ret );
            return ret;
            
        } catch (error) {
            console.log("请求服务器失败。"+error);
            return false;
        }

    }    
});

async function kv_save( data, key = 'settings' )
{
    let kv = [];
    for( const setting of data )
    {
        kv.push({"key":setting,"value":this[setting]});
    }
    await save_data(kv, key);
}

async function kv_load( key = 'settings' )
{
    let opt = {};
    const kv = await load_data( key );

    if( kv && Array.isArray(kv) )
    for( const item of kv )
    {
        if( item.key )
            opt[item.key] = item.value || "";
    }

    return opt;
}

async function get_all_cookie_indexed_by_domain()
{
    let cookies = {};
    const all_cookies = await chrome.cookies.getAll({});
    for( const cookie of all_cookies )
    {
        if( !cookies[cookie.domain] )
            cookies[cookie.domain] = [];
        cookies[cookie.domain].push(cookie);
    }
    return cookies;
}

async function get_cookie_by_checks( checks )
{
    let ret_cookies = {};
    // 获取cookie
    if( chrome.cookies )
    {
        const cookies = await chrome.cookies.getAll({});
        let domains = [];
        
        
        for( const item of checks )
        {
            // console.log( "item", item );
            if( !item.url ) continue;
            try {
                const domain = new URL( item.url ).host;
                if( !domains.includes( domain ) )
                    domains.push( domain );
            } catch (error) {
                
            }
            
        }
        // console.log( domains );
        for( const domain of domains )
        {
            ret_cookies[domain] = [];
            for( const cookie of cookies )
            {
                // console.log( "cookie", cookie, domain, domain.indexOf(cookie.domain) );
                if( cookie.domain?.indexOf(domain) >= 0 || domain.indexOf(cookie.domain) >= 0 )
                {
                    ret_cookies[domain].push( cookie );
                }
            }    
        }
    }else
    {
        console.log("not chrome cookie...");
    }
    return ret_cookies;
}

async function storage_set( key, value )
{
    return new Promise((resolve, reject) => {
        chrome.storage.local.set( {[key]:value}, function () {
          return resolve(true);
        });
      });
}

async function storage_get( key )
{
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
          if (result[key] === undefined) {
            resolve(null);
          } else {
            resolve(result[key]);
          }
        });
      });
}

async function load_data( key = 'checks' )
{
    const data = chrome?.storage ? await storage_get(key) : window.localStorage.getItem( key );
    // console.log("load",key,data);
    try {
        return JSON.parse(data);
    } catch (error) {
        return data||[];
    }

}

async function save_data( data, key = 'checks')
{
    // chrome.storage.local.set({key:JSON.stringify(data)});
    const ret = chrome?.storage ? await storage_set( key, JSON.stringify(data) )  : window.localStorage.setItem( key, JSON.stringify(data) );
    return ret;
}

function buildUrl(secure, domain, path) {
    if (domain.startsWith('.')) {
      domain = domain.substr(1);
    }
    return `http${secure ? 's' : ''}://${domain}${path}`;
  }