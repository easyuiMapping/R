define(function (require) {
  require('ui/anyrobot_ui/data_sidebar/data_sidebar.less');

  var _ = require('lodash');
  var $ = require('jquery');

  require('ui/modules')
    .get('kibana')
    .directive('dataside', function () {

      // simply a list of all of all of angulars .col-md-* classes except 12
      var listOfWidthClasses = _.times(12, function (i) {
        return 'col-md-' + i;
      });

      return {
        restrict: 'C',
        link: function ($scope, $elem) {
          var $collapser = $('<div class="sidebar-collapser"><div class="chevron-cont"></div></div>');
          var $siblings = $elem.siblings();
          var $siblingsSection = $siblings.find('.panel-tcpudp');
          var $siblingsBtnSetting = $siblings.find('.btn-setting');
          var siblingsClass = listOfWidthClasses.reduce(function (prev, className) {

            if (prev) return prev;
            return $siblings.hasClass(className) && className;
          }, false);

          $siblings.addClass(' col-md-9');

          $collapser.on('click', function () {
            $elem.toggleClass('closed');
            // if there is are only two elements we can assume the other one will take 100% of the width
            if ($siblings.length === 1) {
              $siblings.toggleClass(' col-md-9');
              $siblingsSection.toggleClass(' con-pading');
              $siblingsSection.toggleClass(' side-bar-show');
              // $siblingsBtnSetting.toggleClass(' container');
              $siblingsBtnSetting.toggleClass(' marLeft');
            }
          })

            .appendTo($elem);
        }
      };
    });
});
