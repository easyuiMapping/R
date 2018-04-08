import management from 'ui/management';
import 'plugins/kibana/management/sections/log_group/group';
import 'ace';
import 'ui/directives/confirm_click';
import uiModules from 'ui/modules';

// add the module deps to this module
uiModules.get('apps/management');

management.getSection('kibana').register('log_group', {
  display: 'Log Group',
  order: 30,
  url: '#/management/kibana/log_group'
});
