import _ from 'lodash';
import template from 'ui/ar_tree/ar_tree.html';
import 'ui/ar_tree/ar_tree.less';
import moment from 'moment';
import angular from 'angular';
import $ from 'jquery';
import comFun from 'plugins/kibana/management/sections/log_group/components/com_fun.js';
import uiModules from 'ui/modules';
let module = uiModules.get('kibana');


module.directive('arTree', function (Private, Promise, getAppState,locals,$http,Notifier,$translate) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      labels:'=',
      treeId:'=',
      type:'@',
      method:'='
    },
    link: function ($scope, $el, attrs) {

      const notify = new Notifier({ location: '日志分组' });
       //获取本地存储的信息
      let childNode = locals.getObject($scope.treeId, '');


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
          onClick: $scope.method.treeClick,
          onExpand:function (event,treeId, treeNode) {
            $scope.treeNode = treeNode;
            let treeObj = $.fn.zTree.getZTreeObj($scope.treeId);
            let id = treeNode.groupId;
            let node = treeObj.getNodeByParam('groupId', id);

            if (comFun.arrHasValue($scope.idAndChildren,id)) {return;}
            let hasChildren = treeNode.hasChildren;

            if (hasChildren) {
              //获取日志分组子分组信息
              $http.get(`/manager/loggroup/${id}/children?simpleInfo=1`).success(function (res,status) {
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
          }
        }

      };

      $scope.idAndChildren = [];



      $scope.zNodes = [];
      let zTreeInit = function () {
        let element = $(`#${$scope.treeId}`);
        $.fn.zTree.init(element, setting, $scope.zNodes);
      };

      //添加子节点
      $scope.addChildren = function (treeNode,newNodes) {
        let treeObj = $.fn.zTree.getZTreeObj($scope.treeId);
        treeObj.addNodes(treeNode, newNodes);
      };

      //选择某个节点
      let seletedTheNode = function (id) {
        let treeObj = $.fn.zTree.getZTreeObj($scope.treeId);
        let node;
        if (id) {

          node = treeObj.getNodeByParam('groupId', id);
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

        //$scope.storageNodeIime();

      };


      $scope.seletedTheNode = seletedTheNode;

      //存储当前节点，刷新是展示
      $scope.storageNodeIime = function () {
        let childNode = {
          id:$scope.seletedNode.groupId,
          name:$scope.seletedNode.name
        };

        locals.setObject($scope.treeId,childNode);
      };

      //初始加载树
      $scope.init = function () {
        $scope.getTreeList();
      };

      //  获取根节点
      $scope.getTreeList = function () {
        $http.get('/manager/loggroup/roots?simpleInfo=1').success(function (res,status) {
          if (status === 200) {
            $scope.zNodes = comFun.nodeChange(res);
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
              $http.get(`/manager/loggroup/${id}/children?simpleInfo=1`).success(function (res, status) {
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


      $scope.getTreeListFromChildToRoot = function () {

        //获取所有根日志分组

        $http.get('/manager/loggroup/roots?simpleInfo=1').success(function (res,status) {
          if (status === 200) {
            $scope.zNodes = comFun.nodeChange(res);
            zTreeInit();

            //所有日志节点
            $scope.allLogNode = res[0];

            //获取从根节点到当前日志分组的路径信息

            $http.get(`/manager/loggroup/${childNode.id}/paths`).success(function (res,status) {
              if (status === 200) {
                $scope.parentsList = res;
                let treeObj = $.fn.zTree.getZTreeObj($scope.treeId);


                getchildrenList($scope.parentsList).then(res=>{
                  let childrenList = res;
                  $scope.parentsList.map((obj,i)=>{
                    let hasChildren = $scope.parentsList[i].hasChildren;
                    if (hasChildren) {
                      //添加日志分组子分组信息
                      let id = $scope.parentsList[i].groupId;
                      let treeNode = treeObj.getNodeByParam('groupId', obj.groupId);
                      $scope.addChildren(treeNode,childrenList[i]);
                      $scope.idAndChildren.push({id:id,children:childrenList[i]});
                    }
                  });
                });
              } else {
                notify.error($translate.instant(`${res.code}group`));
              }


              //获取当前日志分组信息
              $http.get(`/manager/loggroup/${childNode.id}?simpleInfo=1`).success(function (res,status) {
                if (status === 200) {
                  let node = [];
                  node.push(res);
                  comFun.nodeChange(node);
                  $scope.seletedNode = node[0];
                  //$scope.getCurrentFiltersAndInheritFilters();
                  seletedTheNode(node[0].groupId);
                } else {
                  notify.error($translate.instant(`${res.code}group`));
                }

              });

              $scope.groupingLevel = childNode.groupingLevel;

            });
          } else {
            notify.error($translate.instant(`${res.code}group`));
          }

        });


      };

      if (childNode.id) {
        $scope.reInit();//刷新或添加子分组后加载子分组到根分组并展开
      } else {
        $scope.init();//初次加载
      }




    }
  };
});
