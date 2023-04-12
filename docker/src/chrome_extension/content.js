// console.log( "bg", window.origin );

const host = window.location.host;
const url = window.location.href;
const pathname = window.location.pathname;
const button_base_style = "position: fixed; bottom: 20px; left: 20px; z-index: 9999; background-color: #295a8a; color:white; border-radius: 5px;";

async function main()
{
    await insert_content( host, url, pathname );
}

main();

async function insert_content( host, url, pathname )
{
    if( host === 'item.jd.com' )
    {
        const reg = /\/(\d+).html/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = `.price.J-p-${id}`;
        jd_insert_button(path);
    }

    if( host === 'www.amazon.cn' )
    {
        const reg = /\/dp\/(.+?)$/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = `#corePriceDisplay_desktop_feature_div  span.a-offscreen`;
        zcn_insert_button(path);
    }

    if( host === 'weixin.sogou.com' && pathname === '/weixin' )
    {
        const path = "dd > a:nth-child(1)";
        const button = document.createElement("button");
        button.innerHTML = "监测最新文章";
        button.style = button_base_style+"margin-top:10px;margin-bottom:10px;";
        button.onclick = async()=>{
            
            const icon_url = "https://www.sogou.com/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url);

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        // document.querySelector(".gzh-box2").appendChild( button );
        document.body?.appendChild( button );
    }

    if( host === 'www.douyin.com' )
    {
        const reg = /\/user\/(.+)/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = "[data-e2e='user-tab-count']";
        const button = document.createElement("button");
        button.innerHTML = "监测作品总数";
        button.style = button_base_style+"padding:5px;padding-left:10px;padding-right:10px;";
        button.onclick = async()=>{
            
            const icon_url = "https://www.douyin.com/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url)+'&delay=1';

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        // document.querySelector("div#root > div > div:nth-of-type(2) > div > div > div:nth-of-type(4) > div > div").appendChild( button );
        document.body?.appendChild( button );

    }

    // https://m.weibo.cn/profile/5048301588
    if( host === 'm.weibo.cn' )
    {
        const reg = /\/profile\/(.+)/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = ".wb-item:nth-of-type(1)";
        const ignore_path = ".wb-item .m-text-cut,.wb-item .f-footer-ctrl,.wb-item .card-video";
        const button = document.createElement("button");
        button.innerHTML = "监测更新";
        button.style = button_base_style+"margin-left:10px;";
        button.onclick = async()=>{
            
            const icon_url = "https://m.weibo.cn/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url)+'&ignore_path='+encodeURIComponent(ignore_path);

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        // await sleep(1000);
        // document.querySelector(".prf-handle.m-box").appendChild( button );
        document.body?.appendChild( button );

    }

    if( host === 'space.bilibili.com' )
    {
        const reg = /\/(.+)\/video/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = "div#submit-video-list > ul:nth-of-type(2) > li:nth-of-type(1)";
        const ignore_path = "div#submit-video-list > ul:nth-of-type(2) > li:nth-of-type(1) .meta";
        const button = document.createElement("button");
        button.innerHTML = "监测更新";
        button.style = button_base_style+"padding:5px;";
        button.onclick = async()=>{
            
            const icon_url = "https://space.bilibili.com/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url)+'&ignore_path='+encodeURIComponent(ignore_path);

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        document.body?.appendChild( button );

    }

    // message.bilibili.com
    if( host === 'message.bilibili.com' )
    {
        const reg = /#\/(reply)/;
        const id = Array.isArray(url.match(reg)) ? url.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = "div#link-message-container > div > div:nth-of-type(2) > div:nth-of-type(2) > div > div > div > div > div > div .center-box";
        const ignore_path = "div#link-message-container > div > div:nth-of-type(2) > div:nth-of-type(2) > div > div > div > div > div > div .action-field, div#link-message-container > div > div:nth-of-type(2) > div:nth-of-type(2) > div > div > div > div > div > div textarea";
        const button = document.createElement("button");
        button.innerHTML = "监测最新回复";
        button.style = button_base_style+"padding:5px;";
        button.onclick = async()=>{
            
            const icon_url = "https://www.bilibili.com/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url)+'&ignore_path='+encodeURIComponent(ignore_path);

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        document.body?.appendChild( button );

    }

    // .ep-list-wrapper .ep-item:last-child
    if( host === 'www.bilibili.com' )
    {
        const reg = /bangumi\/play\/(.+)/;
        const id = Array.isArray(pathname.match(reg)) ? pathname.match(reg)[1]:null;
        console.log( "id", id );
        if( !id ) return false;
        const path = ".ep-list-wrapper .ep-item:last-child";
        const ignore_path = ".ep-list-wrapper .ep-item:last-child .badge";
        const button = document.createElement("button");
        button.innerHTML = "监测更新";
        button.style = button_base_style+"padding:5px;";
        button.onclick = async()=>{
            
            const icon_url = "https://space.bilibili.com/favicon.ico";
            
            const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url)+'&ignore_path='+encodeURIComponent(ignore_path);

            const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
        }
        document.body?.appendChild( button );

    }


    
}







function zcn_insert_button(path)
{
    const button = document.createElement("button");
    button.innerHTML = "监测价格";
    button.style = button_base_style+"margin-left:10px;margin-right:10px;";

    button.onclick = async()=>{
        
        const icon_url = "https://www.amazon.cn/favicon.ico";
        
        const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url);

        const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
    }
    // document.querySelector("#corePriceDisplay_desktop_feature_div .a-price").appendChild( button );
    document.body?.appendChild( button );
}


function jd_insert_button(path)
{
    const button = document.createElement("button");
    button.style = button_base_style;
    button.innerHTML = "监测价格";
    button.onclick = async()=>{
        
        const icon_url = "https://www.jd.com/favicon.ico";
        
        const url = 'index.html#/check/add?path='+encodeURIComponent(path)+'&title='+encodeURIComponent(window.document.title)+'&url='+encodeURIComponent(window.location.href)+'&icon='+encodeURIComponent(icon_url);

        const ret = await chrome.runtime.sendMessage({action: "redirect","url":url,"tabid":null},);
    }
    // document.querySelector(".p-price").appendChild( button );
    document.body?.appendChild( button );
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}