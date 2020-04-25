<template>
  <div id="app">
    <div class="container">
      <el-amap :zoom="defaultZoom"
               :zooms="[2,19]"
               :events="events"
               class="amap-box"
               :vid="'amap-vue'"
               :plugin="plugins">
        <el-amap-info-window :key="'window_'+currentWindow.S2Key"
                             :position="currentWindow.position"
                             :content="currentWindow.content"
                             :visible="currentWindow.visible"
                             :events="currentWindow.events" />
        <el-amap-text v-for="(text,idx) in texts"
                      :key="'text@'+idx"
                      :text="text.text"
                      :offset="text.offset"
                      :position="text.position"
                      :events="text.events" />
        <el-amap-polygon v-for="polygon in polygons"
                         :key="polygon.S2Key"
                         :path="polygon.path"
                         :ext-data="polygon.extData"
                         :stroke-color="polygon.strokeColor"
                         :stroke-weight="polygon.strokeWeight"
                         :stroke-opacity="polygon.strokeOpacity"
                         :fill-opacity="polygon.fillOpacity"
                         :fill-color="polygon.fillColor"
                         :z-index="polygon.zindex"
                         :events="polygon.events" />
        <el-amap-polyline :path="polyline.path" />
      </el-amap>
    </div>
  </div>
</template>

<script>
import s2Cell from 's2-cell-draw';
const { S2 } = require('s2-geometry');
window.S2 = S2;  


export default {
  name: 'app',
  data() {
    return {
      defaultZoom: 17,
      events: {
        init: (amapInstance) => {
          if (this.devMode) {
            window.S2 = S2;
            window.amap = amapInstance;
            window.gridDataView = this;
          }
          this.amap = amapInstance;
        },
        complete: () => {
          this.mapLoading = false;
          this.debounceDraw();
        },
        mapmove: () => {
          this.debounceDraw();
        },
        zoomchange: () => {
          this.debounceDraw();
        }
      },
      plugins: [{
        pName: 'OverView',
        isOpen: true,
        liteStyle: true,
        events: {}
      }, {
        pName: 'ToolBar',
        position: 'RT',
        direction: false,
        liteStyle: true,
        locate: false,
        events: {
          init() {
          }
        }
      }, {
        pName: 'Scale',
        events: {}
      }],
      currentWindow: {
        position: [0, 0],
        content: '',
        events: {},
        visible: false
      },
      texts: [

      ],
      polyline: {

      },
      polygons: [],
      isTestMode: false,
      devMode: true
    };
  },
  destroyed() {
    if (this.timer) clearTimeout(this.timer);
  },
  methods:{
    createPolygonOption(polygon) {
      const { S2Key, path } = polygon;
      const S2Id = S2.keyToId(S2Key);

      const ret = {
        fillOpacity: 0,
        fillColor: '#6699FF',
        strokeColor:'#acacac',
        strokeWeight:1,
        strokeOpacity:0.8,
        S2Key,
        S2Id,
        polygon,
        gridData: {},
        extData: { polygon },
        path,
      };

      ret.events = {
        click: (e) => {
          const { center, S2Key } = polygon;
          this.showLabel(center, polygon);
          const level = S2Key.length - 2;
          const calcS2Key = S2.latLngToKey(e.lnglat.lat, e.lnglat.lng, level);
          console.log('calcS2Key===S2Key', calcS2Key===S2Key);
          console.log(polygon,e);
        }
      };

      return ret;
    },
    showLabel(point,polygon){
      const S2Key = polygon.S2Key;
      if(!polygon.S2Id){
        polygon.S2Id = S2.keyToId(S2Key);
      }
      const s2Level = S2Key.length -2;
      const S2Id = polygon.S2Id;
      const content = `
              经度:${point[0]}<br>
              纬度:${point[1]}<br>
              S2Key: ${polygon.S2Key} <br>
              S2Id:${S2Id}<br>
              S2网格Lvel:${s2Level}
            `
      this.currentWindow = {
        position: point,
        content,
        events: {

        },
        S2Key,
        S2Id,
        visible: true
      };
    },
    draw() {
      const amapInstance = this.amap;
      const zoom = amapInstance.getZoom();
     
      if (zoom < 14) {
        this.polygons = [];
        this.texts = [];
        this.polygons = [];
        return;
      }
      let level = 16;
      if (zoom === 15) {
        level = 15;
      }

      if (zoom === 14) {
        level = 14;
      }
      console.log('draw');
      
      const bounds = amapInstance.getBounds();
      console.time('polygonList');
      
      const polygonList = s2Cell.createPolygonListFromBounds(
        {
          bounds: [
            [bounds.southwest.lng, bounds.southwest.lat],
            [bounds.northeast.lng, bounds.northeast.lat],
          ],
          level
        }
      );
      console.timeEnd('polygonList');

      this.polygons = polygonList.reduce((arr, polygon) => {
        const polygonsOptions = this.createPolygonOption(polygon, level);
        arr.push(polygonsOptions);
        return arr;
      }, []);
      console.log('polygons',this.polygons)

      if (this.isTestMode) {
        // 展示曲线序号
        this.texts = polygonList.reduce((arr, polygon, idx) => {
          arr.push({
            text: polygon.txt ? polygon.txt : (idx+''),
            position: polygon.center,
            offset: [0, 0],
          });
          return arr;
        }, []);

        // 展示希尔伯特曲线连线
        this.polyline = {
          path: polygonList.map(polygon => polygon.center)
        };
      }
    },
    debounceDraw() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.draw();
      }, 300);
    },
  }
};
</script>

<style lang="scss">
html,
body {
  height: 100%;
  margin: 0;
}
#app {
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
.container {
  height: 100%;
}
h1,
h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
