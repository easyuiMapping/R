import { saveAs } from '@spalger/filesaver';
import { extend, find, flattenDeep, partialRight, pick, pluck, sortBy } from 'lodash';
import angular from 'angular';
import registry from 'plugins/kibana/management/saved_object_registry';
import template from 'plugins/kibana/management/sections/log_group/new_group.html';
import 'ui/directives/file_upload';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import __ from 'plugins/kibana/management/sections/log_group/components/locale.js';
import comFun from 'plugins/kibana/management/sections/log_group/components/com_fun.js';


const MAX_SIZE = Math.pow(2, 31) - 1;

uiRoutes
.when('/management/kibana/log_group/new_group', {
  template: template
});
uiModules.get('apps/management')
.directive('kbnManagementNewGroup', function (kbnIndex, Notifier, Private, kbnUrl, Promise,locals) {
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

      //let logNodeDate = JSON.parse(window.localStorage.getItem('logNodeDate'));
      let logNodeDate = locals.getObject('logNodeDateNew', '');
      $scope.logNodeDate = logNodeDate;
      $scope.newOrUp = logNodeDate.newOrUp || 0;

      $scope.inheritFilters = logNodeDate.inheritFilters;//继承定义
      $scope.currentFilters = logNodeDate.currentFilters;//自己的定义

      // console.log(logNodeDate);


      let groupId = logNodeDate.groupId;
      let allLogId = logNodeDate.allLogId;


      let type = [];
      let host = [];
      let tags = [];

      let getCombiningArrays = function (type) {
        let arr = [];
        if (!$scope.inheritFilters) {return;}
        if ($scope.inheritFilters[type]) {
          if ($scope.inheritFilters[type].length !== 0 && $scope.currentFilters[type].length !== 0) {
            arr = $scope.inheritFilters[type].concat([{value:'and',negative:0}],$scope.currentFilters[type]);
          } else if ($scope.inheritFilters[type].length === 0 && $scope.currentFilters[type].length === 0) {
            arr = [];
          } else {
            arr = $scope.inheritFilters[type].length === 0 ? $scope.currentFilters[type] : $scope.inheritFilters[type];
          }
        }

        return arr;
      };

      let getAdvance = function (type) {
        let arr = [];
        if (!$scope.inheritFilters) {return;}
        if (!$scope.inheritFilters[type]) {return;}
        if ($scope.inheritFilters[type] !== []) {
          arr = $scope.inheritFilters[type];
        };
        if ($scope.currentFilters[type] !== '') {
          arr.push($scope.currentFilters[type]);
        }
        return arr;
      };


      $scope.currentInheritFilters = {
        type: getCombiningArrays('type'),
        host: getCombiningArrays('host'),
        tags: getCombiningArrays('tags'),
        advance: getAdvance('advance')
      };


     //console.log( $scope.currentInheritFilters);


      //新建节点所需要的参数
      //
      $scope.groupName = '';
      $scope.filters = {
        'host': [],
        'type': [],
        'tags': [],
        'advance': ''
      };
      $scope.parentGroupId = '';
      $scope.description = '';

      //当前编辑的节点
      $scope.typeOrAnd = 'or';
      $scope.tagOrAnd = 'or';
      $scope.hostOrAnd = 'or';

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
          'advance': ''
        },
        'type':[],
        'tags': [],
        'host': []

      };
      $scope.typeAll = [{type: 0, negative: 0, value: '*'}];



      //获取从根节点到当前日志分组的路径信息
      let getPathInfo = function (id,node) {
        let pathInfo = '';
        $http.get(`/manager/loggroup/${id}/paths`).success(function (res,status) {
          if (status === 200) {
            res.map((obj,i) => {
              if (i === 0) {
                pathInfo = obj.groupName;
              } else {
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



      //分组层级数组
      $scope.groupingLevel = 'Rootgroup';//当选中的节点为所有日志时，默认为根分组
      $scope.groupingLevels = [{
        'id':'Rootgroup',
        'title':__.Rootgroup
      }];

      $scope.parentGroupId = allLogId;//默认为根分组时为空

      if (allLogId !== groupId) {
        $scope.groupingLevels.push({
          'id':'Subgroup',
          'title': __.Subgroup
        });
        $scope.groupingLevel = 'Subgroup';//当选中的节点为非所有日志时，默认为子分组

        $scope.parentGroupId = groupId;

        getPathInfo(groupId,$scope.currentNode);

      }


      //获取所有日志的元字段的值信息
      let getMetafield = function (id) {
        $http.get(`/manager/loggroup/${id}/metafield/values`).success(function (res, status) {
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
      getMetafield($scope.parentGroupId);


      //子分组和跟分组的切换
      $scope.groupingLevelChange = function (groupingLevel) {
        $scope.groupingLevel = groupingLevel;
        $scope.parentGroupId = groupingLevel === 'Subgroup' ? groupId : allLogId;
        if (!$scope.groupMetafield || !$scope.allLogMetafield) {
          getMetafield($scope.parentGroupId);
        } else {
          $scope.currentNode.filters = groupingLevel === 'Subgroup' ? $scope.groupMetafield : $scope.allLogMetafield;
        }
      };




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
        let has = comFun.hasProThis($scope.currentNode[type],value);
        if ($scope.currentNode[type].length < 1) {
          if (!has) {
            $scope.currentNode[type].push({'type': 0,value:value,negative:0});
            $scope.filters[type].push({'type': 0, 'value': value, 'negative': 0});
          }

        } else {
          //let firstType = $scope.currentNode.type[0];
          if (!has) {
            let typeOrAnd;
            if (type === 'type') {
              typeOrAnd = $scope.typeOrAnd;
            } else if (type === 'tags') {
              typeOrAnd = $scope.tagOrAnd;
            } else if (type === 'host') {
              typeOrAnd = $scope.hostOrAnd;
            }
            // $scope.currentNode[type].push({value:typeOrAnd,negative:0});
            // $scope.currentNode[type].push({value:value,negative:0});

            if (typeOrAnd === 'and') {
              $scope.filters[type].push({'type': 1});
              $scope.currentNode[type].push({'type': 1});
            } else {
              $scope.filters[type].push({'type': 2});
              $scope.currentNode[type].push({'type': 2});
            }

            $scope.filters[type].push({'type': 0, 'value': value, 'negative': 0});
            $scope.currentNode[type].push({'type': 0, 'value': value, 'negative': 0});
          }


        }

      };





      //分组定义数组
      $scope.definTab = 'Conventional';//常规
      $scope.definTabTitle = '常规';//常规
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
      let getFields = function () {
        let date = {
          'parentGroupId': $scope.parentGroupId,
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
          if (!$scope.groupMetafield || !$scope.allLogMetafield) {
            getFields();
          } else {
            $scope.optionalFields = $scope.groupingLevel === 'Subgroup' ? $scope.groupOptionalFields : $scope.allLogOptionalFields;
          }

        }
        $scope.getDiscoverSetting();
      };





      //删除标签
      $scope.removeLabel = function (index,type) {
        if (index === 0) {
          $scope.currentNode[type].splice(index, 2);
          $scope.filters[type].splice(index,2);
        } else {
          $scope.currentNode[type].splice(index - 1, 2);
          $scope.filters[type].splice(index - 1, 2);
        }
        let len = $scope.filters[type].length;
        $scope[type] = $scope.filters[type][len - 1].value;

      };

      //切换and/or
      $scope.reverse = function (index,type) {
        if ($scope.currentNode[type][index].type === 1) {
          $scope.currentNode[type][index].type  = 2;
          $scope.filters[type][index].type = 2;//type对象类型,0: 字段对象,1: AND对象, 2: OR对象
        } else if ($scope.currentNode[type][index].type  === 2) {
          $scope.currentNode[type][index].type  = 1;
          $scope.filters[type][index].type = 1;//type对象类型,0: 字段对象,1: AND对象, 2: OR对象
        }

      };
      //not反转标志
      $scope.invertLabel = function (index,type) {
        if ($scope.currentNode[type][index].negative === 0) {
          $scope.currentNode[type][index].negative = 1;
          $scope.filters[type][index].negative = 1;//negative反转标志，0: 正选，1：反选
        } else if ($scope.currentNode[type][index].negative === 1) {
          $scope.currentNode[type][index].negative = 0;
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
        $scope.query = $scope.query === '' ? '*' : $scope.query;
        let body = comFun.getSubmit($scope.filters,$scope.filtersText,
          $scope.parentGroupId,$scope.gte,$scope.lte,$scope.query);
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

        let parentGroupId = $scope.groupingLevel === 'Subgroup' ? groupId : '';

        if ($scope.definTab === 'Conventional') {
          $scope.filters.advance = '';
        } else {
          $scope.filters.type = [];
          $scope.filters.tags = [];
          $scope.filters.host = [];
        }

        let date = {
          'groupName': $scope.groupName,
          'parentGroupId': parentGroupId,
          'filters': $scope.filters,
          'description': $scope.description
        };
        $http.post('/manager/loggroup', date).success(function (res,status) {
          if (status === 200) {
            let childNode = {
              id:res.groupId,
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