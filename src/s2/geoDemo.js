const { S2 } = require('s2-geometry');

function createPointFilter([southwest, northeast], zoom) {
  const blurMultiple = getBlurMultiple(zoom);
  const leftLng = southwest[0] - (northeast[0] - southwest[0]) * blurMultiple;
  const rightLng = northeast[0] + (northeast[0] - southwest[0]) * blurMultiple;
  const topLat = northeast[1] + (northeast[1] - southwest[1]) * blurMultiple;
  const downLat = southwest[1] - (northeast[1] - southwest[1]) * blurMultiple;
  return function pointerFilter(point) {
    const [lng, lat] = point.lngLat;
    if (lng < rightLng && lng > leftLng && lat > downLat && lat < topLat) {
      return true;
    }
    return false;
  };
}

// 判断点是否在区域内的，扩大范围比
// const blurMultiple = 0.1;
function getBlurMultiple(zoom) {
  if (zoom <= 16) {
    return 0.1;
  } else if (zoom === 18) {
    return 2;
  } else if (zoom > 18) {
    return 3;
  }
  return 0.3;
}

// 获取矩形四个点的值
function rectFromPoint({ lng, lat }, lngLatIncrement, S2Key) {
  const northeast = [lng + lngLatIncrement.lng, lat + lngLatIncrement.lat];
  const southeast = [lng + lngLatIncrement.lng, lat - lngLatIncrement.lat];
  const southwest = [lng - lngLatIncrement.lng, lat - lngLatIncrement.lat];
  const northwest = [lng - lngLatIncrement.lng, lat + lngLatIncrement.lat];
  return {
    path: [northeast, southeast, southwest, northwest],
    center: [lng, lat],
    S2Key
  };
}

// google S2 level
// const _level = 16;
// 最大取样cell数

function getMaxCellNumber(zoom) {
  // return 3;
  if (zoom <= 16) {
    return 1e5;
  } else if (zoom >= 18) {
    return 2e4;
  }

  return 9e4;
}

// 获取能够覆盖屏幕的S2网格
function getPointListFromPoint([lng, lat], bounds, level = 16, zoom) {
  const maxSampleCellNumber = getMaxCellNumber(zoom);
  const centerKey = S2.latLngToKey(lat, lng, level);
  // samplePointList {lngLat:[lng,lat],S2Key}
  const samplePointList = [];
  let currentKey = S2.stepKey(
    centerKey,
    -parseInt(maxSampleCellNumber / 2, 10)
  );
  for (let i = 0; i < maxSampleCellNumber; i += 1) {
    const latLng = S2.keyToLatLng(currentKey);
    samplePointList.push({
      S2Key: currentKey,
      lngLat: [latLng.lng, latLng.lat]
    });
    currentKey = S2.nextKey(currentKey);
  }
  const pointFilter = createPointFilter(bounds, zoom);
  const targetPointList = samplePointList.filter(pointFilter);
  return targetPointList;
}

/**
 * A --------- B
 * |     |     |
 * | ----O---- |
 * |     |     |
 * D ----------C
 */

/**
 *求偏移量的过程
 *通过S2.latLngToNeighborKeys方法可以获取A、B、C、D、四个点，
 *四个点形成的四边形的面积大约等于实际一个网格面积的4倍
 *使用OA、BO、CO、DO、的四个向量一半可以得到所求网格的四个点（网格的中心点已知）
 *
 */
function deboxByKey1(s2Key) {
  const { lat, lng } = S2.keyToLatLng(s2Key);
  const level = s2Key.length - 2;
  const neighbors = S2.latLngToNeighborKeys(lat, lng, level);
  // [ keyLeft, keyDown, keyRight, keyUp ]
  const rightKey = neighbors[2];
  const topKey = neighbors[3];
  const rightLatLng = S2.keyToLatLng(rightKey);
  const topLatLng = S2.keyToLatLng(topKey);
  const increment = {
    lng: (rightLatLng.lng - lng) / 2,
    lat: (topLatLng.lat - lat) / 2
  };
  return rectFromPoint({ lng, lat }, increment, s2Key);
}

function createPolygonListFromPoint1([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  return targetPointList.map(({ S2Key }) => {
    return deboxByKey1(S2Key);
  });
}

function deboxByKey2(s2Key) {
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

function createPolygonListFromPoint2([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  console.log('createPolygonListFromPoint2');

  return targetPointList.map(({ S2Key }) => {
    return deboxByKey2(S2Key);
  });
}

function getPolygonOffsetFromPoint3([_lng, _lat], level = 16) {
  const s2Key = S2.latLngToKey(_lat, _lng, level);
  const { lng, lat } = S2.keyToLatLng(s2Key);
  // const key = S2.latLngToKey(lat, lng, level);
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
function polygonFromPoint3(point, polygonOffset) {
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

/* eslint-disable-next-line */
function getPolygonOffsetFromPoint_([lng, lat], level = 16) {
  // const key = S2.latLngToKey(lat, lng, level);
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

  const ret = [APointOffset, BPointOffset, CPointOffset, DPointOffset];

  const APoint_ = [lng - APointOffset[0], lat - APointOffset[1]];
  const BPoint_ = [lng - BPointOffset[0], lat - BPointOffset[1]];
  const CPoint_ = [lng - CPointOffset[0], lat - CPointOffset[1]];
  const DPoint_ = [lng - DPointOffset[0], lat - DPointOffset[1]];

  let lngSum = 0;
  let latSum = 0;
  [APoint_, BPoint_, CPoint_, DPoint_].forEach(([_lng, _lat]) => {
    lngSum += _lng;
    latSum += _lat;
  });
  const gravityCenter = [lngSum / 4, latSum / 4];
  const gravityOffset = [gravityCenter[0] - lng, gravityCenter[1] - lat];
  ret.forEach(aPointOffset => {
    aPointOffset[0] += gravityOffset[0];
    aPointOffset[1] += gravityOffset[1];
  });
  return ret;
}

function createPolygonListFromPoint3([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  console.log('createPolygonListFromPoint3');

  const fourtPointOffset = getPolygonOffsetFromPoint3([lng, lat], level);

  const polygonList = targetPointList.reduce((arr, point) => {
    arr.push(polygonFromPoint3(point, fourtPointOffset));
    return arr;
  }, []);
  return polygonList;
}

/**
 * A --- B
 * |     |
 * |     |
 * D --- C
 * return [APointOffset,BPointOffset,CPointOffset,DPointOffset]
 */
function deboxByKey4(s2Key) {
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

function createPolygonListFromPoint4([lng, lat], bounds, level = 16, zoom) {
  const targetPointList = getPointListFromPoint(
    [lng, lat],
    bounds,
    level,
    zoom
  );
  console.log('createPolygonListFromPoint2');

  return targetPointList.map(({ S2Key }) => {
    return deboxByKey4(S2Key);
  });
}
export default {
  // 假设网格是从正方形平面中等分出来的矩形
  createPolygonListFromPoint1,
  // 假设每个网格的形状相同
  createPolygonListFromPoint2,
  // 假设每个网格的形状相同。将算法优化，只求一次偏移量
  createPolygonListFromPoint3,
  createPolygonListFromPoint4
};
