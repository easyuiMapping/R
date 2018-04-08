
import _ from 'lodash';
import $ from 'jquery';
import routes from 'ui/routes';
import uiModules from 'ui/modules';
import tcpUdpTemplate from 'plugins/kibana/data/tcpUdp/template.html';
import 'ui/anyrobot_ui/tm.pagination';
import 'plugins/kibana/data/tcpUdp/new_tcpudp';
import 'ui/notify';

routes
.when('/data/tcpUdp', {
  template: tcpUdpTemplate
});

uiModules
.get('apps/data', ['kibana/notify'])


.controller('tcpUdpCtrl', function ($scope, $location, $http, locals, Notifier,$translate,$translatePartialLoader,
  $modal,$timeout) {

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


  var nowDataIndexItemsPerPage = locals.get('curDataIndexItemsPerPage', '');
 // var pageDataIndexcurrentPage = locals.get('pageDataIndexcurrentPage',null);
 //配置分页基本参数
  $scope.pageData = {
    indexConf: {
      currentPage: 1,
      itemsPerPage: nowDataIndexItemsPerPage ? nowDataIndexItemsPerPage : 10,
      // itemsPerPage:2,
      perPageOptions: [10, 15, 20, 30, 50]
    }
  };
  // if(pageDataIndexcurrentPage == 'null'||pageDataIndexcurrentPage == null||pageDataIndexcurrentPage == 'undefined'){
  //   $scope.pageData.indexConf.currentPage = 1;
  // }else{
  //   $scope.pageData.indexConf.currentPage = pageDataIndexcurrentPage;
  // }
  //获取TCP/UDP总数量
  var getRecordConfTotalItems = function () {
    $http.get(`/etl/input/tcpUdp/count?timestamp = ${new Date().getTime()}`).success(function (data) {
      $scope.pageData.indexConf.totalItems = data.count;
      // notify.info('获取TCP/UDP总数量成功！');
    }).error(function (res, status) {
      if (status === 502) {
        notify.error($translate.instant('获取TCP/UDP总数量失败: 服务异常！'));
      } else {
        notify.error(`${$translate.instant('获取TCP/UDP总数量失败')}:${res.message}`);
      }
    });
  };
  getRecordConfTotalItems();
  var rememberTcpUdpCurPage = function () {
    //点击新建的返回按钮
    var returnTcpUdp = locals.get('returnTcpUdp', '');
    //点击查看列表
    var nowViewUpload = locals.get('viewUpload', '');
    //在这个界面获取数据总数有时延，所以在保存成功后获取放在localStorage
    var nowTcpUdpAllCount = locals.get('tcpUdpAllCount', '');
    //记忆当前为第几页及当前每页显示多少条
    var nowCurTcpUdpPage = locals.getObject('curTcpUdpPage', '');
    if (nowViewUpload) {
      if (nowCurTcpUdpPage.status === 'edit') {
        $scope.pageData = {
          indexConf: {
            itemsPerPage:nowDataIndexItemsPerPage ? nowDataIndexItemsPerPage : 10,
            currentPage: nowCurTcpUdpPage.page
          }
        };
      } else if (nowCurTcpUdpPage.status === 'new') {
        $scope.pageData = {
          indexConf: {
            itemsPerPage:nowDataIndexItemsPerPage ? nowDataIndexItemsPerPage : 10,
            currentPage: Math.ceil(nowTcpUdpAllCount / $scope.pageData.indexConf.itemsPerPage)
          }
        };
      };
    }
    //新建的返回按钮
    if (returnTcpUdp) {
      if (nowCurTcpUdpPage.status === 'new' || nowCurTcpUdpPage.status === 'edit') {
        $scope.pageData = {
          indexConf: {
            itemsPerPage:nowDataIndexItemsPerPage ? nowDataIndexItemsPerPage : 10,
            currentPage:nowCurTcpUdpPage.returnPage
          }
        };
      };
    }
    //使用完即销毁
    locals.set('viewUpload', '');
    locals.set('returnTcpUdp', '');
    locals.set('tcpUdpAllCount', '');
    locals.setObject('curTcpUdpPage', '');
  };
  rememberTcpUdpCurPage();




 //分页获取TCP/UDP
  var getDataLog = function (lim) {
    $http.get(`/etl/input/tcpUdp/list?start=${$scope.dataIndexStart}&limit=${lim}&timestamp = ${new Date().getTime()}`)
    .success(function (data) {
      $scope.items = data;
    }).error(function (res) {
    });
  };
  //获取每页TCP/UDP
  var getDataIndex = function () {
    //start = (currentPage - 1)*itemsPerPage
    // console.log($scope.pageData.indexConf.currentPage)
    locals.set('curDataIndexItemsPerPage', $scope.pageData.indexConf.itemsPerPage);

    if ($scope.pageData.indexConf.currentPage === 0) {
      $scope.pageData.indexConf.currentPage = 1;
    }
    $scope.dataIndexStart = ($scope.pageData.indexConf.currentPage - 1) * $scope.pageData.indexConf.itemsPerPage;
    // 判断如果点击的为最后一个，limit=-1
    $scope.dataIndexFlag = parseInt($scope.pageData.indexConf.totalItems / $scope.pageData.indexConf.itemsPerPage);
    if ($scope.dataIndexFlag + 1 === $scope.pageData.indexConf.currentPage) {
      getDataLog(-1);
      return;
    };
    //获取信息
    getDataLog($scope.pageData.indexConf.itemsPerPage);
  };
  //监听currentPage，itemsPerPage
  $scope.$watch('pageData.indexConf.currentPage + pageData.indexConf.itemsPerPage', getDataIndex);





  //跳转页面
  $scope.jump = function (url) {
    $location.path(url);
  };

  $scope.curState = {
    state :'暂停',
    stateClass:'warning',
    stateIcon:'pause'
  };



  //修改TCP/UDP
  $scope.newTcpUdpEdit = function (index) {
    var args = {};
    args.data = $scope.items[index];
    args.new = false;
    locals.set('ruleName',null);
    // locals.set('pageDataIndexcurrentPage',$scope.pageData.indexConf.currentPage);
    locals.set('argId',args.data.id);
    locals.setObject('arg',args);
    locals.setObject('TcpArg',{});

    //编辑的时候，记忆当前为第几页
    var curTcpUdpPage = {};
    curTcpUdpPage.status = 'edit';
    curTcpUdpPage.page = $scope.pageData.indexConf.currentPage;
    curTcpUdpPage.returnPage = $scope.pageData.indexConf.currentPage;
    locals.setObject('curTcpUdpPage', curTcpUdpPage);


    $scope.jump('/data/tcpUdp/newTcpUdp');
  };

  //更改状态
  $scope.curStateChange = function (item) {
    let data = item;
    let msg = '';
    let thisDataId = data.id;
    if (data.status) {
      data.status = 0;
      msg = $translate.instant('已关闭当前数据输入。');
    } else {
      data.status = 1;
      msg = $translate.instant('已开启当前数据输入。');
    }
    $http.put(`/etl/input/tcpUdp/${thisDataId}`,data).success(function () {
      notify.info(msg);
    }).error(function (res,status) {
      if (data.status) {
        data.status = 0;
      } else {
        data.status = 1;
      }
      if (status === 502) {
        notify.error($translate.instant('更改状态失败：服务异常！'));
      } else {
        notify.error(`${$translate.instant('更改状态失败')}：${res.message}`);
      }

    });
  };

  //新建TCP/UDP
  $scope.newTcpUdp = function () {
    var args = {};
    args.new = true;
    args.data = {};
    locals.set('ruleName',null);
    locals.set('argId','');
    locals.setObject('arg',args);
    locals.setObject('TcpArg',{});


    //新建的时候，记忆当前为第几页
    var curTcpUdpPage = {};
    curTcpUdpPage.status = 'new';
    curTcpUdpPage.page = '';
    curTcpUdpPage.returnPage = $scope.pageData.indexConf.currentPage;
    locals.setObject('curTcpUdpPage', curTcpUdpPage);


    $scope.jump('/data/tcpUdp/newTcpUdp');
  };



  var timeout;

  //删除TCP/UDP
  var newTcpUdpClear = function (index) {
    var deleteDataId = $scope.items[index].id;
    $http.delete(`/etl/input/tcpUdp/${deleteDataId}`).success(function () {
      $scope.items.splice(index, 1);
      getRecordConfTotalItems();
      getDataIndex();
    }).error(function (data,status) {
      if (status === 502) {
        notify.error($translate.instant('删除失败:服务异常！'));
      } else {
        notify.error(`${$translate.instant('删除失败')}:${data.message}`);
      }

    });
  };

  $scope.newTcpUdpClear = newTcpUdpClear;

}
);

module.exports = {
  order: Infinity,
  name: 'tcpUdp',
  display: 'tcpUdp',
  url: '#/data/tcpUdp'
};


