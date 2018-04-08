import _ from 'lodash';
import angular from 'angular';
import $ from 'jquery';
/* eslint no-console: 0 */

// simply a pointer to the global notif list
let SafeModal = {
  'flag': false,
  'msg': 'Are you sure you want to overwrite this?',
  'title': '提示',
  'ok':false,
  'check':false,
  'cel':function () {}
};
export default SafeModal;
