<?php

// $kv = new SaeKV();
// $rss = $kv->get( 'rss' );
$rss = file_get_contents("rss.xml");

header('Content-Type: application/rss+xml; charset=utf-8');
echo $rss;
