define(function (require) {
  // each of these private modules returns an object defining that section, their properties
  // are used to create the nav bar
  return [
    require('plugins/kibana/data/tcpUdp/index'),
    require('plugins/kibana/data/agentUpload/index')
    //require('plugins/kibana/data/localFile/index')
  ];
});
//import 'plugins/kibana/data/tcpUdp/index';
