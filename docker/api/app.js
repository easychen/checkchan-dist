const { monitor_auto, send_notify, get_data_dir, get_cookies, to_time_string, logstart, logit } = require("./func");
const express = require('express');
const path = require('path');
const fs = require('fs');
const ip = require('ip');
const app = express();

const cors = require('cors');
app.use(cors());

var multer = require('multer');
var forms = multer();
const bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(forms.array()); 
app.use(bodyParser.urlencoded({ extended: true }));

const image_dir = get_data_dir()+'/image';
if( !fs.existsSync(image_dir )) fs.mkdirSync(image_dir);

app.use('/image', express.static(image_dir));


function checkApiKey (req, res, next) {
    
    if( process.env.API_KEY && process.env.API_KEY != ( req.query.key||req.body.key )) 
    return res.json({"code":403,"message":"错误的API KEY"});
   
    next();
}


app.all(`/`, checkApiKey , (req, res) => {
    let data_write_access = true;
    try {
        fs.accessSync(get_data_dir(),fs.constants.W_OK);
    } catch (error) {
        data_write_access = false;
    }
    
    // res.json({"code":0,"message":"it works","version":"1.0","ip":ip.address(),data_write_access});
    // 不再显示IP，以免误导
    res.json({"code":0,"message":"it works","version":"1.0",data_write_access});
});

app.post(`/checks/upload`, checkApiKey , (req, res) => {
    const data = { checks: JSON.parse(req.body.checks)||[], cookies: JSON.parse(req.body.cookies) ||{} };
    const data_file = get_data_dir()+'/data.json';
    try {
        let cloud_checks = [];
        if( fs.existsSync( data_file ) )
        {
            // 如果存在旧数据
            const old_data = JSON.parse(fs.readFileSync( data_file, 'utf8' ));
            
            if( old_data )
            {
                cloud_checks = old_data.checks.filter( item => item.is_cloud_task == 1 );
                
                for( const check of cloud_checks )
                {
                    const the_idx = data.checks.findIndex(item => item.id == check.id);

                    // console.log(to_time_string( data.checks[the_idx]['last_time'] ) + '~' + to_time_string( check.last_time ));

                    if( the_idx >= 0 && data.checks[the_idx]['last_time'] < check.last_time )
                    {
                        console.log("new", check.title, check.last_time);
                        data.checks[the_idx]['last_content'] = check['last_content'];
                        data.checks[the_idx]['last_time'] = check['last_time'];
                    }
                }
                cloud_checks = data.checks.filter( item => item.is_cloud_task == 1 );
                // console.log( cloud_checks );
                
            }
            // if( old_data ) cloud_checks = old_data.checks.filter( item => item.is_cloud_task == 1 );
        }
        
        fs.writeFileSync( data_file , JSON.stringify(data) );
        if( fs.existsSync( data_file ) )
            res.json({"code":0,"message":"设置已同步到自架服务",cloud_checks});
        else
            res.json({"code":501,"message":"设置保存失败"});
    } catch (error) {
        res.json({"code":500,"message":error});
    }
    
});

app.post(`/monitor`, checkApiKey , async (req, res) => {
    const item = JSON.parse(req.body.item);
    // cookie改为从请求获取，以确保最新
    const cookies = req.body?.cookies ? JSON.parse(req.body.cookies) : get_cookies();
    if( !item ) return res.json({"code":500,"message":"item格式不正确"});
    const ret = await monitor_auto( item, cookies );
    console.log( ret );
    return  res.json(ret);    
    
});

app.all(`/log`, checkApiKey , (req, res) => {
    const log_file = get_data_dir()+'/log.txt';
    const log = fs.existsSync( log_file ) ? fs.readFileSync( log_file, 'utf8' ): "";
    res.json({"code":0,"log":log});
});

// Error handler
app.use(function (err, req, res, next) {
    console.error(err);
    res.status(500).send('Internal Serverless Error');
  });
  
  app.listen(80, () => {
    console.log(`Server start on http://localhost`);
  });
  