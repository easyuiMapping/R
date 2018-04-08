/**
 * Created by luochunxiang on 2016/10/26.
 */
 import _ from 'lodash';
 import $ from 'jquery';
 import angular from 'angular';
 import routes from 'ui/routes';
 import uiModules from 'ui/modules';
 import 'ui/notify';
 import saveTemplate from 'plugins/kibana/data/agentUpload//save_agent.html';

 routes
 .when('/data/agentUpload/saveAgent', {
   template: saveTemplate
 });
 uiModules
 .get('apps/data', ['kibana/notify'])
.controller('saveAgent', function ($scope, $location, locals, $http, Notifier,$translate,$translatePartialLoader) {
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
    $location.path('/data/agentUpload');
  };
  //获取TCP/UDP总数量
  var getRecordConfTotalItems = function () {
    $http.get('/etl/input/agent/count').success(function (data) {
      locals.set('tcpUdpAllCount', data.count);
    }).error(function (res) {
      notify.error(`${$translate.instant('获取代理总数量失败！错误信息')}：${res.errmsg}`);
    });
  };
  getRecordConfTotalItems();
});