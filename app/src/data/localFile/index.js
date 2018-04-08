define(function (require) {
  const _ = require('lodash');

  require('ui/routes')
  .when('/data/localFile', {
    template: require('plugins/kibana/data/localFile/template.html')
  });

  return {
    name: 'localFile',
    display: 'localFile',
    url: '#/data/localFile'
  };
});
