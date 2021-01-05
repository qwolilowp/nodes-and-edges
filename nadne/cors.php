<?php
$handle = fopen( $_GET["yuturl"], "rb");
$contents = '';
while( !feof($handle) ){
  $contents .= fread( $handle, 8192);
}
fclose($handle);
echo $contents;
?>
