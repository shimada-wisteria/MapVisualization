# 概要
本プログラムは、[GTFSデータ リポジトリ https://gtfs-data.jp/](https://gtfs-data.jp/)で公開されている、日本国内における公共交通機関のバスに関する情報を、地図上に可視化表示します。
step1では、あらかじめローカル環境に保存しておいたgtfsデータを、可視化の際に使用するデータフォーマット(geojson)に変換します。
step2では、jsonデータを実際にwebアプリ上で可視化します。

# 使用方法
## 環境の構築
step1のデータ変換を行う場合、実行にはnode.jsの環境構築、npmのパッケージ取得が必要です。  
[Node.js https://nodejs.jp/](https://nodejs.jp/)から、LTS版のnode.jsを取得し、案内に従いインストールします。（※v20.11.0で動作を確認しています。）  
次に、本プログラムで使用するnpmのパッケージを取得します。  
MapVisualizationのフォルダで、"npm install"のコマンドを実行します。  
package.jsonの情報を元に、必要なパッケージがインストールされます。  
  
## 使用手順
1. GTFSデータ リポジトリからGTFSデータを取得する。  
  検索後、ダウンロードURL(現行)のURLをクリックし、feed.zipファイルをダウンロードする。  
  ダウンロードしたデータを解凍する。解凍したフォルダ（feed***）ごと、dataSampleフォルダに移動する。  
2. 地図表示用に本プログラムを使い、geojsonフォーマットのファイルを作成する。  
  以下のコマンドを入力することで、データサンプル内のgtfsファイルを変換し、convertフォルダに結果が出力される。  
  node ./gtfsDataConverter/index.js  
3. visualizationフォルダのindex.htmlを、Chromeなどのブラウザを使い表示します。  
    1. convertフォルダに保存された、geojsonフォルダを地図上にドラッグ&ドロップし、geojsonファイルを読み込みます。
    2. 交通機関の路線図が線で、バス停（駅）がポイントで地図上に表示されます。
