//luo.chunxiang
//2017.3.23
import uiModules from 'ui/modules';
import SafeModal from 'ui/ar_safe_modal/safeModal';
import $ from 'jquery';
import html from 'ui/directives/modal/ar_modal.html';
import 'ui/directives/modal/style.css';
//let rootSafeModal = new SafeModal();
uiModules.get('kibana')
.factory('safeModal', function () {
  return SafeModal;

})
.factory('arSafeModalYes', function ($window, $timeout, $q,safeModal) {
  return function arSafeModalYes(message) {
    return $timeout(function () {
      //return safeModal.flag || $q.reject(false);
      return true;
    });
  };
})
.factory('arSafeModalNo', function ($window, $timeout, $q,safeModal) {
  return function arSafeModalNo(message) {
    return $timeout(function () {
      //return safeModal.flag || $q.reject(false);
      return $q.reject(false);
    });
  };
})

.factory('arSafeModal', function ($window, $timeout, $q,safeModal) {

  return function arSafeModa(ok,msg,check,title) {
    $timeout(function () {
      var $v = $('#safeMe');
      safeModal.ok = ok;
      if (msg) {
        safeModal.msg = msg;
      }
      if (check !== undefined || check !== null) {
        safeModal.check = check;
      }
      if (title) {
        safeModal.title = title;
      }
      $v.click();
    });
  };
})
.service('arSafeModalMult', function ($window, $timeout, $q,safeModal) {
  let flag = 0;
  let show = true;
  let arSafeModalMult = function (ok,msg,check,cel,title) {

    var $v = $('#safeMeMult');
    safeModal.ok = ok;
    safeModal.cel = cel;
    if (msg) {
      safeModal.msg = msg;
    }
    if (check !== undefined || check !== null) {
      safeModal.check = check;
    }
    if (title) {
      safeModal.title = title;
    }
    $v.click();

  };
  return arSafeModalMult;

})
;
