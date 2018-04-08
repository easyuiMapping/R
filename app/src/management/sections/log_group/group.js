import { saveAs } from '@spalger/filesaver';
import { extend, find, flattenDeep, partialRight, pick, pluck, sortBy } from 'lodash';
import angular from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import registry from 'plugins/kibana/management/saved_object_registry';
import template from 'plugins/kibana/management/sections/log_group/group.html';
import 'plugins/kibana/management/sections/log_group/new_group';
import 'plugins/kibana/management/sections/log_group/edit_group';
import 'plugins/kibana/management/sections/log_group/style/main.less';
import 'node_modules/angular-tree-control/css/tree-control.css';
import 'node_modules/angular-tree-control/css/tree-control-attribute.css';
import 'node_modules/angular-ui-tree/dist/angular-ui-tree.min.css';
import 'ui/directives/file_upload';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import __ from 'plugins/kibana/management/sections/log_group/components/locale.js';
import comFun from 'plugins/kibana/management/sections/log_group/components/com_fun.js';


const MAX_SIZE = Math.pow(2, 31) - 1;

uiRoutes
.when('/management/kibana/log_group', {
  template: template
});

uiModules.get('apps/management')
.directive('kbnManagementGroup', function (kbnIndex, Notifier, Private, kbnUrl, Promise,) {
  return {
    restrict: 'E',
    controller: function ($scope, $injector, $q, AppState, es , $translate,
      arSafeModalMult,$location,timefilter,$http, as, $timeout,locals,indexPatterns,config) {

      const notify = new Notifier({ location: '日志分组' });

      $scope.lang = $translate.use();

      //获取本地存储的信息
     // let childNode = JSON.parse(window.localStorage.getItem('childNode'));
      let childNode = locals.getObject('childNode', '');

      //初始默认值
      $scope.stateI = {
        'tab': 'Event',//默认显示事件
        'dept': 10,//树的深度
        'groupSelete': false,//新建树节点下拉框,默认不可见
        'activeItemScope': null,//选中该节点的scope
        'activeItem': null,//选中该节点的数据
      };


      //zTree树
      var setting = {
        data: {
          key: {
            title: 'groupName'
          },
          simpleData: {
            enable: true
          }

        },
        callback: {
          onClick: function (event, treeId, treeNode, clickFlag) {
            $scope.treeNode = treeNode;
            if ($scope.seletedNode) {
              if ($scope.seletedNode.groupId === treeNode.groupId) {
                return;
              }
            }

            $scope.noActiveItemScope = false;
            $scope.goViewClick = false;//预览内容默认不可见
            $scope.query = '*';            //过滤条件
            $scope.tab = 'Event';//默认显示事件
            $scope.optionalFields = null;//可选字段清空
            $scope.seletedNode = treeNode;
            if (treeNode.level > 0) {
              $scope.groupingLevel = 'Subgroup';//子分组
            } else {
              $scope.groupingLevel = 'Rootgroup';//子分组
            }
            $scope.getCurrentFiltersAndInheritFilters();
            $scope.storageNodeIime();
          },
          onExpand:function (event,treeId, treeNode) {
            $scope.treeNode = treeNode;
            let treeObj = $.fn.zTree.getZTreeObj('logTree');
            let id = treeNode.groupId;
            let node = treeObj.getNodeByParam('groupId', id);

            if (comFun.arrHasValue($scope.idAndChildren,id)) {return;}
            let hasChildren = treeNode.hasChildren;

            if (hasChildren) {
              //获取日志分组子分组信息
              $http.get(`/manager/loggroup/${id}/children`).success(function (res,status) {
                if (status === 200) {
                  let childrenList = comFun.nodeChange(res);
                  $scope.addChildren(node,childrenList);
                  $scope.idAndChildren.push({id:id,children:childrenList});
                } else {
                  notify.error($translate.instant(`${res.code}group`));
                }

              }).error(function (res) {
                notify.error(res);
              });
            }
          },
          beforeRemove:function (treeId, treeNode) {
            let treeObj = $.fn.zTree.getZTreeObj('logTree');
            let node = treeObj.getNodeByParam('groupId', treeNode.groupId);
            if (node) {

              if (node.level === 0) {
                $scope.seletedTheNode($scope.allLogNode.groupId);
              } else {
                let sNodes = node.getPreNode();
                var pNode = node.getParentNode();
                if (sNodes) {
                  $scope.seletedTheNode(sNodes.groupId);
                } else if (pNode) {
                  $scope.seletedTheNode(pNode.groupId);
                }
              }


            }
          },
          onRemove: function (event, treeId, treeNode) {
            let treeObj = $.fn.zTree.getZTreeObj('logTree');
            let nodes = treeObj.getSelectedNodes();

            $http.delete(`/manager/loggroup/${treeNode.groupId}`).success(function (res,status) {
              if (status === 200) {
                return;
              } else {
                notify.error($translate.instant(`${res.code}group`));
              }
              //$scope.init();
            }).error(function (res) {
              notify.error('删除失败' + res);
            });
          }
        }

      };


      $scope.zNodes = [];
      let zTreeInit = function () {
        let element = $('#logTree');
        $.fn.zTree.init(element, setting, $scope.zNodes);
      };



      let seletedTheNode = function (id,pId) {
        let treeObj = $.fn.zTree.getZTreeObj('logTree');
        let node;
        if (id) {

          node = treeObj.getNodeByParam('groupId', id, pId);
          if (node) {
            treeObj.selectNode(node);
            $scope.treeNode = node;
            if (node.level === 0) {
              $scope.groupingLevel = 'Rootgroup';//当选中的节点为所有日志时，默认为根分组
            } else {
              $scope.groupingLevel = 'Subgroup';//当选中的节点为所有日志时，默认为根分组
            }
          }
        }



        //当前选中的节点，默认为所有日志节点
        $scope.seletedNode = node || $scope.allLogNode;

        //所有日志节点
        $scope.allLogNode = $scope.zNodes[0];

        $scope.storageNodeIime();

      };


      $scope.seletedTheNode = seletedTheNode;


      //添加子节点
      $scope.addChildren = function (treeNode,newNodes) {
        let treeObj = $.fn.zTree.getZTreeObj('logTree');
        treeObj.addNodes(treeNode, newNodes);
      };

      //用来转换type,tags,host ->文本的数组
      $scope.currentFilters = {
        'type':[],
        'tags': [],
        'host': [],
        'advance':''
      };
      $scope.inheritFilters = {
        'type':[],
        'tags': [],
        'host': [],
        'advance':[]
      };
      $scope.typeAll = [{type: 0, negative: 0, value: '*'}];


      //跳转页面
      $scope.jump = function (url) {
        $location.path(url);
      };

      ////////////////////////////////////

      $scope.dept = 10;//树的深度

      //存储当前节点，刷新是展示
      $scope.storageNodeIime = function () {
        let childNode = {
          id:$scope.seletedNode.groupId,
          groupingLevel: $scope.groupingLevel,//是添加根分组还是子分组
        };

        locals.setObject('childNode',childNode);
      };

      $scope.getCurrentFiltersAndInheritFilters = function () {
        $scope.currentFilters = $scope.seletedNode.filters;
        $scope.inheritFilters = $scope.seletedNode.inheritFilters;
      };



      $scope.seletedNode = {};//当前选中的节点
      $scope.allLogNode = {};//所有日志节点



      $scope.angularTreeList = [];

      //初始加载树
      $scope.init = function () {
        $scope.getTreeList();
      };

      //  获取根节点
      $scope.getTreeList = function () {
        $http.get('/manager/loggroup/roots').success(function (res,status) {
          if (status === 200) {
            $scope.zNodes = comFun.nodeChange(res);
            $scope.zNodes[0].name = __.AllLogName;
            $scope.zNodes[0].groupName = __.AllLogName;
            $scope.zNodes[0].description = __.AllLogDescription;
            zTreeInit();
            seletedTheNode($scope.zNodes[0].groupId);
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }
        });
      };



      $scope.reInit = function () {
        $scope.getTreeListFromChildToRoot();
      };

      //获取日志分组子分组信息
      let getchildrenList = function (parentsList) {
        return new Promise(function (resolve, reject) { //做一些异步操作
          let childrenList = [];
          parentsList.map((obj,i)=>{
            let hasChildren = parentsList[i].hasChildren;
            let id = parentsList[i].groupId;
            if (hasChildren) {
              //获取日志分组子分组信息
              $http.get(`/manager/loggroup/${id}/children`).success(function (res, status) {
                if (status === 200) {
                  childrenList.push(comFun.nodeChange(res));
                  if (parentsList.length === childrenList.length + 1) {
                    resolve(childrenList);
                  }
                } else {
                  notify.error($translate.instant(`${res.code}group`));
                }

              });
            }

          });

        });
      };

      let getPaths = function () {
        return new Promise(function (resolve, reject) { //做一些异步操作
          //获取从根节点到当前日志分组的路径信息

          $http.get(`/manager/loggroup/${childNode.id}/paths`).success(function (res,status) {
            if (status === 200) {
              $scope.parentsList = res;
              let treeObj = $.fn.zTree.getZTreeObj('logTree');


              getchildrenList($scope.parentsList).then(res=>{
                let childrenList = res;
                $scope.parentsList.map((obj,i)=>{
                  let hasChildren = $scope.parentsList[i].hasChildren;
                  if (hasChildren) {
                    //添加日志分组子分组信息
                    let id = $scope.parentsList[i].groupId;
                    let pid = $scope.parentsList[i].parentGroupId;
                    let treeNode = treeObj.getNodeByParam('groupId', obj.groupId);
                    if (childrenList[i]) {
                      $scope.addChildren(treeNode,childrenList[i]);
                      $scope.idAndChildren.push({id:id,children:childrenList[i]});
                    }

                  }
                });
              });
              resolve(true);

            } else {
              notify.error($translate.instant(`${res.code}group`));
            }

          });

        });
      };

      let spanningTree = function () {
        return new Promise(function (resolve, reject) { //做一些异步操作
          //获取所有根日志分组

          $http.get('/manager/loggroup/roots').success(function (res,status) {
            if (status === 200) {
              $scope.zNodes = comFun.nodeChange(res);
              $scope.zNodes[0].name = __.AllLogName;
              $scope.zNodes[0].groupName = __.AllLogName;
              $scope.zNodes[0].description = __.AllLogDescription;
              zTreeInit();

              //所有日志节点
              $scope.allLogNode = res[0];

              getPaths().then(res=>{
                resolve(res);
              });

            } else {
              notify.error($translate.instant(`${res.code}group`));
            }

          });
        });
      };


      $scope.getTreeListFromChildToRoot = function () {

        spanningTree().then(res=>{
          //获取当前日志分组信息
          $http.get(`/manager/loggroup/${childNode.id}`).success(function (res,status) {
            if (status === 200) {
              let node = [];
              node.push(res);
              comFun.nodeChange(node);
              $scope.seletedNode = node[0];
              $scope.getCurrentFiltersAndInheritFilters();
              seletedTheNode(node[0].groupId);
            } else {
              notify.error($translate.instant(`${res.code}group`));
            }

          });
          $scope.groupingLevel = childNode.groupingLevel;
        });

      };

      if (childNode.id) {
        $scope.reInit();//刷新或添加子分组后加载子分组到根分组并展开
      } else {
        $scope.init();//初次加载
      }


      $scope.idAndChildren = [];



      //判断删除操作，是否存在选中的节点
      $scope.noDeletGroup = function () {
        if (!$scope.seletedNode) {
          $scope.noActiveItemScope = true;
        }
      };
      //删除节点
      $scope.deletGroup = function () {
        if ($scope.seletedNode) {
          var treeObj = $.fn.zTree.getZTreeObj('logTree');
          var nodes = treeObj.getSelectedNodes();
          if (nodes && nodes.length > 0) {
            treeObj.removeNode(nodes[0],true);
          };


        }

      };
      //4.新建按钮
      $scope.newGroup = function () {
        $scope.jump('/management/kibana/log_group/new_group');
        $scope.logNodeDate = {
          'newOrUp':0,//0:新建,1:编辑
          'groupId' : $scope.seletedNode.groupId,//被选中的节点
          'allLogId': $scope.allLogNode.groupId,//所有日志节点
          'currentFilters':$scope.currentFilters,
          'inheritFilters':$scope.inheritFilters,
        };

        locals.setObject('logNodeDateNew', $scope.logNodeDate);
        //window.localStorage.setItem('logNodeDateNew',JSON.stringify($scope.logNodeDate));

      };

      //编辑节点
      $scope.editGroup = function () {
        $scope.jump('/management/kibana/log_group/edit_group');
        $scope.logNodeDate = {
          'newOrUp': 1,//0:新建,1:编辑
          'seletedNode' : $scope.seletedNode,//被选中的节点
          'allLogNode': $scope.allLogNode,//所有日志节点
          'currentFilters':$scope.currentFilters,
          'inheritFilters':$scope.inheritFilters,
        };

        locals.setObject('logNodeDateEdit', $scope.logNodeDate);

      };


      /*
      可选字段
       */
      $scope.perPage = 25;
      $scope.columns = [
        { title: '字段名称', sortable: false  },
        { title: '字段类型' , sortable: false }
        //{ title: '映射' , sortable: false }
      ];
      $scope.fieldsRows = [];


      //获取可选字段
      let getFields = function (id) {
        $http.get(`/manager/loggroup/${id}/fields`).success(function (res,status) {
          if (status === 200) {
            $scope.optionalFields = res;
            for (let key in $scope.optionalFields) {
              if ($scope.optionalFields.hasOwnProperty(key)) {
                $scope.fieldsRows.push({
                  'fieldName': key,
                  'index': $scope.optionalFields[key].index,
                  'type': $scope.optionalFields[key].type,
                  'mapping': $scope.optionalFields[key].mapping
                });

              }
            }
            /**
             * 分页
             */

            $scope.fieldstotal = $scope.fieldsRows.length;
            $scope.getDiscoverSetting();
            $timeout(function () {
              $scope.getDiscoverSetting();
            });
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }

        });


      };

      //分组定义数组
      $scope.definTab = 'Conventional';//常规
      $scope.groupingDefinitions = [{
        'id':'Conventional',
        'title':'常规'
      }, {
        'id':'High',
        'title':'高级'
      }];
      $scope.changeDefinTab = function (fieldType) {
        $scope.definTab = fieldType.id;
      };

      //事件、可选字段
      $scope.tab = 'Event';//默认显示事件
      $scope.fieldTypes = [{
        'id':'Event',
        'title':'事件'
      }, {
        'id':'Optional fields',
        'title':'可选字段'
      }];

      //事件、可选字段的切换
      $scope.changeTab = function (fieldType) {
        $scope.tab = fieldType.id;
        if ($scope.tab === 'Optional fields' && !$scope.optionalFields) {
          getFields($scope.seletedNode.groupId);
        }
        $scope.getDiscoverSetting();
      };


      //事件列表
      $scope.all = [];
      $scope.arRows = [];

      /**
       * 分页功能
       * @type {{settingConf: {currentPage: number, itemsPerPage: number, totalItems: number, perPageOptions: number[]}}}
       */
      //配置分页基本参数
      $scope.discover = {
        settingConf: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          perPageOptions: [10, 20, 50]
        }
      };
      let getDiscoverSetting = function () {
        let sortStart = $scope.discover.settingConf.itemsPerPage * ($scope.discover.settingConf.currentPage - 1);
        let sortEnd = $scope.discover.settingConf.itemsPerPage * $scope.discover.settingConf.currentPage;
        //事件总数
        if ($scope.all !== undefined) {
          $scope.arRows = $scope.all.slice(sortStart, sortEnd);
        }
        //可选字段
        if ($scope.fieldsRows !== undefined) {
          $scope.fieldRow = $scope.fieldsRows.slice(sortStart, sortEnd);
        }
        if ($scope.tab === 'Event') {
          $scope.discover.settingConf.totalItems = $scope.all.length;
        } else {
          $scope.discover.settingConf.totalItems = $scope.fieldsRows.length;
        }
      };
      $scope.getDiscoverSetting = getDiscoverSetting;

      $scope.$watch('discover.settingConf.currentPage + discover.settingConf.itemsPerPage', getDiscoverSetting);

////显示字段
      $scope.state = {
        columns: ['@timestamp','host','type','tags'],
        sort:['@timestamp','desc',]
      };




      /**
       * 分页
       */


      $scope.filtersText = {
        'must':[],
        'must_not':[],
        'should': []
      };

      $scope.total = 0;

      //预览按钮
      $scope.goViewClick = false;//预览结果默认不可见

      //搜索
      //
      //
      //    //提交搜素任务


      let getView = function () {
        $scope.goViewClick = true;//预览结果默认不可见
        $scope.filtersText = {
          'must':[],
          'must_not':[],
          'should': []
        };
        $scope.refresh();
        $scope.all = [];
        //$scope.arRows = [];
        //    获取参数
        let body = comFun.getSubmit($scope.seletedNode.filters,$scope.filtersText,
          $scope.seletedNode.groupId,$scope.gte,$scope.lte,$scope.query);
        let results = {};
        as(body).then(res=>{
          results = res.responses[0];
          if (results.hits) {

            /**
             * 分页
             */
            let total = results.hits.total;
            $scope.total = total;
            $scope.all = results.hits.hits.slice();
            $scope.all.map((obj,i)=>{
              let source = obj._source;
              for (let key in source) {
                if (key === '@timestamp') {
                  $scope.all[i]._source.timestamp = source[key];
                }
              }

            });
            getDiscoverSetting();
            $timeout(function () {
              getDiscoverSetting();
            });


          }

        });

      };



      $scope.getView = getView;




      //时间过滤器
      timefilter.enabled = true;
      $scope.timefilter = timefilter;

      let getTimeFilter = function () {
        let tFilter = timefilter.getTimestampFange();
        $scope.gte = tFilter.range.gte;
        $scope.lte = tFilter.range.lte;
      };



      $scope.refresh = function () {
        getTimeFilter();

      };

      $scope.$listen(timefilter, 'fetch', getView);

      //过滤条件
      $scope.query = '*';

      $scope.treeOptions = {
        accept: function (sourceNodeScope, destNodesScope, destIndex) {
          return true;
        },
      };


      //设置索引模式
      // $scope.createIndexPattern = function () {
      //   // get an empty indexPattern to start

      //   if (!config.get('defaultIndex')) {
      //     config.set('defaultIndex', 'fe5b7f96-443a-11e7-a467-000c29253e90');
      //   }
      //   //console.log(config.get('defaultIndex'));
      // };

      //$scope.createIndexPattern();



    }
  };
});
