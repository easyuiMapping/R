import { saveAs } from '@spalger/filesaver';
import { extend, find, flattenDeep, partialRight, pick, pluck, sortBy } from 'lodash';
import angular from 'angular';
import registry from 'plugins/kibana/management/saved_object_registry';
import template from 'plugins/kibana/management/sections/log_group/edit_group.html';
import 'ui/directives/file_upload';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import __ from 'plugins/kibana/management/sections/log_group/components/locale.js';
import comFun from 'plugins/kibana/management/sections/log_group/components/com_fun.js';


const MAX_SIZE = Math.pow(2, 31) - 1;

uiRoutes
.when('/management/kibana/log_group/edit_group', {
  template: template
});
uiModules.get('apps/management')
.directive('kbnManagementEditGroup', function (kbnIndex, Notifier, Private, kbnUrl, Promise,locals) {
  return {
    restrict: 'E',
    require: '^kbnManagementGroup', // must inherit from the kbnManagementGroup
    controller: function ($scope, $injector, $q, AppState, es ,$timeout,
      $translate, $translatePartialLoader,arSafeModalMult,$location,$http,timefilter,as) {
      $scope.lang = $translate.use();


      //提示
      const notify = new Notifier({
        location: '日志分组'
      });

      //跳转页面
      $scope.jump = function (url) {
        $location.path(url);
      };



      //获取本地存储的信息
      let logNodeDate = locals.getObject('logNodeDateEdit', '');
      $scope.logNodeDate = logNodeDate;
      $scope.newOrUp = logNodeDate.newOrUp || 0;


      $scope.seletedNode = logNodeDate.seletedNode;//当前选中的节点属性
      $scope.inheritFilters = logNodeDate.inheritFilters;//继承定义
      $scope.currentFilters = logNodeDate.currentFilters;//自己的定义
      $scope.activeItemScope = logNodeDate.activeItemScope;//被选中的节点

      $scope.groupName = $scope.seletedNode.groupName;//名称
      //分组层级数组
      $scope.groupingLevel = $scope.seletedNode.parentGroupId === '' ? 'Rootgroup' : 'Subgroup';

      $scope.groupingLevelTitle = $scope.seletedNode.parentGroupId === '' ? '根分组' : '子分组';

      $scope.description = $scope.seletedNode.description;//备注

      let groupId = $scope.groupId = logNodeDate.seletedNode.groupId;
      let allLogId = logNodeDate.allLogNode.groupId;
      let parentId = $scope.seletedNode.parentId || $scope.seletedNode.parentGroupId;



      //新建节点所需要的参数
      //

      $scope.filters = {
        'type':$scope.currentFilters.type,
        'tags': $scope.currentFilters.tags,
        'host': $scope.currentFilters.host,
        'advance': $scope.currentFilters.advance || ''
      };

      $scope.type = !$scope.currentFilters.type.length ? '' : $scope.currentFilters.type[$scope.currentFilters.type.length - 1].value;
      $scope.tags = !$scope.currentFilters.tags.length ? '' : $scope.currentFilters.tags[$scope.currentFilters.tags.length - 1].value;
      $scope.host = !$scope.currentFilters.host.length ? '' : $scope.currentFilters.host[$scope.currentFilters.host.length - 1].value;



      //当前编辑的节点
      $scope.typeOrAnd = 'or';
      $scope.tagOrAnd = 'or';
      $scope.hostOrAnd = 'or';

      //and/or/type/tags.host下拉框
      $scope.currentNode = {
        'pathInfo':'',
        'typeOrAnds':[{
          'id': 'or', 'value':'or'
        }, {
          'id': 'and', 'value':'and'
        }],
        'tagOrAnds':[{
          'id': 'or', 'value':'or'
        }, {
          'id': 'and', 'value':'and'
        }],
        'hostOrAnds':[{
          'id': 'or', 'value':'or'
        }, {
          'id': 'and', 'value':'and'
        }],
        'filters': {
          'type':[],
          'tags': [],
          'host': [],
          'advance': $scope.currentFilters.advance || ''
        }


      };
      $scope.typeAll = [{type: 0, negative: 0, value: '*'}];



      //获取从根节点到当前日志分组的路径信息
      let getPathInfo = function (id,node) {
        let pathInfo = '';
        $http.get(`/manager/loggroup/${id}/paths`).success(function (res, status) {
          if (status === 200) {
            res.map((obj,i) => {
              if (i === 0) {
                pathInfo = obj.groupName;
              } else if (i < res.length - 1) {
                pathInfo = pathInfo + '->' + obj.groupName;
              }

            });
            node.pathInfo = pathInfo;
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }


        }).error(function (res) {
          notify.error($translate.instant(res));
        });

      };




      if ($scope.seletedNode.parentId !== '') {

        getPathInfo(groupId,$scope.currentNode);

      }

      //获取元字段的值信息
      let getMetafield = function (id) {
        $http.get(`/manager/loggroup/${id}/metafield/values`).success(function (res,status) {
          if (status === 200) {
            if ($scope.groupingLevel === 'Subgroup') {
              $scope.groupMetafield = res;
            } else {
              $scope.allLogMetafield = res;
            }

            $scope.currentNode.filters = res;
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }

        }).error(function (res) {
          notify.error($translate.instant(res));
        });
      };
      if (parentId === '') {
        getMetafield(allLogId);
      } else {
        getMetafield(parentId);
      }





      //or /and 下拉框的变化
      $scope.typeOrAndChange = function (value, type) {
        if (type === 'type') {
          $scope.typeOrAnd = value;
        } else if (type === 'tags') {
          $scope.tagOrAnd = value;
        } else if (type === 'host') {
          $scope.hostOrAnd = value;
        }
      };
      //type,host,tag 下拉框的变化
      $scope.typeChange = function (value, type) {
        $scope[type] = value;
        let has = comFun.hasProThis($scope.filters[type],value);
        if ($scope.filters[type].length < 1) {
          if (!has) {

            $scope.filters[type].push({'type': 0, 'value': value, 'negative': 0});
          }

        } else {

          if (!has) {
            let typeOrAnd;
            if (type === 'type') {
              typeOrAnd = $scope.typeOrAnd;
            } else if (type === 'tags') {
              typeOrAnd = $scope.tagOrAnd;
            } else if (type === 'host') {
              typeOrAnd = $scope.hostOrAnd;
            }


            if (typeOrAnd === 'and') {
              $scope.filters[type].push({'type': 1});
            } else {
              $scope.filters[type].push({'type': 2});
            }

            $scope.filters[type].push({'type': 0, 'value': value, 'negative': 0});
          }


        }

      };





      //分组定义数组
      $scope.definTab = 'Conventional';//常规
      $scope.definTabTitle = '常规';//常规
      if ($scope.filters.advance.length > 0) {
        $scope.definTab = 'High';//高级
        $scope.definTabTitle = '高级';//高级
      }
      $scope.groupingDefinitions = [{
        'id':'Conventional',
        'title':'常规'
      }, {
        'id':'High',
        'title':'高级'
      }];
      //分组定义，常规。高级的切换
      $scope.changeDefinTab = function (fieldType) {
        $scope.definTab = fieldType.id;
        $scope.definTabTitle = fieldType.title;//常规
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

      $scope.columns = [
        { title: '字段名称', sortable: false  },
        { title: '字段类型' , sortable: false }
        //{ title: '映射' , sortable: false }
      ];


      $scope.fieldsRows = [];


      //获取可选字段
      let getFields = function (id) {
        let date = {
          'parentGroupId':parentId,
          'filters':$scope.filters
        };
        $scope.fieldsRows = [];
        $http.post('/manager/loggroup/fields/preview',date).success(function (res, status) {
          if (status === 200) {
            $scope.optionalFields = res;
            if ($scope.groupingLevel === 'Subgroup') {
              $scope.groupOptionalFields = res;
            } else {
              $scope.allLogOptionalFields = res;
            }

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
      $scope.getFields = getFields;

      //事件、可选字段的切换
      $scope.changeTab = function (fieldType) {
        $scope.tab = fieldType.id;
        if ($scope.tab === 'Optional fields' && !$scope.optionalFields) {
          getFields();

        }
      };





      //删除标签
      $scope.removeLabel = function (index,type) {
        if (index === 0) {
          $scope.filters[type].splice(index,2);
        } else {
          $scope.filters[type].splice(index - 1, 2);
        }
        let len = $scope.filters[type].length;
        $scope[type] = $scope.filters[type][len - 1].value;

      };

      //切换and/or
      $scope.reverse = function (index,type) {
        if ($scope.filters[type][index].type === 1) {
          $scope.filters[type][index].type = 2;//type对象类型,0: 字段对象,1: AND对象, 2: OR对象
        } else if ($scope.filters[type][index].type  === 2) {
          $scope.filters[type][index].type = 1;//type对象类型,0: 字段对象,1: AND对象, 2: OR对象
        }

      };
      //not反转标志
      $scope.invertLabel = function (index,type) {
        if ($scope.filters[type][index].negative === 0) {
          $scope.filters[type][index].negative = 1;//negative反转标志，0: 正选，1：反选
        } else if ($scope.filters[type][index].negative === 1) {
          $scope.filters[type][index].negative = 0;//negative反转标志，0: 正选，1：反选
        }

      };

      $scope.labelsMethod = {
        removeLabel: $scope.removeLabel,
        reverse: $scope.reverse,
        invertLabel: $scope.invertLabel
      };


      //取消按钮
      $scope.goBack = function () {
        $scope.jump('/management/kibana/log_group');
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
        let body = comFun.getSubmit($scope.filters,$scope.filtersText,
          $scope.groupId,$scope.gte,$scope.lte,$scope.query);
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

            $scope.discover.settingConf.totalItems = $scope.all.length;
            getDiscoverSetting();
            $timeout(function () {
              getDiscoverSetting();
            });


          }

        });
      };

      $scope.getView = getView;


      //预览按钮
      $scope.goViewClick = false;//预览内容默认不可见
      // $scope.goView = function () {
      //   $scope.goViewClick = true;
      //   getView();
      // };

      //时间过滤器
      //timefilter.enabled = true;
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


      //保存按钮
      $scope.goSave = function () {
        if (!$scope.groupName || $scope.groupName === '') {
          notify.error('分组名称不能为空');
          return;
        }

        if ($scope.definTab === 'Conventional') {
          $scope.filters.advance = '';
        } else {
          $scope.filters.type = [];
          $scope.filters.tags = [];
          $scope.filters.host = [];
        }




        let date = {
          'groupName': $scope.groupName,
          'parentGroupId': parentId,
          'filters': $scope.filters,
          'description': $scope.description
        };
        $http.put(`/manager/loggroup/${groupId}`, date).success(function (res,status) {

          if (status === 200) {
            let childNode = {
              id:groupId,
              groupingLevel: $scope.groupingLevel,//是添加根分组还是子分组

            };

            //window.localStorage.setItem('childNode',JSON.stringify(childNode));
            locals.setObject('childNode',childNode);
            $scope.jump('/management/kibana/log_group');
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }


        }).error(function (res) {
          notify.error($translate.instant(res));
        });

      	//$scope.jump('/management/kibana/log_group');
      };

      $scope.$watch('groupName',function () {
        let bCount = comFun.bytesCount($scope.groupName);
        if (bCount > 128) {
          $scope.groupNameError = true;
        } else {
          $scope.groupNameError = false;
        }
      });



    }
  };
});