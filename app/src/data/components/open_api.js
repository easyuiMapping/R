define(function (require) {
  const _ = require('lodash');
  //用Promise对象实现的Ajax操作的例子。
  class EltMan {
    //get
    getEtlMan(url) {
      var promise = new Promise(function (resolve, reject) {
        var client = new XMLHttpRequest();
        client.open('GET', url);
        client.onreadystatechange = handler;
        client.responseType = 'json';
        client.setRequestHeader('Accept', 'application/json');
        client.send();

        function handler() {
          if (this.readyState !== 4) {
            return;
          }
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(this.statusText));
          }
        };
      });

      return promise;
    };

    //post
    postEtlMan(url,data) {
      var promise = new Promise(function (resolve, reject) {
        var client = new XMLHttpRequest();
        client.open('POST', url);
        client.onreadystatechange = handler;
        client.responseType = 'json';
        client.setRequestHeader('Accept', 'application/json');
        client.send(data);

        function handler() {
          if (this.readyState !== 4) {
            return;
          }
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(this.statusText));
          }
        };
      });

      return promise;
    };

    //PUT
    postEtlMan(url,data) {
      var promise = new Promise(function (resolve, reject) {
        var client = new XMLHttpRequest();
        client.open('PUT', url);
        client.onreadystatechange = handler;
        client.responseType = 'json';
        client.setRequestHeader('Accept', 'application/json');
        client.send(data);

        function handler() {
          if (this.readyState !== 4) {
            return;
          }
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(this.statusText));
          }
        };
      });

      return promise;
    };


    //DELETE
    postEtlMan(url) {
      var promise = new Promise(function (resolve, reject) {
        var client = new XMLHttpRequest();
        client.open('DELETE', url);
        client.onreadystatechange = handler;
        client.responseType = 'json';
        client.setRequestHeader('Accept', 'application/json');
        client.send();

        function handler() {
          if (this.readyState !== 4) {
            return;
          }
          if (this.status === 200) {
            resolve(this.response);
          } else {
            reject(new Error(this.statusText));
          }
        };
      });

      return promise;
    };




  }

  return {
    eltMan: new EltMan()
  };
});

