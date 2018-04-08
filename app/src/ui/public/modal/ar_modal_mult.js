//luo.chunxiang
//2017/3/22
import html from 'ui/directives/modal/ar_modal.html';
import uiModules from 'ui/modules';
import 'ui/directives/modal/style.css';
import 'ui/ar_safe_modal';

uiModules
  .get('kibana')
  .directive('arModalMult', function ($modal,$translate,safeModal) {
    return {
      restrict: 'E',
      scope: {
        modalObj: '=',
        ok: '&',
      },
      controller: function ($scope,$translate, $translatePartialLoader) {
        $translatePartialLoader.addPart('../plugins/kibana');
        $translate.refresh();
      },
      link: function (scope, element, attrs) {
        scope.ok = attrs.ok ? scope.ok : null;
        scope.msg = attrs.confirmMsg ? attrs.confirmMsg : null;
        scope.title = attrs.arTitle ? attrs.arTitle : null;
        scope.check = attrs.check ? attrs.check : null;
        element.bind('click', function () {
          //ConfirmService.open(attrs.confirm);
          var modalConfirmInstance = $modal.open({
            template: html,
            controller:['$scope','$modalInstance', function ($scope,$modalConfirmInstance) {
              //get obj from parent Controller
              $scope.modalObj = scope.modalObj || {};
              $scope.title = scope.title || $scope.modalObj.title || safeModal && safeModal.title;//头部
              $scope.msg = scope.msg || $scope.modalObj.msg || safeModal && safeModal.msg;//body信息
              $scope.ok = scope.ok || $scope.modalObj.ok || safeModal && safeModal.ok;
              $scope.cel = scope.cel || $scope.modalObj.cel || safeModal && safeModal.cel;
              $scope.check = scope.check || $scope.modalObj.check || safeModal && safeModal.check;

              $scope.formData = false;

              $scope.updateSelection = function (event,formData) {
                $scope.formData = formData;
              };


              //$scope 是此控制器作用域对象 ，而 scope是继承了父作用域对象从而创建一个新的作用于对象，可以访问父类中的方法和属性
              $scope.confirm = function () {
                $scope.ok($scope.formData);   //run the parent controller method
                $modalConfirmInstance.close(true);
              };
              $scope.cancel = function () {
                $scope.cel($scope.formData);
                $modalConfirmInstance.dismiss('cancel');
              };
            }],
            windowClass: 'confirmModal',// 自定义modal上级div的class
            size : 'sm', //大小配置
          });
          return modalConfirmInstance;
        });


      }
    };
  });
