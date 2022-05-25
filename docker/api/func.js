const rssParser = require('rss-parser');
const jsonQuery = require('json-query');
const timeoutSignal = require("timeout-signal");
const fetch = require('cross-fetch');
const FormData = require('form-data');
const turndown = require('turndown');

const puppeteer = require('puppeteer');
const path = require("path");
const fs = require("fs");
const dayjs = require("dayjs");
const { JSDOM } = require("jsdom");

get_data_dir = ()=>
{
    return parseInt(process.env.DEV) > 0 ? path.join( __dirname, '/../data/') : '/data/';
}

const log_file = get_data_dir() + 'log.txt';

exports.get_data_dir = get_data_dir;

exports.logstart = () =>
{
    if( fs.existsSync( log_file ) )
    {
        fs.unlinkSync( log_file );
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
            if( cline.indexOf(',') >= 0 )
            {
                const cpart = cline.split(',');
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
                    if( !citem.includes(parseInt(dline)) ) ret = false;
                    console.log( citem );
                    
                }else
                {
                    if( !cpart.includes(dline) ) ret = false;
                }
                
            }else
            {
                if( cline != dline ) ret = false;
            }
        }

        console.log( cline, dline, ret );
        
    }
    return ret;
}

exports.to_time_string = ( date ) =>
{
    return dayjs( date ).format('YYYY-MM-DD HH:mm:ss');
}

exports.get_cookies = () =>
{
    const data_file = get_data_dir() + 'data.json';
    const content = fs.readFileSync( data_file );
    const json_data = JSON.parse( content );
    return json_data.cookies;
}

exports.send_notify = async ( title, desp, sendkey)  =>
{
    try {
        const form = new FormData();
        form.append( 'title',title ); 
        form.append( 'desp',desp.substring(0,10000) ); 
        const response = await fetch( 'https://sctapi.ftqq.com/'+sendkey+'.send', {
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
    
    let ret;
    try {
        switch (item.type) {
            case 'get':
                ret = await monitor_get( item.url, (parseInt(item.delay)||3)*1000 );
                return {status:!!ret,value:ret||0,type:item.type};
                break;
            case 'rss':
                ret = await monitor_rss( item.url, (parseInt(item.delay)||3)*1000 );
                return {status:!!(ret&&ret[item.rss_field]),value:ret[item.rss_field]||"",type:item.type};
                break;
            case 'json':
                ret = await monitor_json( item.url, item.json_query, (parseInt(item.delay)||3)*1000);
                return {status:!!(ret&&ret.value),value:ret.value||"",type:item.type};
            case 'dom':
            default:
                ret = await monitor_dom( item.url, item.path, (parseInt(item.delay)||3)*1000, the_cookies );
                return {status:!!(ret&&ret.text),value:ret.text||"",type:item.type,html:ret.html||""};
        }
    } catch (error) {
        return {status:false,error,type:item.type};
    }
    
}

async function monitor_get(url,timeout=10000)
{
    const response = await fetch( url, { signal: timeoutSignal(timeout) } );
    return response.status;
}

async function monitor_json(url, query, timeout=10000)
{
    const response = await fetch( url, { signal: timeoutSignal(timeout) } );
    const data = await response.json();
    const ret = jsonQuery( query ,{data} );

    return ret; 
}

// rssParser
async function monitor_rss(url,timeout=10000)
{
    const parser = new rssParser({ timeout });
    const site = await parser.parseURL( url );
    const ret = site.items[0]||false;
    return ret;
}

async function monitor_dom_low(url, path, delay , cookies)
{
    const response = await fetch( url, { signal: timeoutSignal(delay) } );
    const all = await response.text();
    const dom = new JSDOM(all);
    const ret = dom.window.document.querySelectorAll(path);

    let texts = [];
    let html = "";
    for( let item of ret )
    {
        item.querySelectorAll("[src]").forEach( item => { if( item.src.substr(0,4) != 'http' ) { item.src = new URL(url).origin +( item.src.substr(0,1) == '/' ? item.src : '/'+ item.src  )   } } );
        
        if( item.textContent ) texts.push(item.textContent?.trim());
        html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 
    }

    return {text:texts[0]||"",html,all};
}

async function monitor_dom(url, path, delay , cookies)
{
    const first = await monitor_dom_low(url, path, delay , cookies);
    console.log( "low result" , first.text );
    if( first && first.text ) return first;
    
    let opt = {
        args: ['--no-sandbox'],
        headless: true, 
    };

    if( process.env.CHROMIUM_PATH ) 
        opt['executablePath'] = process.env.CHROMIUM_PATH;

    const browser = await puppeteer.launch(opt);

    console.log(delay);
    let ret = false;
    
    const page = await browser.newPage(); 
    await page.setDefaultNavigationTimeout(delay+1000*5);
    // await page.setDefaultNavigationTimeout(0);
    if( isIterable(cookies) )
        await page.setCookie( ...cookies ); 

    await page.evaluateOnNewDocument(() => { HTMLVideoElement.prototype.canPlayType = function () { return 'probably' }; });   
    
    try {
        
        await page.goto(url,{
            waitUntil: 'networkidle2',
            timeout: delay+1000*5
        });

        ret = await page.evaluate( (path) => {
            let ret = window.document.querySelectorAll(path);
            if( !ret ) return false;
            let texts = [];
            let html = "";
            for( let item of ret )
            {
                item.querySelectorAll("[src]").forEach( item => { if( item.src.substr(0,4) != 'http' ) { item.src = window.origin +( item.src.substr(0,1) == '/' ? item.src : '/'+ item.src  )   } } );
                
                if( item.innerText ) texts.push(item.innerText?.trim());
                html += item.outerHTML ? item.outerHTML + "<br/>" : ""; 
            }
            return {html,text:texts[0]||"","all":window.document.documentElement.innerHTML};
        },path);
        const { all,html, ...ret_short } = ret;
        console.log("ret",ret_short);
        // 如果返回值为空，那么截图
        if( !(ret && ret.text) )
        {
            const image_dir = get_data_dir()+'/image';
                
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

