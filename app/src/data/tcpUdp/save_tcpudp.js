/**
 * Created by luochunxiang on 2016/10/26.
 */
 import _ from 'lodash';
 import $ from 'jquery';
 import angular from 'angular';
 import routes from 'ui/routes';
 import uiModules from 'ui/modules';
 import 'ui/notify';
 import saveTemplate from 'plugins/kibana/data/tcpUdp/save_tcpudp.html';

 routes
 .when('/data/tcpUdp/saveTcpudp', {
   template: saveTemplate
 });
 uiModules
 .get('apps/data', ['kibana/notify'])
.controller('saveTcpudp', function ($scope, $location, locals, $http, Notifier,$translate,$translatePartialLoader) {
  $translatePartialLoader.addPart('../plugins/kibana/data');
  $translate.refresh();
  var lang = $translate.use();
  var locationDate;
  if (lang === 'zh-cn') {
    locationDate = '数据';
  } else if (lang === 'zh-tw') {
    locationDate = '資料';
  } else {
    locationDate = 'Date';
  }
  //提示
  const notify = new Notifier({
    location: locationDate
  });
  $scope.viewUploadList = function () {
    //查看告警任务列表
    locals.set('viewUpload', true);
    $location.path('/data/tcpUdp');
  };
  //获取TCP/UDP总数量
  var getRecordConfTotalItems = function () {
    $http.get('/etl/input/tcpUdp/count').success(function (data) {
      locals.set('tcpUdpAllCount', data.count);
      // notify.info('获取TCP/UDP总数量成功！');
    }).error(function (res) {
      notify.error(`${$translate.instant('获取TCP/UDP总数量失败！错误信息')}：${res.errmsg}`);
    });
  };
  getRecordConfTotalItems();
});