/**
 * @name es
 *
 * @description This is the result of calling esFactory. esFactory is exposed by the
 * elasticsearch.angular.js client.
 */

import _ from 'lodash';
import uiModules from 'ui/modules';
uiModules
  .get('kibana')

  .service('fieldStats', function () {

    // let stats = {
    //   '_shards': {
    //     'total': 321,
    //     'successful': 321,
    //     'failed': 0
    //   },
    //   'indices': {
    //     'logstash-*': {
    //       'fields': {
    //         '@timestamp': {
    //           'type': 'date',
    //           'max_doc': 307,
    //           'doc_count': 307,
    //           'density': 100,
    //           'sum_doc_freq': -1,
    //           'sum_total_term_freq': 307,
    //           'searchable': true,
    //           'aggregatable': true,
    //           'min_value': 1492473601216,
    //           'min_value_as_string': '2017-04-18T00:00:01.216Z',
    //           'max_value': 1492486854437,
    //           'max_value_as_string': '2017-04-18T03:40:54.437Z'
    //         }
    //       }
    //     }
    //   }
    // };
    let fieldStats = function (pattern) {
      let stats = {
        '_shards': {
          'total': 321,
          'successful': 321,
          'failed': 0
        },
        'indices': {}
      };
      stats.indices[pattern] = {
        'fields': {
          '@timestamp': {
            'type': 'date',
            'max_doc': 307,
            'doc_count': 307,
            'density': 100,
            'sum_doc_freq': -1,
            'sum_total_term_freq': 307,
            'searchable': true,
            'aggregatable': true,
            'min_value': 1492473601216,
            'min_value_as_string': '2017-04-18T00:00:01.216Z',
            'max_value': 1492486854437,
            'max_value_as_string': '2017-04-18T03:40:54.437Z'
          }
        }
      };
      return new Promise(function (resolve, reject) { //做一些异步操作
        resolve(stats);

      });
    };
    return fieldStats;
  });
