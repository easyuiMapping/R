/**
 * by luo.chunxiang@eisoo.com-2016-10-26
 */

define(function (require) {

  require('ui/modules')
    .get('kibana')
    .directive('arContentedit', function () {
      return {
        restrict: 'A', // 只用于属性
        require: '?ngModel', // get a hold of NgModelController
        link: function (scope, element, attrs, ngModel) {
          if (!ngModel) {
            return;
          }
          // Specify how UI should be updated
          ngModel.$render = function () {
            element.text(ngModel.$viewValue || '');
          };
          // Listen for change events to enable binding
          element.on('blur keyup change', function () {
            scope.$apply(readViewText);
          });
          // No need to initialize, AngularJS will initialize the text based on ng-model attribute
          // Write data to the model
          function readViewText() {
            var html = element.text();
            // When we clear the content editable the browser leaves a <br> behind
            // If strip-br attribute is provided then we strip this out
            if (attrs.stripBr && html === '<br>') {
              html = '';
            }
            ngModel.$setViewValue(html);
          }
        }
      };
    });
});


