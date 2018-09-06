const { S2 } = require('s2-geometry');

/**
 * 求网格polygon过程
 * 1.传入center，bounds ，zoom；
 * 2.根据zoom确定maxSampleCell数n,获取center点在希尔伯特曲线上的前后n/2个点。
 * 3.以比bounds稍大的区域范围过滤sampleCell,得到keyList。
 * 4.确定多边形(四边形)的四个点相对中点的偏移量。
 * 5.得到polygonList。
 */

/**
 * A --------- B
 * |     |     |
 * | ----O---- |
 * |     |     |
 * D ----------C
 */

/**
 *求网格（四边形）四个点的过程
 *通过S2.latLngToNeighborKeys方法可以获取A、B、C、D、四个点，
 *四个点形成的四边形的面积大约等于实际一个网格面积的4倍
 *使用OA、BO、CO、DO、的四个向量一半可以得到每个网格的四个点（网格的中心点已知）
 *
 */

// google S2 level

function polygonFromPoint(point, polygonOffset) {
  // point {lngLat:[lng,lat],S2Key}
  const [lng, lat] = point.lngLat;
  const APoint = [lng - polygonOffset[0][0], lat - polygonOffset[0][1]];
  const BPoint = [lng - polygonOffset[1][0], lat - polygonOffset[1][1]];
  const CPoint = [lng - polygonOffset[2][0], lat - polygonOffset[2][1]];
  const DPoint = [lng - polygonOffset[3][0], lat - polygonOffset[3][1]];

  return {
    path: [APoint, BPoint, CPoint, DPoint],
    center: [lng, lat],
    S2Key: point.S2Key
  };
}

/**
 * bounds: [[southwest.lng, southwest.lat],[northeast.lng, northeast.lat]]
 */
// 获取能够覆盖屏幕的S2网格
function getPointListFromPoint([_lng, _lat], bounds, level = 16) {
  const splitCount = 2.5;
  const blurRatio = 0;
  const s2Key = S2.latLngToKey(_lat, _lng, level);
  const { lng, lat } = S2.keyToLatLng(s2Key);
  const neighborsKey = S2.latLngToNeighborKeys(lat, lng, level);
  const { lng: rightLng } = S2.keyToLatLng(neighborsKey[2]);
  const { lat: topLat } = S2.keyToLatLng(neighborsKey[3]);
  const unitLng = rightLng - lng;
  const unitLat = topLat - lat;
  const startLng = bounds[0][0] - unitLng * blurRatio;
  const endLng = bounds[1][0] + unitLng * blurRatio;
  const startLat = bounds[0][1] - unitLat * blurRatio;
  const endLat = bounds[1][1] + unitLat * blurRatio;
  const stepLng = unitLng / splitCount;
  const stepLat = unitLat / splitCount;
  const pointList = [];
  for (let lngNum = startLng; lngNum < endLng; lngNum += stepLng) {
    for (let latNum = startLat; latNum < endLat; latNum += stepLat) {
      pointList.push([lngNum, latNum]);
    }
  }
  const mapObj = pointList.reduce((obj, [lng, lat]) => {
    obj[S2.latLngToKey(lat, lng, level)] = true;
    return obj;
  }, {});
  const ret = Object.keys(mapObj).map(key => {
    const latLng = S2.keyToLatLng(key);
    return {
      S2Key: key,
      lngLat: [latLng.lng, latLng.lat]
    };
  });
  console.log('list', ret);
  return ret;

  // [ keyLeft, keyDown, keyRight, keyUp ]
}

/**
 * A --------- B
 * |     |     |
 * | ----O---- |
 * |     |     |
 * D ----------C
 * return [halfOA,halfOB,halfOC,halfOD]
 */
function getPolygonOffsetFromPoint([_lng, _lat], level = 16) {
  // const key = S2.latLngToKey(lat, lng, level);
  const s2Key = S2.latLngToKey(_lat, _lng, level);
  const { lng, lat } = S2.keyToLatLng(s2Key);
  const centerPointNeighborsKey = S2.latLngToNeighborKeys(lat, lng, level);
  // [ keyLeft, keyDown, keyRight, keyUp ]
  const leftSideCenterLatLng = S2.keyToLatLng(centerPointNeighborsKey[0]);
  const rightSideCenterLatLng = S2.keyToLatLng(centerPointNeighborsKey[2]);
  const leftSideCenterPointNeighborsKey = S2.latLngToNeighborKeys(
    leftSideCenterLatLng.lat,
    leftSideCenterLatLng.lng,
    level
  );
  const rightSideCenterPointNeighborsKey = S2.latLngToNeighborKeys(
    rightSideCenterLatLng.lat,
    rightSideCenterLatLng.lng,
    level
  );
  const center = [lng, lat];
  const APointLatLng = S2.keyToLatLng(leftSideCenterPointNeighborsKey[3]);
  const BPointLatLng = S2.keyToLatLng(rightSideCenterPointNeighborsKey[3]);
  const CPointLatLng = S2.keyToLatLng(rightSideCenterPointNeighborsKey[1]);
  const DPointLatLng = S2.keyToLatLng(leftSideCenterPointNeighborsKey[1]);
  const APoint = [APointLatLng.lng, APointLatLng.lat];
  const BPoint = [BPointLatLng.lng, BPointLatLng.lat];
  const CPoint = [CPointLatLng.lng, CPointLatLng.lat];
  const DPoint = [DPointLatLng.lng, DPointLatLng.lat];
  const section = 0.5;
  const APointOffset = [
    (center[0] - APoint[0]) * section,
    (center[1] - APoint[1]) * section
  ];
  const BPointOffset = [
    (center[0] - BPoint[0]) * section,
    (center[1] - BPoint[1]) * section
  ];
  const CPointOffset = [
    (center[0] - CPoint[0]) * section,
    (center[1] - CPoint[1]) * section
  ];
  const DPointOffset = [
    (center[0] - DPoint[0]) * section,
    (center[1] - DPoint[1]) * section
  ];
  return [APointOffset, BPointOffset, CPointOffset, DPointOffset];
}

/**
 * A --- B
 * |     |
 * |  G  |
 * |     |
 * D --- C
 * G:重心点
 * return [GA,GB,GC,GD]
 *
 */
function getPolygonOffsetFromPoint2([_lng, _lat], level = 16) {
  // const key = S2.latLngToKey(lat, lng, level);
  const s2Key = S2.latLngToKey(_lat, _lng, level);
  const { lng, lat } = S2.keyToLatLng(s2Key);
  const CPointNeighborsKey = S2.latLngToNeighborKeys(lat, lng, level);
  // [ keyLeft, keyDown, keyRight, keyUp ]
  const BPointLatLng = S2.keyToLatLng(CPointNeighborsKey[3]);
  const DPointLatLng = S2.keyToLatLng(CPointNeighborsKey[0]);
  const DPointNeighborsKey = S2.latLngToNeighborKeys(
    DPointLatLng.lat,
    DPointLatLng.lng,
    level
  );
  const APointLatLng = S2.keyToLatLng(DPointNeighborsKey[3]);
  const APoint = [APointLatLng.lng, APointLatLng.lat];
  const BPoint = [BPointLatLng.lng, BPointLatLng.lat];
  const CPoint = [lng, lat];
  const DPoint = [DPointLatLng.lng, DPointLatLng.lat];
  let lngSum = 0;
  let latSum = 0;
  [APoint, BPoint, CPoint, DPoint].forEach(([_lng, _lat]) => {
    lngSum += _lng;
    latSum += _lat;
  });
  const gravityCenter = [lngSum / 4, latSum / 4];
  const APointOffset = [
    gravityCenter[0] - APoint[0],
    gravityCenter[1] - APoint[1]
  ];
  const BPointOffset = [
    gravityCenter[0] - BPoint[0],
    gravityCenter[1] - BPoint[1]
  ];
  const CPointOffset = [
    gravityCenter[0] - CPoint[0],
    gravityCenter[1] - CPoint[1]
  ];
  const DPointOffset = [
    gravityCenter[0] - DPoint[0],
    gravityCenter[1] - DPoint[1]
  ];
  const ret = [APointOffset, BPointOffset, CPointOffset, DPointOffset];
  return ret;
}

function createPolygonListFromPoint([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  const fourtPointOffset = getPolygonOffsetFromPoint([lng, lat], level);

  const polygonList = targetPointList.map(point => {
    return polygonFromPoint(point, fourtPointOffset);
  });
  return polygonList;
}

function createPolygonListFromPoint2([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  const fourtPointOffset = getPolygonOffsetFromPoint2([lng, lat], level);

  const polygonList = targetPointList.reduce((arr, point) => {
    arr.push(polygonFromPoint(point, fourtPointOffset));
    return arr;
  }, []);
  return polygonList;
}

/**
 * A --------- B
 * |     |     |
 * | ----O---- |
 * |     |     |
 * D ----------C
 */
function deboxByKey(s2Key) {
  const { lat, lng } = S2.keyToLatLng(s2Key);
  const level = s2Key.length - 2;
  const centerPointNeighborsKey = S2.latLngToNeighborKeys(lat, lng, level);
  // [ keyLeft, keyDown, keyRight, keyUp ]
  const leftSideCenterLatLng = S2.keyToLatLng(centerPointNeighborsKey[0]);
  const rightSideCenterLatLng = S2.keyToLatLng(centerPointNeighborsKey[2]);
  const leftSideCenterPointNeighborsKey = S2.latLngToNeighborKeys(
    leftSideCenterLatLng.lat,
    leftSideCenterLatLng.lng,
    level
  );
  const rightSideCenterPointNeighborsKey = S2.latLngToNeighborKeys(
    rightSideCenterLatLng.lat,
    rightSideCenterLatLng.lng,
    level
  );
  const center = [lng, lat];
  const APointLatLng = S2.keyToLatLng(leftSideCenterPointNeighborsKey[3]);
  const BPointLatLng = S2.keyToLatLng(rightSideCenterPointNeighborsKey[3]);
  const CPointLatLng = S2.keyToLatLng(rightSideCenterPointNeighborsKey[1]);
  const DPointLatLng = S2.keyToLatLng(leftSideCenterPointNeighborsKey[1]);
  const APoint = [APointLatLng.lng, APointLatLng.lat];
  const BPoint = [BPointLatLng.lng, BPointLatLng.lat];
  const CPoint = [CPointLatLng.lng, CPointLatLng.lat];
  const DPoint = [DPointLatLng.lng, DPointLatLng.lat];
  const section = 0.5;
  const APointOffset = [
    (center[0] - APoint[0]) * section,
    (center[1] - APoint[1]) * section
  ];
  const BPointOffset = [
    (center[0] - BPoint[0]) * section,
    (center[1] - BPoint[1]) * section
  ];
  const CPointOffset = [
    (center[0] - CPoint[0]) * section,
    (center[1] - CPoint[1]) * section
  ];
  const DPointOffset = [
    (center[0] - DPoint[0]) * section,
    (center[1] - DPoint[1]) * section
  ];
  const northwest = [lng - APointOffset[0], lat - APointOffset[1]];
  const northeast = [lng - BPointOffset[0], lat - BPointOffset[1]];
  const southeast = [lng - CPointOffset[0], lat - CPointOffset[1]];
  const southwest = [lng - DPointOffset[0], lat - DPointOffset[1]];

  return {
    path: [northwest, northeast, southeast, southwest],
    center: [lng, lat],
    S2Key: s2Key
  };
}

/**
 * A --- B
 * |     |
 * |  G  |
 * |     |
 * D --- C
 * G:重心点
 *
 */
function deboxByKey2(s2Key) {
  const { lat, lng } = S2.keyToLatLng(s2Key);
  const level = s2Key.length - 2;
  const CPointNeighborsKey = S2.latLngToNeighborKeys(lat, lng, level);
  // [ keyLeft, keyDown, keyRight, keyUp ]
  const BPointLatLng = S2.keyToLatLng(CPointNeighborsKey[3]);
  const DPointLatLng = S2.keyToLatLng(CPointNeighborsKey[0]);
  const DPointNeighborsKey = S2.latLngToNeighborKeys(
    DPointLatLng.lat,
    DPointLatLng.lng,
    level
  );
  const APointLatLng = S2.keyToLatLng(DPointNeighborsKey[3]);
  const APoint = [APointLatLng.lng, APointLatLng.lat];
  const BPoint = [BPointLatLng.lng, BPointLatLng.lat];
  const CPoint = [lng, lat];
  const DPoint = [DPointLatLng.lng, DPointLatLng.lat];
  let lngSum = 0;
  let latSum = 0;
  [APoint, BPoint, CPoint, DPoint].forEach(([_lng, _lat]) => {
    lngSum += _lng;
    latSum += _lat;
  });
  const gravityCenter = [lngSum / 4, latSum / 4];
  const APointOffset = [
    gravityCenter[0] - APoint[0],
    gravityCenter[1] - APoint[1]
  ];
  const BPointOffset = [
    gravityCenter[0] - BPoint[0],
    gravityCenter[1] - BPoint[1]
  ];
  const CPointOffset = [
    gravityCenter[0] - CPoint[0],
    gravityCenter[1] - CPoint[1]
  ];
  const DPointOffset = [
    gravityCenter[0] - DPoint[0],
    gravityCenter[1] - DPoint[1]
  ];
  const northwest = [lng - APointOffset[0], lat - APointOffset[1]];
  const northeast = [lng - BPointOffset[0], lat - BPointOffset[1]];
  const southeast = [lng - CPointOffset[0], lat - CPointOffset[1]];
  const southwest = [lng - DPointOffset[0], lat - DPointOffset[1]];

  return {
    path: [northwest, northeast, southeast, southwest],
    center: [lng, lat],
    S2Key: s2Key
  };
}

export default {
  createPolygonListFromPoint,
  createPolygonListFromPoint2,
  getPolygonOffsetFromPoint,
  getPolygonOffsetFromPoint2,
  deboxByKey,
  deboxByKey2
};
