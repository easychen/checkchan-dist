<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");

if (isset($_POST['rss']) && strlen($_POST['rss']) > 0) {
    // sae
    // $kv = new SaeKV();
    // $kv->set('rss', $_POST['rss']);

    // 保存到文件
    file_put_contents("rss.xml", $_POST['rss']);
    die("rss saved");
} else {
    die("rss not found");
}

print_r($_POST);
