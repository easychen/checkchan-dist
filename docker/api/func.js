const rssParser = require('rss-parser');
const jsonQuery = require('json-query');
const timeoutSignal = require("timeout-signal");
const fetch = require('cross-fetch');
const FormData = require('form-data');
const turndown = require('turndown');
const puppeteer = require('puppeteer-core');
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const { JSDOM } = require("jsdom");
const spawnAsync = require('@expo/spawn-async');
const ip = require('ip');
const {Base64} = require('js-base64');

get_data_dir = ()=>
{
    // 兼容下旧版目录配置
    const dir_path = parseInt(process.env.DEV) > 0 ? path.join( __dirname, '/../data/app_data') : ( fs.existsSync('/data') ? '/data' : '/checkchan/data/app_data' ) ;
    if( !fs.existsSync( dir_path ) ) fs.mkdirSync( dir_path );
    return dir_path;
}

get_shell_dir = ()=> {
    const dir_path = path.join(get_data_dir(),'shell');
    if( !fs.existsSync( dir_path ) ) fs.mkdirSync( dir_path );
    return dir_path;
}

const log_file = get_data_dir() + '/log.txt';

exports.get_data_dir = get_data_dir;

exports.logstart = () =>
{
    if( fs.existsSync( log_file ) )
    {
        fs.unlinkSync( log_file );
    }
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function makeFloat( n )
{
    return parseFloat(String(n).match(/([0-9.]+)/i)[0]);
}

exports.makeFloat = makeFloat;

exports.short = short;

function short( maybe_string , len = 0 )
{
    if( !maybe_string ) return false;
    if( isNumeric( maybe_string )) return maybe_string;
    if (typeof maybe_string === 'string' || maybe_string instanceof String)
    {
        if( len < 1 ) return maybe_string.replace(/^"(.+)"$/ig, '\$1');
        return maybe_string.replace(/^"(.+)"$/ig, '\$1').substring( 0, len );
    }else
    {
        // maybe object
        if( len < 1 ) return JSON.stringify(maybe_string);
        return JSON.stringify(maybe_string).substring(0,len);
    }
}

exports.to_markdown = ( html ) => 
{
    const c = new turndown();
    return c.turndown(html);
}

logit = ( text ) =>
{
    console.log( text );
    if (typeof text !== 'string' && !(text instanceof String))
    {
        text = JSON.stringify( text );
    }
    fs.appendFileSync( log_file, '['+ dayjs().format('YYYY-MM-DD HH:mm:ss') + ']' +text + "\r\n" );
}

exports.logit = logit;

function range(start, stop, step) {
    var a = [start], b = start;
    while (b < stop) {
        a.push(b += step || 1);
    }
    return a;
}

exports.cron_check = ( cron, now = null )=>
{
    const dinfo = dayjs(now||Date.now()).format('m-H-D-M-d').split('-');
    const cinfo = cron.trim().split(' ');
    // console.log( dinfo, cinfo );
    let ret = true;
    for( let i=0; i < 5; i++ )
    {
        let cline = cinfo[i].trim();
        let dline = dinfo[i].trim();
        if( cline != "*" )
        {
            const cpart = cline.indexOf(',') >= 0 ? cline.split(','):[cline];
            
            if( cline.indexOf('-') >= 0 )
            {
                // citem 全部用int，其他地方用string
                let citem = [];
                for( let cp of cpart )
                {
                    // console.log(cp);
                    if( cp.indexOf('-') >= 0 )
                    {
                        const cpinfo = cp.split('-');
                        // console.log( cpinfo );
                        cp = range(  parseInt(cpinfo[0]),parseInt(cpinfo[1]),1 );
                        citem = citem.concat( cp );
                    }else
                    {
                        citem.push( parseInt(cp) );
                    }
                }
                // if( !citem.includes(parseInt(dline)) ) ret = false;
                if(!part_check( citem, parseInt(dline), cline )) ret = false;
                console.log( i, citem, cron );
                
            }else
            {
                // if( !cpart.includes(dline) ) ret = false;
                if(!part_check( cpart, parseInt(dline), cline )) ret = false;
            }
        }

        // console.log( cline, dline, ret );
        
    }
    if( ret && cron != "* * * * *" ) console.log("当前时间"+dinfo.join('-')+"cron "+cron);
    return ret;
}

function part_check( items, item, string )
{
    // console.log( items );
    const reginfo = string.match(/\/([1-9][0-9]*)/);
    const number_items = items.map( i => parseInt( i ) );
    if( !reginfo )
    {
        return number_items.includes( parseInt(item) );
    }
    else
    {
        const n = parseInt( reginfo[1] );
        const only_items = number_items.filter( item => (item - number_items[0]) % n == 0 );   
        return only_items.includes( parseInt(item) );
    }
}

exports.to_time_string = ( date ) =>
{
    return dayjs( date ).format('YYYY-MM-DD HH:mm:ss');
}

exports.get_cookies = () =>
{
    const data_file = get_data_dir() + '/data.json';
    const content = fs.readFileSync( data_file );
    const json_data = JSON.parse( content );
    return json_data.cookies;
}

exports.do_webhook = async( id, url, value, html, link, data ) =>
{
    // 因为webhook的内容更多，所以不能放到 show_notice 里边处理，这里单独处理
    if( process.env.WEBHOOK_URL )
    {
        // make post
        const form = new FormData();
        form.append( 'id', id );
        form.append( 'url', url );
        form.append( 'value',value );
        form.append( 'html',html );
        form.append( 'link',link );
        form.append( 'data',data );

        const json = JSON.stringify( { id, url, value, html, link, data } );

        try {
            const response = await fetch( process.env.WEBHOOK_URL , {
                method: 'POST', 
                body: (process.env.WEBHOOK_FORMAT && process.env.WEBHOOK_FORMAT.toLowerCase() == 'json') ? json : form
            } );
    
            const ret = await response.text();
            console.log( "wehbook response", ret );
            return ret;

        } catch (error) {
            console.log( "fetch log error", error );
            return false;
        }
        
    }
}

exports.send_notify = async ( title, desp, sendkey, channel = -1, short = false)  =>
{
    try {
        const form = new FormData();
        if( channel >= 0 ) form.append( 'channel',parseInt(channel));
        if( short ) form.append( 'short',short ); 
        form.append( 'title',title ); 
        form.append( 'desp',desp.substring(0,10000) + "\r\n\r\n" + "来自云端@"+ ip.address() ); 
        const api = String(sendkey).startsWith('sctp') ? `https://${sendkey}.push.ft07.com/send` : `https://sctapi.ftqq.com/${sendkey}.send`
        const response = await fetch( api, {
            method: 'POST', 
            body: form
        }  );

        const data = await response.text();
        return JSON.parse(data)||data;
    } catch (error) {
        console.log("推送微信通知错误",error);
        return false;
    }
}

exports.monitor_auto = async ( item, cookies ) =>
{
    const domain = new URL( item.url ).host;
    const the_cookies = cookies[domain];
    console.log("in auto");
    let ret;
    try {
        switch (item.type) {
            case 'get':
                ret = await monitor_get( item.url, (parseInt(item.delay)||0)*1000 );
                return {status:!!ret,value:ret||0,type:item.type};
                break;
            case 'rss':
                ret = await monitor_rss( item.url, (parseInt(item.delay)||0)*1000 );
                if( ret && ret['content'] ) ret['description'] = ret['content'];
                return {status:!!(ret&&ret[item.rss_field]),value:ret[item.rss_field]||"",html:ret['content']||"",link:ret.link,type:item.type};
                break;
            case 'json':
                // 特别注意，云端的json监测包含delay参数
                // console.log(item);
                ret = await monitor_json( item.url, item.json_query, item.json_header, item.json_data, item.json_data_format, (parseInt(item.delay)||0)*1000, the_cookies );
                return {status:!!(ret&&ret.value),value:JSON.stringify(ret.value)||"",type:item.type};
                break;
            case 'shell':
                ret = await monitor_shell( item , the_cookies );
                return {status:!!(ret&&ret.status),value:ret.value||"",type:item.type};
                break;
            case 'dom':
            default:
                ret = await monitor_dom( item , the_cookies );
                return {status:!!(ret&&ret.text),value:ret.text||"",type:item.type,html:ret.html||"",link:ret.link||""};
        }
    } catch (error) {
        console.log(error);
        return {status:false,error,type:item.type};
    }
    
}

async function monitor_get(url,timeout=10000)
{
    const response = await fetch( compile_url(url), { signal: timeoutSignal(timeout<1?10000:timeout) } );
    return response.status;
}

async function monitor_json(url, query, header=false, body_string=false, format = 'form', timeout=10000, cookies=[])
{
    try {
        const body_data = body_string? JSON.parse(body_string||"{}") : false;
        let body = body_data ? JSON.stringify( body_data ): false;
        console.log( body_data, body );

        if( format == 'form' )
        {
            const params = new FormData();
            if( body_data )
                Object.keys( body_data ).forEach( item => params.append(item, body_data[item]) );
            body = params;
        }

        let headers = header ? (JSON.parse(header) || false) : false;
        const cookie_string = build_cookie_string(cookies);
        if( cookie_string )
        {
            if( !headers ) headers = {};
            headers['cookie'] = cookie_string;
        }
        const method = body_string ? "POST" : "GET";
        let opt = {
            method,
            credentials: 'include',
            signal: timeoutSignal(timeout<1?10000:timeout), 
        } ;

        if( headers ) opt.headers = headers;
        if( method == 'POST' ) opt.body = body;

        const response = await fetch( compile_url(url), opt );
        const data = await response.json();
        const ret = jsonQuery( query ,{data} );
        console.log( ret );
        if( !( ret ) )
        {
            console.log("save error");
            const image_dir = get_data_dir()+'/image';
                
            if( !fs.existsSync(image_dir) )
            fs.mkdirSync(image_dir);
            
            fs.writeFileSync( image_dir + '/error.json', JSON.stringify(data) );
        }
        return ret; 
    } catch (error) {
        console.log( error );
        return false;
    }
    
}

// rssParser
async function monitor_rss(url,timeout=10000)
{
    let index = 0;
    let feed = compile_url(url);
    let all = true;
    let m;

    if( ( m = /^(http(s)*:\/\/.+)@([0-9]+)$/is.exec(url)) !== null )
    {
        index = parseInt(m[3]);
        feed = m[1];
        all = false;
    }
    
    const parser = new rssParser({ timeout });
    const site = await parser.parseURL( feed );
    const ret = site.items[index];
    if( all ) ret.content = site.items.map( item => item.content ).join("\r\n<hr/><br/>\r\n");
    
    return ret;
}

async function monitor_dom_low(item, cookies)
{
    const { url, path, delay, ignore_path,click_path,data_path,scroll_down } = item;
    console.log("in low dom");
    try {
        const response = await fetch( url, { signal: timeoutSignal(delay<1?10000:delay) } );
        const all = await response.text();
        if( all.substring(0,2000).toLowerCase().indexOf('utf-8') < 0 ) return  false;
        // const sniffedEncoding = htmlEncodingSniffer(await response.arrayBuffer());
        // console.log(sniffedEncoding);
        let opt = {};
        if( item.ua ) opt['userAgent'] = item.ua;
        const dom = new JSDOM(all,opt);
        
        if( click_path )
        {
            const click_dom = dom.window.document.querySelector(click_path);
            if( click_dom )
            {
                const evt = new Event('click', { bubbles: false, cancelable: false, composed: false });
                click_dom.dispatchEvent(evt);
            }
        }

        if( scroll_down && parseInt(scroll_down) > 0 )
        {
            dom.window.scrollTo(0,dom.window.document.body.scrollHeight);
        }
        
        if( ignore_path ) dom.window.document.querySelectorAll(ignore_path).forEach( item => item.remove() );

        const path_info = path.split("@");
        const selector_info = path_info[0].split("%");
        let ret = dom.window.document.querySelectorAll(selector_info[0]);
        if( path_info[1] ) ret = [ret[path_info[1]]];

        let texts = [];
        let html = "";
        for( let item of ret )
        {
            if( !item ) continue;
            
            ['src','href'].forEach( field => {
                
                item.querySelectorAll("["+field+"]").forEach( item => { if( item[field]?.substr(0,4) != 'http' ) { item[field] = new URL(url).origin +( item[field]?.substr(0,1) == '/' ? item[field] : '/'+ item[field]  )   } } );

                if( item[field] )
                {
                    if( item[field]?.substr(0,4) != 'http' ) { item[field] = new URL(url).origin +( item[field]?.substr(0,1) == '/' ? item[field] : '/'+ item[field]  )   } 
                };
            } );
            
            const field = selector_info[1] ? selector_info[1] : "textContent";
            if( item[field] ) texts.push(item[field]?.trim());
            if( field == 'textContent' )
                html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 
        }

        return {text:path.indexOf(",") >= 0 ? texts.join("\n") :texts[0]||"",html,all};
    } catch (error) {
        console.log("low dom error",error);
        return false;
    }
}

async function monitor_shell(item, cookies)
{
    const { url, path, id, shell_type, shell_cookie_name, shell_code } = item;
    let command = 'node';
    let ext = 'js';
    switch( shell_type )
    {
        case 'php':
            command = 'php';
            ext = 'php';
            break;
        case 'javascript':
            command = 'node';
            ext = 'js';
            break;
        case 'typescript':
            command = 'ts-node';
            ext = 'ts';
            break;
        case 'python':
            command = 'python3';
            ext = 'py';
            break;
        case 'bash':
        default:
            command = 'bash';
            ext = 'sh';
            break;
    }

    const shell_file = get_shell_dir() + '/' + id + '.' + ext; 
    fs.writeFileSync( shell_file, Base64.decode(shell_code) || shell_code );

    const cookie_name = item.shell_cookie_name || "COOKIE";
    const cookie_string = build_cookie_string(cookies)||"";

    const result = await spawnAsync( command, [shell_file], {
        env: {
            'URL':compile_url(url),
            [cookie_name]:cookie_string,
            ...process.env,
        }
    } );
    const { stdout, stderr, status } = result;
    if( stderr ) console.log( stderr );

    return {status:status==0,value:stdout};

    
}

async function monitor_dom(item , cookies)
{
    const { path, id, ignore_path,click_path,data_path,scroll_down } = item;
    const url = compile_url(item.url);
    const delay = (parseInt(item.delay)||0)*1000;

    console.log("in dom delay = ",delay);
    if((!process.env.SNAP_URL_BASE) && delay < 1 && !item.puppeteer_code && !item.browser_code )
    {
        const first = await monitor_dom_low( item , cookies);
        console.log( "low result" , first.text );
        if( first && first.text ) return first;
    }else
    {
        console.log( "jump jsdom" );
    } 
    
    let opt = {
        args: ['--no-sandbox'],
        defaultViewport: null,
        headless: !(process.env.VDEBUG && process.env.VDEBUG == 'ON'), 
        timeout:delay+1000*10,
        executablePath:process.env.CHROME_BIN||"/usr/bin/chromium-browser",
    };

    if( item.ua )
    {
        opt.args.push( `--user-agent=${item.ua}` );
    }

    // 支持proxy
    if( process.env.PROXY_SERVER )
    {
        opt.args.push( `--proxy-server=${process.env.PROXY_SERVER}` );    
    }

    // console.log( opt );

    if( process.env.CHROMIUM_PATH ) 
        opt['executablePath'] = process.env.CHROMIUM_PATH;

    const browser = await puppeteer.launch(opt);

    console.log(delay);
    let ret = false;
    
    const page = await browser.newPage(); 
    if( item.ua ) await page.setUserAgent( item.ua );
    await page.setDefaultNavigationTimeout(delay+1000*10);
    // await page.setDefaultNavigationTimeout(0);
    if( isIterable(cookies) )
        await page.setCookie( ...cookies ); 

    await page.evaluateOnNewDocument(() => { HTMLVideoElement.prototype.canPlayType = function () { return 'probably' }; });

    const { puppeteer_code, browser_code } = item;
            
    try {
        
        await page.goto(url,{
            waitUntil: 'networkidle2',
            timeout: delay+1000*10
        });

        if( delay > 0 )
        {
            await sleep(delay);
        }

        if( puppeteer_code )
        {
            const hot_code = `(async( browser,page,puppeteer_code  ) =>
            {
                ${puppeteer_code}
            })( browser,page,puppeteer_code  )`;
            // console.log( hot_code );
            eval( hot_code );
            await sleep(1000);
        } 

        ret = await page.evaluate( async (path,browser_code,ignore_path,click_path,data_path,scroll_down ) => {
            
            // 滚动的页面底部
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

            
            if( browser_code ) eval( browser_code );
            
            if( ignore_path ) window.document.querySelectorAll(ignore_path).forEach( item => item.remove() );
            
            const path_info = path.split("@");
            const selector_info = path_info[0].split("%");
            let ret = window.document.querySelectorAll(selector_info[0]);
            if( path_info[1] ) ret = [ret[path_info[1]]];

            if( !ret ) return false;
            console.log("query fail",path,ret);
            let texts = [];
            let html = "";
            for( let item of ret )
            {
                item.querySelectorAll("[src]").forEach( item => { if( item.src.substr(0,4) != 'http' ) { item.src = window.origin +( item.src.substr(0,1) == '/' ? item.src : '/'+ item.src  )   } } );
                
                const field = selector_info[1] ? selector_info[1] : "innerText";
                if( item[field] ) texts.push(item[field]?.trim());
                if( field == 'innerText' ) html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 
            }
            return {html,text:path.indexOf(",") >= 0 ? texts.join("\n") :texts[0]||"","all":window.document.documentElement.innerHTML};
        },path,browser_code,ignore_path,click_path,data_path,scroll_down);
        
        if( !ret )
        {
            console.log("sleep",1000*5);
            await sleep(1000*5);
            ret = await page.evaluate( async (path,browser_code,ignore_path,click_path,data_path,scroll_down) => {
                // 滚动的页面底部
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

                
                if( browser_code ) eval( browser_code );
                
                if( ignore_path ) window.document.querySelectorAll(ignore_path).forEach( item => item.remove() );
                
                const path_info = path.split("@");
                const selector_info = path_info[0].split("%");
                let ret = window.document.querySelectorAll(selector_info[0]);
                if( path_info[1] ) ret = [ret[path_info[1]]];

                console.log("query fail again",path,ret);
                if( !ret ) return false;
                let texts = [];
                let html = "";
                for( let item of ret )
                {
                    item.querySelectorAll("[src]").forEach( item => { if( item.src.substr(0,4) != 'http' ) { item.src = window.origin +( item.src.substr(0,1) == '/' ? item.src : '/'+ item.src  )   } } );
                    
                    const field = selector_info[1] ? selector_info[1] : "innerText";
                    if( item[field] ) texts.push(item[field]?.trim());
                    if( field == 'innerText' ) html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 

                }
                return {html,text:path.indexOf(",") >= 0 ? texts.join("\n") :texts[0]||"","all":window.document.documentElement.innerHTML};
            },path,browser_code,ignore_path,click_path,data_path,scroll_down);
            
        }
        const { all,html, ...ret_short } = ret;
        
        
        
        console.log("ret",ret_short);
        
        const image_dir = get_data_dir()+'/image';
        
        if(ret.all)
        {
            console.log("save html");
            fs.writeFileSync( image_dir +'/'+ id +'.html', ret.all );
        }
            
            
        // 如果返回值为空，那么保存错误现场
        if( !(ret && ret.text) )
        {
            if( !fs.existsSync(image_dir) )
            fs.mkdirSync(image_dir);
            
            // 写入html
            if(ret.all)
                fs.writeFileSync( image_dir + '/error.html', ret.all );

            if( process.env.ERROR_IMAGE && process.env.ERROR_IMAGE != 'NONE' )
            {
                console.log("生成截图 http://.../image/error.jpg");

                await page.setViewport({ width:1300, height:1000 });

                await page.screenshot({"path":image_dir+'/error.jpg',"type":"jpeg","captureBeyondViewport":false,"fullPage":process.env.ERROR_IMAGE=='FULL'||false});
            }
           
        }else
        {
            // 如果启用了返回截图功能
            if( process.env.SNAP_URL_BASE )
            {
                if( !fs.existsSync(image_dir) )
                fs.mkdirSync(image_dir);

                const image_path = `${image_dir}/${id}.jpg`;

                const mobile = puppeteer.devices['iPhone X']
                await page.emulate(mobile);
                await page.setViewport({ width:480, height:2000 });
                
                await page.screenshot({"path":image_path,"type":"jpeg","captureBeyondViewport":false,"fullPage":process.env.SNAP_FULL||false});

                if( fs.existsSync(image_path) )
                {
                    console.log("截图完成");
                    ret.link = process.env.SNAP_URL_BASE + '/image/' + id +'.jpg?key='+process.env.API_KEY;
                } 
            }
        }  
    } catch (error) {
        console.log("error",error);
        
    }finally
    {
        await browser.close();
        return ret;
    }
}

function isIterable(obj) {
    // checks for null and undefined
    if (obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

function build_cookie_string( cookie_array )
{
    let ret = [];
    if( !Array.isArray(cookie_array) ) return false;
    for(  const cookie of cookie_array )
    {
        if( cookie.name ) ret.push(`${cookie.name}=${cookie.value}`)
    }
    return ret.length > 0 ? ret.join('; ') : false;
}

function compile_url( url )
{
    // replace date in url 
    // {$_CKC_DATE}
    const values = {};
    values['date'] = dayjs().format('DD');
    values['year'] = dayjs().format('YYYY');
    values['month'] = dayjs().format('MM');
    values['hour'] = dayjs().format('HH');
    values['minute'] = dayjs().format('mm');
    values['day_7'] = dayjs().subtract(7,'day').format('YYYY-MM-DD');
    return url.replace( /\{\$_CKC_(.+?)}/isg, (m, g1,) => values[g1.toLowerCase()] || g1 );
}

