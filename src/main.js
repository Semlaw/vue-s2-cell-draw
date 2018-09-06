import Vue from 'vue';
import VueAMap from 'vue-amap';
import App from './App.vue';

Vue.use(VueAMap);
VueAMap.initAMapApiLoader({
  key: '17c4c61dc60c2a81a0c7def2fff6c7a8',
  plugin: [
    'AMap.Autocomplete',
    'AMap.PlaceSearch',
    'AMap.Scale',
    'AMap.OverView',
    'AMap.ToolBar',
    'AMap.MapType',
    'AMap.PolyEditor',
    'AMap.CircleEditor'
  ],
  // 默认高德 sdk 版本为 1.4.4
  v: '1.4.4'
});

new Vue({
  el: '#app',
  render: h => h(App)
});
