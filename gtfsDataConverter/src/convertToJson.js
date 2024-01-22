import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import csv from 'csv-parser';
import { Transform } from 'stream';
import gtfsFileList from './gtfsFileList.json' assert { type: "json" };

const dataDirectoryPath = process.cwd() + "/gtfsDataConverter/dataSample";
const exportPath = process.cwd() + "/gtfsDataConverter/convert/";
const prettyTabSpace = '  ';

const requiredFiles = [
  gtfsFileList.routes,
  gtfsFileList.shapes,
  gtfsFileList.stops
];

export async function convertToJson() {
  let target = '';
  if ((process.argv.length > 3) && (typeof (process.argv[3])) == 'string') {
    target = process.argv[3];
  } else {
    console.log(`status: Run with the default path.`);
    target = dataDirectoryPath;
  }


  try {
    fs.accessSync(target, fs.constants.F_OK);
    await processAllDataFolders(target);
  } catch (error) {
    console.error(`Please specify a valid folder path. [${target}]`, error);
  }
  console.log('finish');
}

/**
 * データフォルダ内のフォルダをリストアップし、feedフォルダごとに処理を呼び出す
 * @param {*} targetDir
 */
async function processAllDataFolders(targetDir) {
  try {
    const entries = await fsPromises.readdir(targetDir, { withFileTypes: true, recursive: false });

    for (let entry of entries) {
      if (entry.isDirectory()) {
        const results = await convertFeedFolderFilesToObject(`${entry.path}/${entry.name}`);
        await exportToFile(entry.name, results);
      } else {
        console.warn(`path ignored: [${entry.path}]`)
      }
    };
  } catch (err) {
    console.error(err);
  }
}

/**
 * feedフォルダ（GTFSで公開される、1つの公共交通機関情報）を処理する
 * feedフォルダには通常、1つの運営会社が1エリア内で運行する交通機関の情報が記録される
 * 例: A交通によるB地域内で運行される複数のバス路線情報
 */
async function convertFeedFolderFilesToObject(feedFolder) {
  try {
    const files = await fsPromises.readdir(feedFolder, { withFileTypes: false, recursive: false });
    // check required files
    const containRequired = requiredFiles.every((filename) => {
      return files.includes(filename);
    });
    if (!containRequired) {
      console.warn(`[${feedFolder}] is not contain required files.`);
      return;
    }

    // read file and convert to js object
    const feedData = {};
    feedData.routes = await CSVFileToObject(feedFolder, gtfsFileList.routes);
    feedData.shapes = await CSVFileToObject(feedFolder, gtfsFileList.shapes);
    feedData.stops = await CSVFileToObject(feedFolder, gtfsFileList.stops);

    // geojson format
    const feedGeojson = geojsonMapping(feedData);
    return feedGeojson;
  } catch (error) {
    console.error(error);
  }
}

// can be change to npm package 'strip-bom-stream'
class removeBOMCodeTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // BOMコード削除
    const modifiedChunk = chunk.toString('binary').replace(/\xef\xbb\xbf/g, '');
    // 変換したデータを push して通知
    this.push(Buffer.from(modifiedChunk, 'binary'));
    callback();
  }
}

async function CSVFileToObject(targetDir, filleName) {
  const gtfsData = [];
  await new Promise((resolve) => {
    fs.createReadStream(`${targetDir}/${filleName}`)
      .pipe(new removeBOMCodeTransform())
      .pipe(csv())
      .on('data', (data) => gtfsData.push(data))
      .on('end', () =>  resolve());
    });
  return gtfsData;
}

function geojsonMapping(gtfsInfo) {
  const templateRouteMapping = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: []
    },
    properties: {
      shape_id: ''
    }
  };

  let shapeIDList = [];
  gtfsInfo.shapes.forEach(shape => {
    if (shapeIDList.includes(shape.shape_id) === false) {
      shapeIDList.push(shape.shape_id);
    }
  });

  const routeMapping = {};
  shapeIDList.forEach(id => {
    const route = structuredClone(templateRouteMapping)
    route.properties.shape_id = id;
    routeMapping[id] = route; // routeMapping.push(route);
  });

  // note: this isn't sorted by shape_pt_sequence, use txt file row
  gtfsInfo.shapes.forEach(shape => {
    const pt = [shape.shape_pt_lon, shape.shape_pt_lat];
    routeMapping[shape.shape_id].geometry.coordinates.push(pt);
  });

  const templateStopMapping = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: []
    },
    properties: {}
  };
  const stopMapping = [];

  gtfsInfo.stops.forEach(stop => {
    const pointFeature = structuredClone(templateStopMapping);
    pointFeature.geometry.coordinates = [stop.stop_lon, stop.stop_lat];
    pointFeature.properties = stop;
    stopMapping.push(pointFeature);
  });

  const results = {
    type: "FeatureCollection",
    features: []
  };
  shapeIDList.forEach(id => {
    results.features.push(routeMapping[id]);
  });
  results.features.push(...stopMapping);
  return results;
}

async function exportToFile(name, results) {
  try {
    await fsPromises.mkdir(exportPath, {recursive: true});
    await fsPromises.writeFile(exportPath + name + '.geojson', JSON.stringify(results, null, prettyTabSpace));
  } catch (error) {
    console.error(error);
  }
}